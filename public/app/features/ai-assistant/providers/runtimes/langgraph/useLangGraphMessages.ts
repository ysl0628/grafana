import { useState, useCallback, useRef, useMemo } from 'react';
import { processLangGraphStream } from './streamingUtils';
import type {
  OnCustomEventCallback,
  OnErrorEventCallback,
  OnInfoEventCallback,
  OnMetadataEventCallback,
  LangGraphCommand,
  LangGraphSendMessageConfig,
  LangGraphStreamCallback,
  LangGraphInterruptState,
} from './types';

export type { LangGraphCommand, LangGraphSendMessageConfig, LangGraphStreamCallback, LangGraphInterruptState };

const DEFAULT_APPEND_MESSAGE = <TMessage>(_: TMessage | undefined, curr: TMessage) => curr;

export const useLangGraphMessages = <TMessage extends { id?: string }>({
  stream,
  appendMessage = DEFAULT_APPEND_MESSAGE,
  eventHandlers,
}: {
  stream: LangGraphStreamCallback<TMessage>;
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  eventHandlers?: {
    onMetadata?: OnMetadataEventCallback;
    onInfo?: OnInfoEventCallback;
    onError?: OnErrorEventCallback;
    onCustomEvent?: OnCustomEventCallback;
  };
}) => {
  const [interrupt, setInterrupt] = useState<LangGraphInterruptState | undefined>();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { onMetadata, onInfo, onError, onCustomEvent } = useMemo(() => eventHandlers ?? {}, [eventHandlers]);

  const sendMessage = useCallback(
    async (newMessages: TMessage[], config: LangGraphSendMessageConfig) => {
      await processLangGraphStream(
        stream,
        newMessages,
        config,
        {
          setMessages,
          setInterrupt,
          eventHandlers: { onMetadata, onInfo, onError, onCustomEvent },
        },
        {
          initialMessages: messages,
          appendMessage,
          abortControllerRef,
          preAddMessages: true, // 在 streaming 前先添加訊息
        }
      );
    },
    [messages, appendMessage, stream, onMetadata, onInfo, onError, onCustomEvent, abortControllerRef]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    } else {
      console.error('No active stream to cancel');
    }
  }, [abortControllerRef]);

  return {
    interrupt,
    messages,
    sendMessage,
    cancel,
    setInterrupt,
    setMessages,
  };
};
