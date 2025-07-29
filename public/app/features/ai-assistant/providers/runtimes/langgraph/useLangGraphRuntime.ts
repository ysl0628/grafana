import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LangChainMessage,
  LangChainToolCall,
  OnCustomEventCallback,
  OnErrorEventCallback,
  OnInfoEventCallback,
  OnMetadataEventCallback,
} from './types';
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
  useThread,
  useThreadListItemRuntime,
} from '@assistant-ui/react';
import { convertLangChainMessages } from './convertLangChainMessages';
import {
  type LangGraphCommand,
  type LangGraphInterruptState,
  type LangGraphSendMessageConfig,
  type LangGraphStreamCallback,
  useLangGraphMessages,
} from './useLangGraphMessages';
import type { AttachmentAdapter, ThreadMessage } from '@assistant-ui/react';
import type { AppendMessage } from '@assistant-ui/react';
import type { FeedbackAdapter } from '@assistant-ui/react';
import type { SpeechSynthesisAdapter } from '@assistant-ui/react';
import { appendLangChainChunk } from './appendLangChainChunk';
import useAiAssistant from 'app/features/ai-assistant/hooks/useAiAssistant';
import { useAtSelection } from '../../../contexts/AtSelectionContext';
import { getThreadHistory } from 'app/features/ai-assistant/services/aiAssistantApi';

const getPendingToolCalls = (messages: LangChainMessage[]) => {
  const pendingToolCalls = new Map<string, LangChainToolCall>();
  for (const message of messages) {
    if (message.type === 'ai') {
      for (const toolCall of message.tool_calls ?? []) {
        pendingToolCalls.set(toolCall.id, toolCall);
      }
    }
    if (message.type === 'tool') {
      pendingToolCalls.delete(message.tool_call_id);
    }
  }

  return [...pendingToolCalls.values()];
};

const getMessageContent = (msg: AppendMessage) => {
  const allContent = [...msg.content, ...(msg.attachments?.flatMap((a) => a.content) ?? [])];
  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case 'text':
        return { type: 'text' as const, text: part.text };
      case 'image':
        return { type: 'image_url' as const, image_url: { url: part.image } };

      case 'tool-call':
        throw new Error('Tool call appends are not supported.');

      default:
        const _exhaustiveCheck: 'reasoning' | 'source' | 'file' | 'audio' = type;
        throw new Error(`Unsupported append message part type: ${_exhaustiveCheck}`);
    }
  });

  if (content.length === 1 && content[0]?.type === 'text') {
    return content[0].text ?? '';
  }

  return content;
};

const symbolLangGraphRuntimeExtras = Symbol('langgraph-runtime-extras');
type LangGraphRuntimeExtras = {
  [symbolLangGraphRuntimeExtras]: true;
  send: (messages: LangChainMessage[], config: LangGraphSendMessageConfig) => Promise<void>;
  interrupt: LangGraphInterruptState | undefined;
};

const asLangGraphRuntimeExtras = (extras: unknown): LangGraphRuntimeExtras => {
  if (typeof extras !== 'object' || extras == null || !(symbolLangGraphRuntimeExtras in extras))
    throw new Error('This method can only be called when you are using useLangGraphRuntime');

  return extras as LangGraphRuntimeExtras;
};

export const useLangGraphInterruptState = () => {
  const { interrupt } = useThread((t) => asLangGraphRuntimeExtras(t.extras));
  return interrupt;
};

export const useLangGraphSend = () => {
  const { send } = useThread((t) => asLangGraphRuntimeExtras(t.extras));
  return send;
};

export const useLangGraphSendCommand = () => {
  const send = useLangGraphSend();
  return (command: LangGraphCommand) => send([], { command });
};

