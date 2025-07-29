import { AtSelectionItem } from '../../../contexts/AtSelectionContext';

// Simple type definition for ReadonlyJSONObject
export type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

export type ReadonlyJSONValue = string | number | boolean | null | ReadonlyJSONArray | ReadonlyJSONObject;

export type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

export type LangChainToolCallChunk = {
  index: number;
  id: string;
  name: string;
  args: string;
};

export type LangChainToolCall = {
  id: string;
  name: string;
  argsText: string;
  args: ReadonlyJSONObject;
};

export type MessageContentText = {
  type: 'text' | 'text_delta';
  text: string;
};

export type MessageContentImageUrl = {
  type: 'image_url';
  image_url: string | { url: string };
};

type MessageContentToolUse = {
  type: 'tool_use' | 'input_json_delta';
};

export const LangGraphKnownEventTypes = {
  Messages: 'messages',
  MessagesPartial: 'messages/partial',
  MessagesComplete: 'messages/complete',
  Metadata: 'metadata',
  Updates: 'updates',
  Info: 'info',
  Error: 'error',
} as const;

export type LangGraphKnownEventTypes = (typeof LangGraphKnownEventTypes)[keyof typeof LangGraphKnownEventTypes];

type CustomEventType = string;

export type EventType = LangGraphKnownEventTypes | CustomEventType;

type UserMessageContentComplex = MessageContentText | MessageContentImageUrl;
type AssistantMessageContentComplex = MessageContentText | MessageContentImageUrl | MessageContentToolUse;

type UserMessageContent = string | UserMessageContentComplex[];
type AssistantMessageContent = string | AssistantMessageContentComplex[];

// 定義所有 message type 共同的屬性
export type LangGraphMessageBase = {
  id?: string;
  parentId?: string; // Add parentId for assistant-ui branch support
  additional_kwargs?: {
    metadata?: {
      userContext?: AtSelectionItem[];
    };
  };
  example?: boolean;
  response_metadata?: {
    finish_reason?: string;
    model_name?: string;
    service_tier?: string;
    system_fingerprint?: string;
  };
};

// 定義 AI 專屬的屬性
export type LangGraphAIMessageExtras = {
  invalid_tool_calls?: any[];
  tool_calls?: LangChainToolCall[];
  usage_metadata?: Record<string, any>;
};

// 基於 LangGraphMessageBase 重構 LangChainMessage
export type LangChainMessage =
  | (LangGraphMessageBase & {
      type: 'system';
      content: string;
    })
  | (LangGraphMessageBase & {
      type: 'human';
      content: UserMessageContent;
      metadata?: {
        userContext?: AtSelectionItem[];
      };
    })
  | (LangGraphMessageBase & {
      type: 'tool';
      content: string;
      tool_call_id: string;
      name: string;
      artifact?: any;
      status: 'success' | 'error';
    })
  | (LangGraphMessageBase &
      LangGraphAIMessageExtras & {
        type: 'ai';
        content: AssistantMessageContent;
        tool_call_chunks?: LangChainToolCallChunk[];
        tool_calls?: LangChainToolCall[];
      });

export type LangChainMessageChunk = {
  id?: string | undefined;
  type: 'AIMessageChunk';
  content?: AssistantMessageContent | undefined;
  tool_call_chunks?: LangChainToolCallChunk[] | undefined;
};

export type LangChainEvent = {
  event: typeof LangGraphKnownEventTypes.MessagesPartial | typeof LangGraphKnownEventTypes.MessagesComplete;
  data: LangChainMessage[];
};

type LangGraphTupleMetadata = Record<string, unknown>;

export type LangChainMessageTupleEvent = {
  event: typeof LangGraphKnownEventTypes.Messages;
  data: [LangChainMessageChunk, LangGraphTupleMetadata];
};

export type OnMetadataEventCallback = (metadata: unknown) => void | Promise<void>;
export type OnInfoEventCallback = (info: unknown) => void | Promise<void>;
export type OnErrorEventCallback = (error: unknown) => void | Promise<void>;
export type OnCustomEventCallback = (type: string, data: unknown) => void | Promise<void>;

// LangGraph runtime types
export type LangGraphCommand = {
  resume: string;
};

export type LangGraphSendMessageConfig = {
  command?: LangGraphCommand;
  runConfig?: unknown;
};

export type LangGraphMessagesEvent<TMessage> = {
  event: EventType;
  data: TMessage[] | any;
};

export type LangGraphStreamCallback<TMessage> = (
  messages: TMessage[],
  config: LangGraphSendMessageConfig & { abortSignal: AbortSignal }
) => Promise<AsyncGenerator<LangGraphMessagesEvent<TMessage>>> | AsyncGenerator<LangGraphMessagesEvent<TMessage>>;

export type LangGraphInterruptState = {
  value?: any;
  resumable?: boolean;
  when: string;
  ns?: string[];
};
