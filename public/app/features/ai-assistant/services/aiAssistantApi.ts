import { config } from '@grafana/runtime';

import { AiAssistantMessage, GrafanaContext, AiAssistantTools, ThreadState } from '../types/aiAssistant';

/**
 * AI Assistant API Service
 * 
 * Handles communication with the LangGraph backend for AI assistant functionality.
 * Provides methods for thread management, message streaming, and tool execution.
 */

interface CreateThreadResponse {
  thread_id: string;
  created_at: string;
}

interface ThreadStateResponse {
  values: {
    messages?: AiAssistantMessage[];
  };
  tasks: Array<{
    interrupts?: any[];
  }>;
}

interface SendMessageRequest {
  threadId: string;
  messages: AiAssistantMessage[];
  context?: GrafanaContext;
  tools?: AiAssistantTools;
}

/**
 * Get AI Assistant API configuration
 */
function getApiConfig() {
  return {
    baseUrl: config.aiAssistantApiUrl || '/api/ai-assistant',
    timeout: config.aiAssistantTimeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      'X-Grafana-Org-Id': config.bootData?.user?.orgId?.toString(),
    },
  };
}

/**
 * Create a new conversation thread
 */
export async function createThread(): Promise<CreateThreadResponse> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads`, {
      method: 'POST',
      headers: apiConfig.headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

/**
 * Create a new thread with initial context
 */
export async function createNewThread(context?: GrafanaContext): Promise<CreateThreadResponse> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads`, {
      method: 'POST',
      headers: apiConfig.headers,
      body: JSON.stringify({ context }),
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create new thread: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating new thread:', error);
    throw error;
  }
}

/**
 * Get thread state
 */
export async function getThreadState(threadId: string): Promise<ThreadStateResponse> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads/${threadId}/state`, {
      method: 'GET',
      headers: apiConfig.headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get thread state: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting thread state:', error);
    throw error;
  }
}

/**
 * Switch to an existing thread
 */
export async function switchToThread(threadId: string): Promise<ThreadStateResponse> {
  return await getThreadState(threadId);
}

/**
 * Send message and stream response
 */
export async function* sendMessage(request: SendMessageRequest): AsyncGenerator<AiAssistantMessage, void, unknown> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads/${request.threadId}/messages`, {
      method: 'POST',
      headers: {
        ...apiConfig.headers,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        messages: request.messages,
        context: request.context,
        tools: request.tools ? Object.keys(request.tools) : [],
      }),
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') {
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const message: AiAssistantMessage = JSON.parse(data);
              yield message;
            } catch (parseError) {
              console.warn('Failed to parse message:', data, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Delete a thread
 */
export async function deleteThread(threadId: string): Promise<void> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads/${threadId}`, {
      method: 'DELETE',
      headers: apiConfig.headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete thread: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
}

/**
 * List all threads for the current user
 */
export async function listThreads(): Promise<ThreadState[]> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads`, {
      method: 'GET',
      headers: apiConfig.headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list threads: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error listing threads:', error);
    throw error;
  }
}

/**
 * Update thread metadata
 */
export async function updateThread(threadId: string, updates: Partial<ThreadState>): Promise<ThreadState> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads/${threadId}`, {
      method: 'PATCH',
      headers: apiConfig.headers,
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update thread: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating thread:', error);
    throw error;
  }
}

/**
 * Get thread history
 */
export async function getThreadHistory(threadId: string, limit?: number): Promise<AiAssistantMessage[]> {
  const apiConfig = getApiConfig();
  const url = new URL(`${apiConfig.baseUrl}/threads/${threadId}/messages`);
  
  if (limit) {
    url.searchParams.set('limit', limit.toString());
  }
  
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: apiConfig.headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get thread history: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting thread history:', error);
    throw error;
  }
}

/**
 * Check API health
 */
export async function checkApiHealth(): Promise<{ status: string; version?: string }> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/health`, {
      method: 'GET',
      headers: apiConfig.headers,
      signal: AbortSignal.timeout(5000), // Shorter timeout for health check
    });
    
    if (!response.ok) {
      throw new Error(`API health check failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking API health:', error);
    return { status: 'error' };
  }
}

/**
 * Cancel a running operation
 */
export async function cancelOperation(threadId: string): Promise<void> {
  const apiConfig = getApiConfig();
  
  try {
    const response = await fetch(`${apiConfig.baseUrl}/threads/${threadId}/cancel`, {
      method: 'POST',
      headers: apiConfig.headers,
      signal: AbortSignal.timeout(apiConfig.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cancel operation: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error canceling operation:', error);
    throw error;
  }
}

/**
 * Mock API functions for development
 */
export const mockApi = {
  createThread: async (): Promise<CreateThreadResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      thread_id: `mock-thread-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
  },
  
  getThreadState: async (threadId: string): Promise<ThreadStateResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      values: { messages: [] },
      tasks: [{ interrupts: [] }],
    };
  },
  
  sendMessage: async function* (request: SendMessageRequest): AsyncGenerator<AiAssistantMessage, void, unknown> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    yield {
      id: `mock-msg-${Date.now()}`,
      role: 'assistant',
      content: 'This is a mock response for development purposes. The AI assistant integration is working correctly!',
      timestamp: new Date(),
      context: request.context,
    };
  },
  
  checkApiHealth: async (): Promise<{ status: string; version?: string }> => {
    return { status: 'ok', version: 'mock-1.0.0' };
  },
};

/**
 * Check if we should use mock API (for development)
 */
export function shouldUseMockApi(): boolean {
  return config.aiAssistantUseMock || !config.aiAssistantApiUrl;
}

export default {
  createThread,
  createNewThread,
  getThreadState,
  switchToThread,
  sendMessage,
  deleteThread,
  listThreads,
  updateThread,
  getThreadHistory,
  checkApiHealth,
  cancelOperation,
  mockApi,
  shouldUseMockApi,
};
