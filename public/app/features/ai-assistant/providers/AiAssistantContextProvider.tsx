import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useLocalStorage } from 'react-use';

import {
  deleteThread,
  updateThreadTitle,
  updateThread,
  sendMessage,
  getThreadList,
  shouldUseMockApi,
  convertMessagesToLangChain,
} from '../services/aiAssistantApi';
import { getAiAssistantTools } from '../services/aiAssistantTools';
import {
  AiAssistantState,
  AiAssistantContextValue,
  ThreadState,
  AI_ASSISTANT_STORAGE_KEYS,
} from '../types/aiAssistant';
import { getCurrentGrafanaContext } from '../utils/grafanaContext';

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
  | { type: 'ARCHIVE_THREAD'; payload: string }
  | { type: 'UNARCHIVE_THREAD'; payload: string }
  | { type: 'SET_ARCHIVED_IDS'; payload: Set<string> };

// Initial state
const initialState: AiAssistantState = {
  isOpen: false,
  currentThreadId: null,
  threads: new Map(),
  isLoading: false,
  error: null,
  archivedThreadIds: new Set(),
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
      action.payload.forEach((thread) => threadsMap.set(thread.threadId, thread));
      return { ...state, threads: threadsMap };

    case 'SET_CURRENT_THREAD':
      return { ...state, currentThreadId: action.payload };

    case 'ADD_THREAD':
      const newThreadsMap = new Map(state.threads);
      newThreadsMap.set(action.payload.threadId, action.payload);
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

    case 'ARCHIVE_THREAD':
      if (action.payload === 'default') return state;
      const newArchivedIds = new Set(state.archivedThreadIds).add(action.payload);
      return {
        ...state,
        archivedThreadIds: newArchivedIds,
        currentThreadId: state.currentThreadId === action.payload ? null : state.currentThreadId,
      };

    case 'UNARCHIVE_THREAD':
      const updatedArchivedIds = new Set(state.archivedThreadIds);
      updatedArchivedIds.delete(action.payload);
      return {
        ...state,
        archivedThreadIds: updatedArchivedIds,
      };

    case 'SET_ARCHIVED_IDS':
      return {
        ...state,
        archivedThreadIds: action.payload,
      };

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
export const AiAssistantContextProvider: React.FC<AiAssistantContextProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(aiAssistantReducer, initialState);
  const [storedCurrentThread, setStoredCurrentThread] = useLocalStorage<string | null>(
    AI_ASSISTANT_STORAGE_KEYS.CURRENT_THREAD,
    null
  );
  const tools = getAiAssistantTools();

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
            threadId: thread.thread_id,
            title: thread.metadata?.threadTitle || 'New Chat',
            messages: [],
            lastActivity: new Date(thread.updated_at || thread.created_at),
            context: thread.metadata?.grafanaContext || getCurrentGrafanaContext(),
          }));
        }

        // Add fake threads for UI testing if no threads exist
        if (threads.length === 0) {
          const currentContext = getCurrentGrafanaContext();
          const fakeThreads: ThreadState[] = [
            {
              threadId: 'thread-1',
              title: 'Dashboard Analysis',
              lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
              context: currentContext,
              messages: [
                {
                  id: 'msg-1-1',
                  role: 'user',
                  content: 'Can you help me analyze the performance of my dashboard?',
                  timestamp: new Date(Date.now() - 3600000),
                  context: currentContext,
                },
                {
                  id: 'msg-1-2',
                  role: 'assistant',
                  content:
                    "I'd be happy to help you analyze your dashboard performance. Let me gather some information about your dashboard first.",
                  timestamp: new Date(Date.now() - 3595000),
                  context: currentContext,
                  tools: [
                    {
                      id: 'tool-1-1',
                      name: 'getDashboardInfo',
                      parameters: { dashboardId: currentContext.dashboardId },
                    },
                  ],
                },
                {
                  id: 'msg-1-3',
                  role: 'tool',
                  content: 'Dashboard loaded successfully with 8 panels and 3 data sources.',
                  timestamp: new Date(Date.now() - 3590000),
                  context: currentContext,
                },
                {
                  id: 'msg-1-4',
                  role: 'assistant',
                  content:
                    'Your dashboard has 8 panels with 3 data sources. The overall performance looks good, but I notice some potential optimization opportunities in the query patterns.',
                  timestamp: new Date(Date.now() - 3585000),
                  context: currentContext,
                },
              ],
            },
          ];

          threads = fakeThreads;

          // Set up archived thread IDs for fake threads
          const initialArchivedIds = new Set<string>();
          initialArchivedIds.add('thread-4');
          initialArchivedIds.add('thread-5');
          dispatch({ type: 'SET_THREADS', payload: threads });
          // Set initial archived threads from fake data
          dispatch({ type: 'SET_ARCHIVED_IDS', payload: initialArchivedIds });
        } else {
          dispatch({ type: 'SET_THREADS', payload: threads });
        }

        // Restore current thread if stored
        if (storedCurrentThread && threads.some((t) => t.threadId === storedCurrentThread)) {
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
        if (updates.title) {
          await updateThreadTitle(threadId, updates.title);
        }
        // For other metadata updates
        if (updates.context || Object.keys(updates).some((key) => key !== 'title')) {
          const metadata = {
            ...(updates.title && { threadTitle: updates.title }),
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

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const archiveThread = async (threadId: string) => {
    if (threadId === 'default') return;

    dispatch({ type: 'ARCHIVE_THREAD', payload: threadId });

    // Switch to default thread if we archived the current thread
    if (state.currentThreadId === threadId) {
      dispatch({ type: 'SET_CURRENT_THREAD', payload: null });
    }
  };

  const unarchiveThread = async (threadId: string) => {
    dispatch({ type: 'UNARCHIVE_THREAD', payload: threadId });
  };

  // Helper functions to get filtered lists
  const getActiveThreads = () => {
    return Array.from(state.threads.values()).filter((t) => !state.archivedThreadIds.has(t.threadId));
  };

  const getArchivedThreads = () => {
    return Array.from(state.threads.values()).filter((t) => state.archivedThreadIds.has(t.threadId));
  };

  const contextValue: AiAssistantContextValue = {
    state,
    actions: {
      openSidebar,
      closeSidebar,
      switchThread,
      deleteThread: deleteThreadById,
      updateThread: updateThreadById,
      archiveThread,
      unarchiveThread,
      clearError,
    },
    tools,
    getActiveThreads,
    getArchivedThreads,
  };

  return <AiAssistantContext.Provider value={contextValue}>{children}</AiAssistantContext.Provider>;
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

export default AiAssistantContextProvider;
