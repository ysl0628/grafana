// Simple type definition for ReadonlyJSONObject
export type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

export type ReadonlyJSONValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyJSONArray
  | ReadonlyJSONObject;

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
  type: "text" | "text_delta";
  text: string;
};

export type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | { url: string };
};

type MessageContentToolUse = {
  type: "tool_use" | "input_json_delta";
};

export const LangGraphKnownEventTypes = {
  Messages: "messages",
  MessagesPartial: "messages/partial",
  MessagesComplete: "messages/complete",
  Metadata: "metadata",
  Updates: "updates",
  Info: "info",
  Error: "error",
} as const;

export type LangGraphKnownEventTypes =
  (typeof LangGraphKnownEventTypes)[keyof typeof LangGraphKnownEventTypes];

type CustomEventType = string;

export type EventType = LangGraphKnownEventTypes | CustomEventType;

type UserMessageContentComplex = MessageContentText | MessageContentImageUrl;
type AssistantMessageContentComplex =
  | MessageContentText
  | MessageContentImageUrl
  | MessageContentToolUse;

type UserMessageContent = string | UserMessageContentComplex[];
type AssistantMessageContent = string | AssistantMessageContentComplex[];

export type LangChainMessage =
  | {
      id?: string;
      type: "system";
      content: string;
    }
  | {
      id?: string;
      type: "human";
      content: UserMessageContent;
    }
  | {
      id?: string;
      type: "tool";
      content: string;
      tool_call_id: string;
      name: string;
      artifact?: any;
      status: "success" | "error";
    }
  | {
      id?: string;
      type: "ai";
      content: AssistantMessageContent;
      tool_call_chunks?: LangChainToolCallChunk[];
      tool_calls?: LangChainToolCall[];
    };

export type LangChainMessageChunk = {
  id?: string | undefined;
  type: "AIMessageChunk";
  content?: AssistantMessageContent | undefined;
  tool_call_chunks?: LangChainToolCallChunk[] | undefined;
};

export type LangChainEvent = {
  event:
    | typeof LangGraphKnownEventTypes.MessagesPartial
    | typeof LangGraphKnownEventTypes.MessagesComplete;
  data: LangChainMessage[];
};

type LangGraphTupleMetadata = Record<string, unknown>;

export type LangChainMessageTupleEvent = {
  event: typeof LangGraphKnownEventTypes.Messages;
  data: [LangChainMessageChunk, LangGraphTupleMetadata];
};

export type OnMetadataEventCallback = (
  metadata: unknown,
) => void | Promise<void>;
export type OnInfoEventCallback = (info: unknown) => void | Promise<void>;
export type OnErrorEventCallback = (error: unknown) => void | Promise<void>;
export type OnCustomEventCallback = (
  type: string,
  data: unknown,
) => void | Promise<void>;