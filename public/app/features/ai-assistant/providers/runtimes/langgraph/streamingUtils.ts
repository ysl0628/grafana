import { v4 as uuidv4 } from 'uuid';
import { LangGraphMessageAccumulator } from './LangGraphMessageAccumulator';
import type {
  LangChainMessageChunk,
  LangChainMessageTupleEvent,
  LangGraphSendMessageConfig,
  LangGraphStreamCallback,
  OnCustomEventCallback,
  OnErrorEventCallback,
  OnInfoEventCallback,
  OnMetadataEventCallback,
  LangGraphInterruptState,
} from './types';

export interface StreamingHandlers<TMessage> {
  setMessages: (messages: TMessage[]) => void;
  setInterrupt: (interrupt: LangGraphInterruptState | undefined) => void;
  eventHandlers?: {
    onMetadata?: OnMetadataEventCallback;
    onInfo?: OnInfoEventCallback;
    onError?: OnErrorEventCallback;
    onCustomEvent?: OnCustomEventCallback;
  };
}

export interface StreamingOptions<TMessage> {
  initialMessages: TMessage[];
  appendMessage: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  abortControllerRef?: React.MutableRefObject<AbortController | null>;
  preAddMessages?: boolean; // 是否在 streaming 前先添加訊息到 accumulator
}

const isLangChainMessageChunk = (value: unknown): value is LangChainMessageChunk => {
  if (!value || typeof value !== 'object') return false;
  const chunk = value as any;
  return (
    'type' in chunk &&
    (chunk.type === 'AIMessageChunk' || chunk.type === 'tool') &&
    (chunk.content === undefined || typeof chunk.content === 'string' || Array.isArray(chunk.content)) &&
    (chunk.tool_call_chunks === undefined || Array.isArray(chunk.tool_call_chunks))
  );
};

/**
 * 核心 streaming 邏輯 - 被 useLangGraphMessages 和 reload 功能共用
 * @param stream - LangGraph stream callback
 * @param newMessages - 要發送的訊息
 * @param config - 發送配置
 * @param handlers - 事件處理器
 * @param options - streaming 選項
 */
export async function processLangGraphStream<TMessage extends { id?: string }>(
  stream: LangGraphStreamCallback<TMessage>,
  newMessages: TMessage[],
  config: LangGraphSendMessageConfig,
  handlers: StreamingHandlers<TMessage>,
  options: StreamingOptions<TMessage>
) {
  // 確保所有訊息都有 ID
  const newMessagesWithId = newMessages.map((m) => (m.id ? m : { ...m, id: uuidv4() }));

  // 創建 accumulator
  const accumulator = new LangGraphMessageAccumulator({
    initialMessages: options.initialMessages,
    appendMessage: options.appendMessage,
  });

  // 如果需要，先添加新訊息到 accumulator
  if (options.preAddMessages) {
    handlers.setMessages(accumulator.addMessages(newMessagesWithId));
  }

  // 設置 abort controller
  const abortController = new AbortController();
  if (options.abortControllerRef) {
    options.abortControllerRef.current = abortController;
  }

  try {
    const response = await stream(newMessagesWithId, {
      ...config,
      abortSignal: abortController.signal,
    });

    for await (const chunk of response) {
      switch (chunk.event) {
        case 'messages/partial':
        case 'messages/complete':
          handlers.setMessages(accumulator.addMessages(chunk.data));
          break;
        case 'updates':
          handlers.setInterrupt(chunk.data.__interrupt__?.[0]);
          break;
        case 'messages': {
          const [messageChunk] = (chunk as LangChainMessageTupleEvent).data;
          if (!isLangChainMessageChunk(messageChunk)) {
            console.warn('Received invalid message chunk format:', messageChunk);
            break;
          }
          handlers.setMessages(accumulator.addMessages([messageChunk as unknown as TMessage]));
          break;
        }
        case 'metadata':
          handlers.eventHandlers?.onMetadata?.(chunk.data);
          break;
        case 'info':
          handlers.eventHandlers?.onInfo?.(chunk.data);
          break;
        case 'error':
          handlers.eventHandlers?.onError?.(chunk.data);
          break;
        default:
          if (handlers.eventHandlers?.onCustomEvent) {
            handlers.eventHandlers.onCustomEvent(chunk.event, chunk.data);
          } else {
            console.warn('Unhandled event received:', chunk.event, chunk.data);
          }
          break;
      }
    }
  } catch (error) {
    if (abortController.signal.aborted) {
      console.log('Stream was aborted');
      return abortController;
    }

    // Handle specific error types
    if (error instanceof Error) {
      // Check for GraphRecursionError
      if (error.message.includes('GraphRecursionError') || error.message.includes('Recursion limit')) {
        console.error('Graph recursion limit reached:', error.message);
        handlers.eventHandlers?.onError?.({
          error: 'GraphRecursionError',
          message:
            'The AI reached its reasoning limit. Please try simplifying your request or breaking it into smaller parts.',
        });
        return abortController;
      }
    }

    console.error('Error during stream processing:', error);
    handlers.eventHandlers?.onError?.(error);
    throw error;
  } finally {
    // Clean up the abort controller reference
    if (options.abortControllerRef && options.abortControllerRef.current === abortController) {
      options.abortControllerRef.current = null;
    }
  }

  return abortController;
}