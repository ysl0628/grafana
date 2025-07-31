import { Client, Metadata, StreamMode, type ThreadState } from '@langchain/langgraph-sdk';
import { config } from '@grafana/runtime';
import { AiAssistantMessage, AiAssistantTool } from '../types/aiAssistant';
import { LangChainMessage } from '../providers/runtimes/langgraph/types';
import { AtSelectionItem } from '../contexts/AtSelectionContext';

/**
 * AI Assistant API Service using LangGraph SDK
 *
 * Provides LangGraph client-based communication for AI assistant functionality.
 * Uses the same pattern as the react-ai-assistant-demo implementation.
 */

// LangGraph client configuration
const client = new Client({
  // apiUrl: config?.aiAssistantApiUrl || 'https://grafana-llm-agent.zeabur.app',
  apiUrl: 'https://grafana-llm-agent.zeabur.app',
});

interface CreateThreadResponse {
  thread_id: string;
  created_at: string;
}

/**
 * Convert AI Assistant messages to LangChain format
 */
export const convertMessagesToLangChain = (messages: readonly AiAssistantMessage[]): LangChainMessage[] => {
  const langChainMessages: LangChainMessage[] = [];

  for (const msg of messages) {
    switch (msg.role) {
      case 'user':
        langChainMessages.push({
          id: msg.id,
          type: 'human',
          content: [
            {
              type: 'text',
              text: String(msg.content),
            },
          ],
        });
        break;

      case 'assistant':
        langChainMessages.push({
          id: msg.id,
          type: 'ai',
          content: String(msg.content),
        });
        break;

      case 'system':
        langChainMessages.push({
          id: msg.id,
          type: 'system',
          content: String(msg.content),
        });
        break;

      default:
        console.warn(`Unsupported message role: ${(msg as any).role}`);
    }
  }

  return langChainMessages;
};

const convertToolMessage = (toolMessage: LangChainMessage) => {
  let toolMessageContent: any = {};

  try {
    toolMessageContent = JSON.parse(toolMessage.content as string) || {};
  } catch (error) {
    toolMessageContent = { content: toolMessage.content };
  }

  if (!toolMessage?.type || toolMessage?.type !== 'tool' || !toolMessageContent?.isResult) return null;

  return toolMessageContent;
};

/**
 * Extract thread title from the first message
 */
export const getThreadTitle = (message: LangChainMessage | undefined): string | undefined => {
  if (!message) return undefined;

  if (typeof message.content === 'string') {
    return message.content.slice(0, 50); // First 50 chars as title
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === 'text' && part.text) {
        return part.text.slice(0, 50); // First 50 chars as title
      }
    }
  }

  return undefined;
};

/**
 * Create a new conversation thread using LangGraph SDK
 */
export const createThread = async ({ metadata }: { metadata?: Metadata }): Promise<CreateThreadResponse> => {
  return client.threads.create({ metadata });
};

/**
 * Get thread state using LangGraph SDK
 */
export const getThreadState = async (threadId: string): Promise<ThreadState<{ messages: LangChainMessage[] }>> => {
  return client.threads.getState(threadId);
};

/**
 * Switch to an existing thread using LangGraph SDK
 */
export const switchToThread = async (threadId: string) => {
  return await getThreadState(threadId);
};

const getContextInfo = (context: AtSelectionItem[] | undefined) => {
  if (!context) return {};

  const datasources: AtSelectionItem[] = [];
  const dashboards: AtSelectionItem[] = [];

  context.forEach((item) => {
    if (item.type === 'dashboard') {
      dashboards.push(item);
    } else {
      datasources.push(item);
    }
  });

  return {
    datasources,
    dashboards,
  };
};

/**
 * Send message and stream response using LangGraph SDK
 */
export const sendMessage = async (params: {
  threadId: string;
  messages: LangChainMessage[];
  context?: AtSelectionItem[];
  tools?: AiAssistantTool[];
  checkpoint?: any;
}) => {
  // Messages are already in LangChain format from the runtime, no need to convert
  const messages = params.messages;
  const convertedToolMessage = convertToolMessage(params.messages[0]);

  const payload = {
    ...(!convertedToolMessage
      ? {
          input: {
            messages: messages,
            tools: params.tools
              ? Object.keys(params.tools).map((name) => ({
                  type: 'function',
                  function: {
                    name,
                  },
                }))
              : [],
            user_context: getContextInfo(params.context),
          },
        }
      : {}),
    command: convertedToolMessage,
    ...(params.checkpoint && { checkpoint: params.checkpoint }),
    metadata: {
      current_url: window.location.href,
    },
    streamMode: [
      // 'messages-tuple',
      'messages',
      // 'updates',
    ] as StreamMode[],
    streamResumable: true,
  };

  return client.runs.stream(params.threadId, 'agent', payload);
};

/**
 * Delete a thread using LangGraph SDK
 */
export const deleteThread = async (threadId: string): Promise<void> => {
  await client.threads.delete(threadId);
};

/**
 * List all threads for the current user using LangGraph SDK
 */
export const getThreadList = async () => {
  return client.threads.search({
    limit: 10,
    offset: 0,
    metadata: {
      user: {
        uid: config.bootData.user.uid,
      },
    },
  });
};

// Alias for backward compatibility
export const listThreads = getThreadList;

/**
 * Update thread title using LangGraph SDK
 */
export const updateThreadTitle = async (threadId: string, title: string) => {
  return client.threads.update(threadId, {
    metadata: { threadTitle: title },
  });
};

/**
 * Update thread metadata using LangGraph SDK
 */
export const updateThread = async (threadId: string, metadata: Record<string, any>) => {
  return client.threads.update(threadId, { metadata });
};

/**
 * Check API health using LangGraph SDK
 */
export const checkApiHealth = async (): Promise<{ status: string; version?: string }> => {
  try {
    // Try to create a test thread to verify connectivity
    const testThread = await client.threads.create();
    await client.threads.delete(testThread.thread_id);
    return { status: 'ok', version: 'langgraph-sdk' };
  } catch (error) {
    console.error('Error checking API health:', error);
    return { status: 'error' };
  }
};

export const getThreadHistory = async (threadId: string) => {
  return client.threads.getHistory(threadId);
};

/**
 * Cancel a running operation using LangGraph SDK
 */
export const cancelOperation = async (threadId: string): Promise<void> => {
  try {
    // Get the latest run for the thread and cancel it
    const runs = await client.runs.list(threadId, { limit: 1 });
    if (runs.length > 0) {
      await client.runs.cancel(threadId, runs[0].run_id);
    }
  } catch (error) {
    console.error('Error canceling operation:', error);
    throw error;
  }
};

export default {
  createThread,
  getThreadState,
  switchToThread,
  sendMessage,
  deleteThread,
  listThreads: getThreadList,
  updateThread,
  updateThreadTitle,
  checkApiHealth,
  cancelOperation,
  getThreadHistory,
  convertMessagesToLangChain,
};
