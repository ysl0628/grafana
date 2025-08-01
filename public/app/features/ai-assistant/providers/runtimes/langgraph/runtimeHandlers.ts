import type { ThreadMessage, AppendMessage, AddToolResultOptions } from '@assistant-ui/react';
import type { LangChainMessage, LangGraphSendMessageConfig } from './types';
import { convertThreadMessagesToLangChain, createLangChainMessageFromUserInput } from './messageConverters';

export interface RuntimeHandlerDependencies {
  handleSendMessage: (
    messages: LangChainMessage[],
    config: LangGraphSendMessageConfig & { isReload?: boolean }
  ) => Promise<void>;
  setMessages: (messages: LangChainMessage[]) => void;
  messages: LangChainMessage[];
  processedToolCallsRef: React.MutableRefObject<Set<string>>;
  stagingItems: any[];
  isActive: (uid: string) => boolean;
}

/**
 * 創建 onNew 處理器
 */
export function createOnNewHandler(deps: RuntimeHandlerDependencies) {
  return async (msg: AppendMessage) => {
    console.log('onNew', msg);
    
    // 清理已處理的 tool calls，開始新的對話輪次
    deps.processedToolCallsRef.current.clear();

    // 取消待處理的 tool calls
    const pendingToolCalls = new Map<string, any>();
    for (const message of deps.messages) {
      if (message.type === 'ai') {
        for (const toolCall of message.tool_calls ?? []) {
          pendingToolCalls.set(toolCall.id, toolCall);
        }
      }
      if (message.type === 'tool') {
        pendingToolCalls.delete(message.tool_call_id);
      }
    }

    const cancellations = [...pendingToolCalls.values()].map(
      (t) =>
        ({
          type: 'tool',
          name: t.name,
          tool_call_id: t.id,
          content: JSON.stringify({ cancelled: true }),
          status: 'error',
        }) as LangChainMessage & { type: 'tool' }
    );

    // 獲取當前選中的上下文項目
    const userContext = deps.stagingItems.filter((item) => deps.isActive(item.uid));

    // 創建最終訊息
    const finalMessage = createLangChainMessageFromUserInput(msg.content, userContext);

    return deps.handleSendMessage([...cancellations, finalMessage], {
      runConfig: msg.runConfig,
    });
  };
}

/**
 * 創建 onAddToolResult 處理器
 */
export function createOnAddToolResultHandler(deps: RuntimeHandlerDependencies) {
  return async ({ toolCallId, toolName, result, isError, artifact }: AddToolResultOptions) => {
    if (deps.processedToolCallsRef.current.has(toolCallId)) {
      return;
    }

    deps.processedToolCallsRef.current.add(toolCallId);

    try {
      await deps.handleSendMessage(
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
      deps.processedToolCallsRef.current.delete(toolCallId);
      throw error;
    }
  };
}

/**
 * 創建 onReload 處理器
 */
export function createOnReloadHandler(deps: RuntimeHandlerDependencies) {
  return async (parentId: string | null) => {
    console.log('onReload called with parentId:', parentId);
    console.log('Current messages:', deps.messages);
    
    if (!parentId) {
      // 重新生成整個對話
      deps.setMessages([]);
      await deps.handleSendMessage([], {});
      return;
    }

    // 找到要重新生成的起始點
    const parentIndex = deps.messages.findIndex((m) => m.id === parentId);
    if (parentIndex === -1) return;

    const parentMessage = deps.messages[parentIndex];
    let messagesToReload: LangChainMessage[];

    if (parentMessage?.type === 'ai') {
      // 如果點擊的是 AI 訊息，重新生成這個回應
      messagesToReload = deps.messages.slice(0, parentIndex);
    } else {
      // 如果點擊的是 user 訊息，重新生成後續的回應
      messagesToReload = deps.messages.slice(0, parentIndex + 1);
    }

    console.log('Messages to reload:', messagesToReload);

    // 關鍵修改：先重置 messages 狀態，這會清空 accumulator
    deps.setMessages(messagesToReload);

    // 等待一個 tick 確保狀態更新完成
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 然後重新發送訊息，這時 accumulator 會使用清空後的 messages
    await deps.handleSendMessage(messagesToReload, { isReload: true });
  };
}

/**
 * 創建 setMessages 處理器
 */
export function createSetMessagesHandler(setMessages: (messages: LangChainMessage[]) => void) {
  return (newMessages: ThreadMessage[]) => {
    console.log('handleSetMessages called with:', newMessages);

    const langChainMessages = convertThreadMessagesToLangChain(newMessages);
    console.log('Converted to LangChain messages:', langChainMessages);

    setMessages(langChainMessages);
  };
}
