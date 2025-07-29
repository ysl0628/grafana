import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LangChainMessage,
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
import type { AttachmentAdapter } from '@assistant-ui/react';
import type { FeedbackAdapter } from '@assistant-ui/react';
import type { SpeechSynthesisAdapter } from '@assistant-ui/react';
import { appendLangChainChunk } from './appendLangChainChunk';
import useAiAssistant from 'app/features/ai-assistant/hooks/useAiAssistant';
import { useAtSelection } from '../../../contexts/AtSelectionContext';
import { processLangGraphStream } from './streamingUtils';
import {
  createOnNewHandler,
  createOnAddToolResultHandler,
  createOnReloadHandler,
  createSetMessagesHandler,
} from './runtimeHandlers';


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

  // 專門用於 reload 的函數，使用共用的 streaming 邏輯
  const sendMessageForReload = useCallback(
    async (newMessages: LangChainMessage[], config: LangGraphSendMessageConfig) => {
      await processLangGraphStream(
        stream,
        newMessages,
        config,
        {
          setMessages,
          setInterrupt,
          eventHandlers,
        },
        {
          initialMessages: newMessages, // 使用 newMessages 作為初始訊息，避免累積
          appendMessage: appendLangChainChunk,
          preAddMessages: false, // reload 時不預先添加訊息
        }
      );
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

  // 使用提取的 setMessages 處理器
  const handleSetMessages = useCallback(
    createSetMessagesHandler(setMessages),
    [setMessages]
  );

  return useExternalStoreRuntime({
    isRunning,
    messages: threadMessages,
    adapters,
    extras,
    setMessages: handleSetMessages,
    onNew: createOnNewHandler({
      handleSendMessage,
      setMessages,
      messages,
      processedToolCallsRef,
      stagingItems,
      isActive,
    }),
    onAddToolResult: createOnAddToolResultHandler({
      handleSendMessage,
      setMessages,
      messages,
      processedToolCallsRef,
      stagingItems,
      isActive,
    }),
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
        }
      : undefined,
    onReload: createOnReloadHandler({
      handleSendMessage,
      setMessages,
      messages,
      processedToolCallsRef,
      stagingItems,
      isActive,
    }),
    onEdit: async (message) => {},
  });
};
