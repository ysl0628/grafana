import type { ThreadMessage } from '@assistant-ui/react';
import type { LangChainMessage } from './types';

/**
 * 將 ThreadMessage[] 轉換為 LangChainMessage[]
 */
export function convertThreadMessagesToLangChain(threadMessages: ThreadMessage[]): LangChainMessage[] {
  return threadMessages.map((msg, index) => {
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

        if (toolCalls.length > 0) {
          return {
            type: 'tool',
            id,
            content: '',
            tool_call_id: toolCalls[0].toolCallId,
            name: toolCalls[0].toolName,
            status: 'success',
            artifact: toolCalls[0].result,
            tool_calls: toolCalls.map((tc: any) => ({
              id: tc.toolCallId,
              name: tc.toolName,
              args: tc.args || {},
            })),
          } as LangChainMessage;
        }

        return {
          type: 'ai',
          id,
          content: textParts.map((p: any) => ({ type: 'text', text: p.text })),
        } as LangChainMessage;

      default:
        return {
          type: 'human',
          id,
          content: 'Unknown message type',
        } as LangChainMessage;
    }
  });
}

/**
 * 從用戶輸入創建 LangChain 格式的訊息
 */
export function createLangChainMessageFromUserInput(content: any, userContext: any[]): LangChainMessage {
  const allContent = Array.isArray(content) ? [...content] : [content];

  const messageContent = allContent.map((part) => {
    if (typeof part === 'string') {
      return { type: 'text' as const, text: part };
    }

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

  // 簡化為純文本如果只有一個文本部分
  const finalContent =
    messageContent.length === 1 && messageContent[0]?.type === 'text' ? messageContent[0].text : messageContent;

  return {
    type: 'human',
    content: finalContent,
    metadata: {
      userContext: userContext,
    },
  } as LangChainMessage;
}
