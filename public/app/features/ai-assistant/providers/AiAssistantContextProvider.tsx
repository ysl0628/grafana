import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useLocalStorage } from 'react-use';

import { deleteThread, updateThreadTitle, updateThread, getThreadList } from '../services/aiAssistantApi';
import { getAiAssistantTools } from '../services/aiAssistantTools';
import {
  AiAssistantState,
  AiAssistantContextValue,
  ThreadState,
  AI_ASSISTANT_STORAGE_KEYS,
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
        currentThreadId:
          state.currentThreadId === action.payload
            ? state.threads.values()?.next().value?.threadId || null
            : state.currentThreadId,
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
        const threadList = await getThreadList();
        // Convert LangGraph threads to our ThreadState format
        const threads: ThreadState[] = threadList.map((thread: any) => ({
          threadId: thread.thread_id,
          title: thread.metadata?.threadTitle || 'New Chat',
          messages: [],
          lastActivity: new Date(thread.updated_at || thread.created_at),
          context: thread.metadata?.grafanaContext || {},
          metadata: thread.metadata,
        }));
        dispatch({ type: 'SET_THREADS', payload: threads });

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
      await deleteThread(threadId);

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
      // If updating the name, use updateThreadTitle, otherwise use updateThread
      if (updates.title) {
        await updateThreadTitle(threadId, updates.title);
      }
      // For other metadata updates
      if (updates.metadata || Object.keys(updates).some((key) => key !== 'title')) {
        const metadata = {
          ...(updates.title && { threadTitle: updates.title }),
        };
        await updateThread(threadId, metadata);
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

  const addThread = (thread: ThreadState) => {
    dispatch({ type: 'ADD_THREAD', payload: thread });
    dispatch({ type: 'SET_CURRENT_THREAD', payload: thread.threadId });
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
      addThread,
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
