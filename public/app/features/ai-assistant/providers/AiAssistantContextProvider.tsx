import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { useLocalStorage } from 'react-use';

import { locationService } from '@grafana/runtime';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { contextSrv } from 'app/core/core';

import { 
  createNewThread, 
  deleteThread, 
  updateThreadTitle, 
  updateThread,
  sendMessage,
  getThreadList,
  shouldUseMockApi,
  mockApi,
  convertMessagesToLangChain,
} from '../services/aiAssistantApi';
import { getAiAssistantTools } from '../services/aiAssistantTools';
import { 
  AiAssistantState, 
  AiAssistantContextValue, 
  ThreadState, 
  GrafanaContext,
  AI_ASSISTANT_STORAGE_KEYS,
  AI_ASSISTANT_DEFAULTS,
} from '../types/aiAssistant';

// Action types
type AiAssistantAction = 
  | { type: 'OPEN_SIDEBAR' }
  | { type: 'CLOSE_SIDEBAR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_THREADS'; payload: ThreadState[] }
  | { type: 'SET_CURRENT_THREAD'; payload: string | null }
  | { type: 'ADD_THREAD'; payload: ThreadState }
  | { type: 'UPDATE_THREAD'; payload: { id: string; updates: Partial<ThreadState> } }
  | { type: 'DELETE_THREAD'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: { threadId: string; message: any } };

// Initial state
const initialState: AiAssistantState = {
  isOpen: false,
  currentThreadId: null,
  threads: new Map(),
  isLoading: false,
  error: null,
};

// Reducer
function aiAssistantReducer(state: AiAssistantState, action: AiAssistantAction): AiAssistantState {
  switch (action.type) {
    case 'OPEN_SIDEBAR':
      return { ...state, isOpen: true };
    
    case 'CLOSE_SIDEBAR':
      return { ...state, isOpen: false };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_THREADS':
      const threadsMap = new Map();
      action.payload.forEach(thread => threadsMap.set(thread.id, thread));
      return { ...state, threads: threadsMap };
    
    case 'SET_CURRENT_THREAD':
      return { ...state, currentThreadId: action.payload };
    
    case 'ADD_THREAD':
      const newThreadsMap = new Map(state.threads);
      newThreadsMap.set(action.payload.id, action.payload);
      return { ...state, threads: newThreadsMap };
    
    case 'UPDATE_THREAD':
      const updatedThreadsMap = new Map(state.threads);
      const existingThread = updatedThreadsMap.get(action.payload.id);
      if (existingThread) {
        updatedThreadsMap.set(action.payload.id, { ...existingThread, ...action.payload.updates });
      }
      return { ...state, threads: updatedThreadsMap };
    
    case 'DELETE_THREAD':
      const filteredThreadsMap = new Map(state.threads);
      filteredThreadsMap.delete(action.payload);
      return { 
        ...state, 
        threads: filteredThreadsMap,
        currentThreadId: state.currentThreadId === action.payload ? null : state.currentThreadId,
      };
    
    case 'ADD_MESSAGE':
      const messageThreadsMap = new Map(state.threads);
      const thread = messageThreadsMap.get(action.payload.threadId);
      if (thread) {
        messageThreadsMap.set(action.payload.threadId, {
          ...thread,
          messages: [...thread.messages, action.payload.message],
          lastActivity: new Date(),
        });
      }
      return { ...state, threads: messageThreadsMap };
    
    default:
      return state;
  }
}

// Context
const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

interface AiAssistantContextProviderProps {
  children: ReactNode;
}

/**
 * AI Assistant Context Provider
 * 
 * Manages global state for the AI assistant including threads, current state,
 * and integration with Grafana's context system.
 */
