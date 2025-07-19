import { Client, type ThreadState } from '@langchain/langgraph-sdk';
import { config } from '@grafana/runtime';
import { AiAssistantMessage, GrafanaContext, AiAssistantTools } from '../types/aiAssistant';
import { LangChainMessage } from '../providers/runtimes/langgraph/types';

/**
 * AI Assistant API Service using LangGraph SDK
 *
 * Provides LangGraph client-based communication for AI assistant functionality.
 * Uses the same pattern as the react-ai-assistant-demo implementation.
 */

// LangGraph client configuration
const client = new Client({
  apiUrl: config?.aiAssistantApiUrl || 'http://localhost:2024',
});

interface CreateThreadResponse {
  thread_id: string;
  created_at: string;
}

interface SendMessageRequest {
  threadId: string;
  messages: LangChainMessage[];
  context?: GrafanaContext;
  tools?: AiAssistantTools;
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
 * Create a new conversation thread using LangGraph SDK
 */
export const createThread = async (): Promise<CreateThreadResponse> => {
  const thread = await client.threads.create();
  return {
    thread_id: thread.thread_id,
    created_at: thread.created_at,
  };
};

/**
 * Create a new thread with initial context using LangGraph SDK
 */
export const createNewThread = async (context?: GrafanaContext): Promise<CreateThreadResponse> => {
  const thread = await client.threads.create({
    metadata: { grafanaContext: context },
  });
  return {
    thread_id: thread.thread_id,
    created_at: thread.created_at,
  };
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

/**
 * Send message and stream response using LangGraph SDK
 */
export const sendMessage = async (params: {
  threadId: string;
  messages: LangChainMessage[];
  context?: GrafanaContext;
  tools?: AiAssistantTools;
}) => {
  const convertedMessages = convertMessagesToLangChain(params.messages as any);
  const convertedToolMessage = convertToolMessage(params.messages[0]);

  return client.runs.stream(params.threadId, config.aiAssistantId || 'agent', {
    ...(!convertedToolMessage
      ? {
          input: {
            messages: convertedMessages,
            grafanaContext: params.context,
            tools: params.tools
              ? Object.keys(params.tools).map((name) => ({
                  type: 'function',
                  function: {
                    name,
                    description: params.tools![name].description || `Grafana tool: ${name}`,
                    parameters: params.tools![name].parameters || {
                      type: 'object',
                      properties: {},
                    },
                  },
                }))
              : [],
          },
        }
      : {}),
    command: convertedToolMessage,
    metadata: {
      threadTitle: convertedMessages[0]?.content?.[0]?.text || 'New Chat',
      grafanaContext: params.context,
    },
    streamMode: ['messages-tuple', 'messages', 'updates'],
    streamResumable: true,
  });
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
 * Get thread history using LangGraph SDK
 */
export const getThreadHistory = async (threadId: string, limit?: number) => {
  const state = await client.threads.getState(threadId);
  const messages = state.values?.messages || [];

  if (limit) {
    return messages.slice(-limit);
  }

  return messages;
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
  createNewThread,
  getThreadState,
  switchToThread,
  sendMessage,
  deleteThread,
  listThreads: getThreadList,
  updateThread,
  updateThreadTitle,
  getThreadHistory,
  checkApiHealth,
  cancelOperation,
  convertMessagesToLangChain,
};