export const useLangGraphRuntime = ({
  autoCancelPendingToolCalls,
  adapters: { attachments, feedback, speech } = {},
  unstable_allowCancellation,
  stream,
  threadId,
  onSwitchToNewThread,
  onSwitchToThread,
  eventHandlers,
}: {
  /**
   * @deprecated For thread management use `useCloudThreadListRuntime` instead. This option will be removed in a future version.
   */
  threadId?: string | undefined;
  autoCancelPendingToolCalls?: boolean | undefined;
  unstable_allowCancellation?: boolean | undefined;
  stream: LangGraphStreamCallback<LangChainMessage>;
  /**
   * @deprecated For thread management use `useCloudThreadListRuntime` instead. This option will be removed in a future version.
   */
  onSwitchToNewThread?: () => Promise<void> | void;
  onSwitchToThread?: (threadId: string) => Promise<{
    messages: LangChainMessage[];
    interrupts?: LangGraphInterruptState[];
  }>;
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
  /**
   * Event handlers for various LangGraph stream events
   */
  eventHandlers?:
    | {
        /**
         * Called when metadata is received from the LangGraph stream
         */
        onMetadata?: OnMetadataEventCallback;
        /**
         * Called when informational messages are received from the LangGraph stream
         */
        onInfo?: OnInfoEventCallback;
        /**
         * Called when errors occur during LangGraph stream processing
         */
        onError?: OnErrorEventCallback;
        /**
         * Called when custom events are received from the LangGraph stream
         */
        onCustomEvent?: OnCustomEventCallback;
      }
    | undefined;
}) => {
  const { interrupt, setInterrupt, messages, sendMessage, cancel, setMessages } = useLangGraphMessages({
    appendMessage: appendLangChainChunk,
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  // 專門用於 reload 的函數，跳過 accumulator 的初始添加
  const sendMessageForReload = useCallback(
    async (newMessages: LangChainMessage[], config: LangGraphSendMessageConfig) => {
      const abortController = new AbortController();
      const response = await stream(newMessages, {
        ...config,
        abortSignal: abortController.signal,
      });

      // 直接處理 streaming，使用正確的初始訊息
      const { LangGraphMessageAccumulator } = await import('./LangGraphMessageAccumulator');
      const accumulator = new LangGraphMessageAccumulator({
        initialMessages: newMessages, // 使用 newMessages 而不是當前的 messages
        appendMessage: appendLangChainChunk,
      });

      try {
        for await (const chunk of response) {
          switch (chunk.event) {
            case 'messages/partial':
            case 'messages/complete':
              setMessages(accumulator.addMessages(chunk.data));
              break;
            case 'messages': {
              const [messageChunk] = chunk.data;
              if (messageChunk && messageChunk.type === 'AIMessageChunk') {
                setMessages(accumulator.addMessages([messageChunk as any]));
              }
              break;
            }
            case 'updates':
              setInterrupt(chunk.data.__interrupt__?.[0]);
              break;
            case 'metadata':
              eventHandlers?.onMetadata?.(chunk.data);
              break;
            case 'info':
              eventHandlers?.onInfo?.(chunk.data);
              break;
            case 'error':
              eventHandlers?.onError?.(chunk.data);
              break;
            default:
              if (eventHandlers?.onCustomEvent) {
                eventHandlers.onCustomEvent(chunk.event, chunk.data);
              }
              break;
          }
        }
      } catch (error) {
        console.error('Error during reload stream:', error);
        throw error;
      }
    },
    [stream, setMessages, setInterrupt, eventHandlers]
  );

  const [isRunning, setIsRunning] = useState(false);
  const processedToolCallsRef = useRef(new Set<string>());
  const { threads, archivedThreads, onRename, onDelete } = useAiAssistant();
  const { stagingItems, isActive } = useAtSelection();

  const handleSendMessage = async (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig & { isReload?: boolean } = {}
  ) => {
    try {
      setIsRunning(true);

      if (config.isReload) {
        // 使用專門的 reload 函數，避免 accumulator 累積問題
        await sendMessageForReload(messages, config);
      } else {
        await sendMessage(messages, config);
      }
    } catch (error) {
      console.error('Error streaming messages:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const threadMessages = useExternalMessageConverter({
    callback: (message) => {
      try {
        return convertLangChainMessages(message);
      } catch (error) {
        console.error('Error converting message:', error, message);
        // Return a safe fallback message to prevent crash
        return {
          role: 'assistant' as const,
          id: message.id || `fallback-${Date.now()}`,
          content: [{ type: 'text' as const, text: 'Error processing message' }],
        };
      }
    },
    messages,
    isRunning,
  });

  const switchToThread = !onSwitchToThread
    ? undefined
    : async (externalId: string) => {
        const { messages, interrupts } = await onSwitchToThread(externalId);
        setMessages(messages);
        setInterrupt(interrupts?.[0]);
        processedToolCallsRef.current.clear();
      };

  // Memoized thread mappings to prevent infinite loop warnings
  const mappedThreads = threads.map((t) => ({
    threadId: t.threadId,
    title: t?.metadata?.threadTitle || t.title || 'New Chat',
    status: 'regular' as const,
  }));

  const mappedArchivedThreads = archivedThreads.map((t) => ({
    threadId: t.threadId,
    title: t?.metadata?.threadTitle || t.title || 'New Chat',
    status: 'archived' as const,
  }));

  // Memoized onSwitchToNewThread callback
  const switchToNewThread: (() => Promise<void>) | undefined = !onSwitchToNewThread
    ? undefined
    : async () => {
        await onSwitchToNewThread();
        setMessages([]);
        setInterrupt(undefined);
        // 切換到新線程時清理已處理的 tool calls
        processedToolCallsRef.current.clear();
      };

  // Memoized thread list to prevent infinite loop warnings
  const threadList = {
    threads: mappedThreads,
    threadId,
    archivedThreads: mappedArchivedThreads,
    onSwitchToNewThread: switchToNewThread,
    onSwitchToThread: switchToThread,
    onRename,
    onDelete,
  };

  const loadingRef = useRef(false);
  const threadListItemRuntime = useThreadListItemRuntime({ optional: true });
  useEffect(() => {
    if (!threadListItemRuntime || !switchToThread || loadingRef.current) return;

    const externalId = threadListItemRuntime.getState().externalId;
    if (externalId) {
      loadingRef.current = true;
      switchToThread(externalId).finally(() => {
        loadingRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoized adapters to prevent infinite loop warnings
  const adapters = {
    attachments,
    feedback,
    speech,
    threadList,
  };

  // Memoized extras to prevent infinite loop warnings
  const extras = {
    [symbolLangGraphRuntimeExtras]: true,
    interrupt,
    send: handleSendMessage,
  } satisfies LangGraphRuntimeExtras;

  // Handle setMessages for useExternalStoreRuntime - supports branch switching
  const handleSetMessages = useCallback(
    (newMessages: ThreadMessage[]) => {
      console.log('handleSetMessages called with:', newMessages);

      // 轉換 ThreadMessage[] 回 LangChain format
      const langChainMessages: LangChainMessage[] = newMessages.map((msg, index) => {
        const id = msg.id || `msg-${index}`;

        switch (msg.role) {
          case 'system':
            return {
              type: 'system',
              id,
              content: msg.content?.find((c) => c.type === 'text' && 'text' in c)?.text || '',
            } as LangChainMessage;

          case 'user':
            const textContent = msg.content?.find((c) => c.type === 'text' && 'text' in c)?.text || '';
            const userContext = msg.metadata?.custom?.userContext;
            return {
              type: 'human',
              id,
              content: textContent,
              ...(userContext ? { metadata: { userContext } } : {}),
            } as LangChainMessage;

          case 'assistant':
            const textParts = msg.content?.filter((c) => c.type === 'text' && 'text' in c) || [];
            const toolCalls = msg.content?.filter((c) => c.type === 'tool-call') || [];

            return {
              type: 'ai',
              id,
              content: textParts.map((p: any) => ({ type: 'text', text: p.text })),
              ...(toolCalls.length > 0 && {
                tool_calls: toolCalls.map((tc: any) => ({
                  id: tc.toolCallId,
                  name: tc.toolName,
                  args: tc.args || {},
                })),
              }),
            } as LangChainMessage;

          default:
            return {
              type: 'human',
              id,
              content: 'Unknown message type',
            } as LangChainMessage;
        }
      });

      console.log('Converted to LangChain messages:', langChainMessages);
      setMessages(langChainMessages);
    },
    [setMessages]
  );

  return useExternalStoreRuntime({
    isRunning,
    messages: threadMessages,
    adapters,
    extras,
    setMessages: handleSetMessages,
    onNew: (msg) => {
      console.log('onNew', msg);
      // 清理已處理的 tool calls，開始新的對話輪次
      processedToolCallsRef.current.clear();

      const messageContent = getMessageContent(msg);

      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingToolCalls(messages).map(
              (t) =>
                ({
                  type: 'tool',
                  name: t.name,
                  tool_call_id: t.id,
                  content: JSON.stringify({ cancelled: true }),
                  status: 'error',
                }) satisfies LangChainMessage & { type: 'tool' }
            )
          : [];

      // Get currently selected context items that are active
      const userContext = stagingItems.filter((item) => isActive(item.uid));

      const finalMessage = {
        type: 'human',
        content: messageContent,
        metadata: {
          userContext: userContext,
        },
      } as LangChainMessage;

      return handleSendMessage([...cancellations, finalMessage], {
        runConfig: msg.runConfig,
      });
    },
    onAddToolResult: async ({ toolCallId, toolName, result, isError, artifact }) => {
      if (processedToolCallsRef.current.has(toolCallId)) {
        return;
      }

      processedToolCallsRef.current.add(toolCallId);

      try {
        // TODO parallel human in the loop calls
        await handleSendMessage(
          [
            {
              type: 'tool',
              name: toolName,
              tool_call_id: toolCallId,
              content: JSON.stringify(result),
              artifact,
              status: isError ? 'error' : 'success',
            },
          ],
          {}
        );
      } catch (error) {
        // Remove from processed set so it can be retried
        processedToolCallsRef.current.delete(toolCallId);
        throw error;
      }
    },
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
        }
      : undefined,
    onReload: async (parentId, config) => {
      console.log('onReload called with parentId:', parentId);
      console.log('Current messages:', messages);

      if (!parentId) {
        // 重新生成整個對話
        setMessages([]);
        await handleSendMessage([], {});
        return;
      }

      // 找到要重新生成的起始點
      const parentIndex = messages.findIndex((m) => m.id === parentId);
      if (parentIndex === -1) return;

      const parentMessage = messages[parentIndex];
      let messagesToReload: LangChainMessage[];

      if (parentMessage?.type === 'ai') {
        // 如果點擊的是 AI 訊息，重新生成這個回應
        messagesToReload = messages.slice(0, parentIndex);
      } else {
        // 如果點擊的是 user 訊息，重新生成後續的回應
        messagesToReload = messages.slice(0, parentIndex + 1);
      }

      console.log('Messages to reload:', messagesToReload);

      // 關鍵修改：先重置 messages 狀態，這會清空 accumulator
      setMessages(messagesToReload);

      // 等待一個 tick 確保狀態更新完成
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 然後重新發送訊息，這時 accumulator 會使用清空後的 messages
      await handleSendMessage(messagesToReload, { isReload: true });
    },
    onEdit: async (message) => {},
  });
};