export const AiAssistantContextProvider: React.FC<AiAssistantContextProviderProps> = ({ 
  children 
}) => {
  const { chrome } = useGrafana();
  const [state, dispatch] = useReducer(aiAssistantReducer, initialState);
  const [storedCurrentThread, setStoredCurrentThread] = useLocalStorage<string | null>(
    AI_ASSISTANT_STORAGE_KEYS.CURRENT_THREAD,
    null
  );
  const tools = getAiAssistantTools();

  // Get current Grafana context using hooks (called at top level)
  const chromeState = chrome.useState();
  const location = locationService.getLocation();
  const user = contextSrv.user;

  const getCurrentGrafanaContext = useCallback((): GrafanaContext => {
    return {
      user,
      path: location.pathname,
      query: location.search,
      dashboardId: extractDashboardId(location.pathname),
      timeRange: chromeState.timeRange,
    };
  }, [user, location.pathname, location.search, chromeState.timeRange]);

  // Load threads on mount
  useEffect(() => {
    const loadThreads = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        let threads: ThreadState[];
        
        if (shouldUseMockApi()) {
          // Load from localStorage for mock mode
          const stored = localStorage.getItem(AI_ASSISTANT_STORAGE_KEYS.THREADS);
          threads = stored ? JSON.parse(stored) : [];
        } else {
          const threadList = await getThreadList();
          // Convert LangGraph threads to our ThreadState format
          threads = threadList.map((thread: any) => ({
            id: thread.thread_id,
            name: thread.metadata?.threadTitle || 'New Chat',
            messages: [],
            lastActivity: new Date(thread.updated_at || thread.created_at),
            context: thread.metadata?.grafanaContext || getCurrentGrafanaContext(),
          }));
        }
        
        dispatch({ type: 'SET_THREADS', payload: threads });
        
        // Restore current thread if stored
        if (storedCurrentThread && threads.some(t => t.id === storedCurrentThread)) {
          dispatch({ type: 'SET_CURRENT_THREAD', payload: storedCurrentThread });
        }
      } catch (error) {
        console.error('Error loading threads:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversation history' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadThreads();
  }, [storedCurrentThread]);

  // Save threads to localStorage (for mock mode)
  useEffect(() => {
    if (shouldUseMockApi()) {
      const threadsArray = Array.from(state.threads.values());
      localStorage.setItem(AI_ASSISTANT_STORAGE_KEYS.THREADS, JSON.stringify(threadsArray));
    }
  }, [state.threads]);

  // Save current thread to localStorage
  useEffect(() => {
    setStoredCurrentThread(state.currentThreadId);
  }, [state.currentThreadId, setStoredCurrentThread]);

  // Actions
  const openSidebar = () => {
    dispatch({ type: 'OPEN_SIDEBAR' });
  };

  const closeSidebar = () => {
    dispatch({ type: 'CLOSE_SIDEBAR' });
  };

  const createThread = async (name?: string): Promise<string> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const context = getCurrentGrafanaContext();
      const response = shouldUseMockApi() 
        ? await mockApi.createThread()
        : await createNewThread(context);
      
      const newThread: ThreadState = {
        id: response.thread_id,
        name: name || `New Chat ${new Date().toLocaleString()}`,
        messages: [],
        lastActivity: new Date(),
        context,
      };
      
      dispatch({ type: 'ADD_THREAD', payload: newThread });
      dispatch({ type: 'SET_CURRENT_THREAD', payload: response.thread_id });
      
      return response.thread_id;
    } catch (error) {
      console.error('Error creating thread:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create new conversation' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const switchThread = (threadId: string) => {
    if (state.threads.has(threadId)) {
      dispatch({ type: 'SET_CURRENT_THREAD', payload: threadId });
    }
  };

  const deleteThreadById = async (threadId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      if (!shouldUseMockApi()) {
        await deleteThread(threadId);
      }
      
      dispatch({ type: 'DELETE_THREAD', payload: threadId });
    } catch (error) {
      console.error('Error deleting thread:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete conversation' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateThreadById = async (threadId: string, updates: Partial<ThreadState>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      if (!shouldUseMockApi()) {
        // If updating the name, use updateThreadTitle, otherwise use updateThread
        if (updates.name) {
          await updateThreadTitle(threadId, updates.name);
        }
        // For other metadata updates
        if (updates.context || Object.keys(updates).some(key => key !== 'name')) {
          const metadata = {
            ...(updates.name && { threadTitle: updates.name }),
            ...(updates.context && { grafanaContext: updates.context }),
          };
          await updateThread(threadId, metadata);
        }
      }
      
      dispatch({ type: 'UPDATE_THREAD', payload: { id: threadId, updates } });
    } catch (error) {
      console.error('Error updating thread:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update conversation' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendMessageToThread = async (message: string, threadId?: string) => {
    const activeThreadId = threadId || state.currentThreadId;
    
    if (!activeThreadId) {
      // Create new thread if none exists
      const newThreadId = await createThread();
      return sendMessageToThread(message, newThreadId);
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const context = getCurrentGrafanaContext();
      const userMessage = {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        content: message,
        timestamp: new Date(),
        context,
      };
      
      // Add user message
      dispatch({ type: 'ADD_MESSAGE', payload: { threadId: activeThreadId, message: userMessage } });
      
      // Send to AI
      const thread = state.threads.get(activeThreadId);
      if (thread) {
        const messages = [...thread.messages, userMessage];
        
        if (shouldUseMockApi()) {
          const generator = mockApi.sendMessage({ threadId: activeThreadId, messages, context, tools });
          for await (const response of generator) {
            dispatch({ type: 'ADD_MESSAGE', payload: { threadId: activeThreadId, message: response } });
          }
        } else {
          // Convert to LangChain format
          const langChainMessages = convertMessagesToLangChain(messages);
          
          // Send messages using LangGraph SDK
          const stream = await sendMessage({
            threadId: activeThreadId,
            messages: langChainMessages,
            context,
            tools,
          });

          // Stream responses
          for await (const chunk of stream) {
            if (chunk.event === 'messages' && chunk.data) {
              // Convert LangChain message back to AI Assistant format
              const message = chunk.data;
              if (message.type === 'ai') {
                const assistantMessage = {
                  id: message.id || `msg-${Date.now()}`,
                  role: 'assistant' as const,
                  content: typeof message.content === 'string' ? message.content : message.content?.[0]?.text || '',
                  timestamp: new Date(),
                  context,
                };
                dispatch({ type: 'ADD_MESSAGE', payload: { threadId: activeThreadId, message: assistantMessage } });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: AiAssistantContextValue = {
    state,
    actions: {
      openSidebar,
      closeSidebar,
      createThread,
      switchThread,
      deleteThread: deleteThreadById,
      updateThread: updateThreadById,
      sendMessage: sendMessageToThread,
      clearError,
    },
    tools,
  };

  return (
    <AiAssistantContext.Provider value={contextValue}>
      {children}
    </AiAssistantContext.Provider>
  );
};

/**
 * Hook to use AI Assistant context
 */
export const useAiAssistantContext = (): AiAssistantContextValue => {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error('useAiAssistantContext must be used within AiAssistantContextProvider');
  }
  return context;
};

/**
 * Extract dashboard ID from pathname
 */
function extractDashboardId(pathname: string): string | undefined {
  const dashboardMatch = pathname.match(/\/d\/([^\/]+)/);
  return dashboardMatch ? dashboardMatch[1] : undefined;
}

export default AiAssistantContextProvider;
