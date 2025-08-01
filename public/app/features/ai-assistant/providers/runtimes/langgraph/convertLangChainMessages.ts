import { useExternalMessageConverter } from '@assistant-ui/react';
import type { LangChainMessage } from './types';
import type { ToolCallMessagePart } from '@assistant-ui/react';
import type { ThreadUserMessage } from '@assistant-ui/react';

const contentToParts = (content: LangChainMessage['content']) => {
  if (typeof content === 'string') return [{ type: 'text' as const, text: content }];
  return content
    .map((part): ThreadUserMessage['content'][number] | null => {
      const type = part.type;
      switch (type) {
        case 'text':
          return { type: 'text', text: part.text };
        case 'text_delta':
          return { type: 'text', text: part.text };
        case 'image_url':
          if (typeof part.image_url === 'string') {
            return { type: 'image', image: part.image_url };
          } else {
            return {
              type: 'image',
              image: part.image_url.url,
            };
          }

        case 'tool_use':
          return null;
        case 'input_json_delta':
          return null;
        default:
          const _exhaustiveCheck: never = type;
          throw new Error(`Unknown message part type: ${_exhaustiveCheck}`);
      }
    })
    .filter((a) => a !== null);
};

export const convertLangChainMessages: useExternalMessageConverter.Callback<LangChainMessage> = (message) => {
  switch (message.type) {
    case 'system':
      return {
        role: 'system',
        id: message.id,
        content: [{ type: 'text', text: message.content }],
      };
    case 'human':
      const syncUserContext = message?.additional_kwargs?.metadata?.userContext;
      const localUserContext = message?.metadata?.userContext;
      const userContext = syncUserContext || localUserContext;
      return {
        role: 'user',
        id: message.id,
        content: contentToParts(message.content),
        ...(message.parentId && { parentId: message.parentId }),
        metadata: {
          ...(userContext && {
            custom: { userContext },
          }),
        },
      };
    case 'ai':
      return {
        role: 'assistant',
        id: message.id,
        content: [
          ...contentToParts(message.content),
          ...(message.tool_calls
            ?.map((chunk): ToolCallMessagePart | null => {
              try {
                // Validate tool call has required fields
                if (!chunk.id || !chunk.name) {
                  console.warn('Invalid tool call missing id or name:', chunk);
                  return null;
                }
                return {
                  type: 'tool-call',
                  toolCallId: chunk.id,
                  toolName: chunk.name,
                  args: chunk.args || {},
                  argsText:
                    message.tool_call_chunks?.find((c) => c.id === chunk.id)?.args ??
                    (chunk.args ? JSON.stringify(chunk.args) : '{}'),
                };
              } catch (error) {
                console.error('Error converting tool call:', error, chunk);
                return null;
              }
            })
            .filter((part): part is ToolCallMessagePart => part !== null) ?? []),
        ],
      };
    case 'tool':
      return {
        role: 'tool',
        toolName: message.name,
        toolCallId: message.tool_call_id,
        result: message.content,
        artifact: message.artifact,
        isError: message.status === 'error',
      };
  }
};
