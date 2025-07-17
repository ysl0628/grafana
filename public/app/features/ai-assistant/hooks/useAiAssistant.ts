import { useCallback, useMemo } from 'react';

import { useAiAssistantContext } from '../providers/AiAssistantContextProvider';
import { AiAssistantHookResult, ThreadState } from '../types/aiAssistant';

/**
 * Main hook for AI Assistant functionality
 *
 * Provides a simplified interface for components to interact with the AI assistant,
 * including state management, messaging, and thread operations.
 */
export const useAiAssistant = (): AiAssistantHookResult => {
  const { state, actions } = useAiAssistantContext();

  // Get current thread
  const currentThread = useMemo(() => {
    if (!state.currentThreadId) {
      return null;
    }
    return state.threads.get(state.currentThreadId) || null;
  }, [state.currentThreadId, state.threads]);

  // Get threads as array
  const threads = useMemo(() => {
    return Array.from(state.threads.values()).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }, [state.threads]);

  // Send message to current thread
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      await actions.sendMessage(message, state.currentThreadId || undefined);
    },
    [actions, state.currentThreadId]
  );

  // Create new thread
  const createThread = useCallback(
    async (name?: string): Promise<string> => {
      return await actions.createThread(name);
    },
    [actions]
  );

  // Switch to thread
  const switchThread = useCallback(
    (threadId: string) => {
      actions.switchThread(threadId);
    },
    [actions]
  );

  // Delete thread
  const deleteThread = useCallback(
    async (threadId: string) => {
      await actions.deleteThread(threadId);
    },
    [actions]
  );

  // Clear error
  const clearError = useCallback(() => {
    actions.clearError();
  }, [actions]);

  return {
    isOpen: state.isOpen,
    currentThread,
    threads,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    createThread,
    switchThread,
    deleteThread,
    clearError,
  };
};

/**
 * Hook for AI Assistant sidebar state
 *
 * Provides specific functionality for managing the sidebar open/close state.
 */
export const useAiAssistantSidebar = () => {
  const { state, actions } = useAiAssistantContext();

  const open = useCallback(() => {
    actions.openSidebar();
  }, [actions]);

  const close = useCallback(() => {
    actions.closeSidebar();
  }, [actions]);

  const toggle = useCallback(() => {
    if (state.isOpen) {
      actions.closeSidebar();
    } else {
      actions.openSidebar();
    }
  }, [state.isOpen, actions]);

  return {
    isOpen: state.isOpen,
    open,
    close,
    toggle,
  };
};

/**
 * Hook for getting AI Assistant status
 *
 * Provides information about the AI assistant's current state and capabilities.
 */
export const useAiAssistantStatus = () => {
  const { state, tools } = useAiAssistantContext();

  const hasActiveThread = useMemo(() => {
    return state.currentThreadId !== null;
  }, [state.currentThreadId]);

  const threadCount = useMemo(() => {
    return state.threads.size;
  }, [state.threads]);

  const hasError = useMemo(() => {
    return state.error !== null;
  }, [state.error]);

  const isReady = useMemo(() => {
    return !state.isLoading && !hasError;
  }, [state.isLoading, hasError]);

  const availableTools = useMemo(() => {
    return Object.keys(tools);
  }, [tools]);

  return {
    isReady,
    isLoading: state.isLoading,
    hasError,
    error: state.error,
    hasActiveThread,
    threadCount,
    availableTools,
  };
};

/**
 * Hook for AI Assistant messaging
 *
 * Provides messaging functionality with additional features like typing indicators.
 */
export const useAiAssistantMessaging = () => {
  const { state, actions } = useAiAssistantContext();

  const sendMessage = useCallback(
    async (message: string, threadId?: string) => {
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      await actions.sendMessage(message, threadId);
    },
    [actions]
  );

  const canSendMessage = useMemo(() => {
    return !state.isLoading && state.error === null;
  }, [state.isLoading, state.error]);

  const isTyping = useMemo(() => {
    return state.isLoading;
  }, [state.isLoading]);

  return {
    sendMessage,
    canSendMessage,
    isTyping,
    isLoading: state.isLoading,
    error: state.error,
  };
};

/**
 * Hook for AI Assistant thread operations
 *
 * Provides comprehensive thread management functionality.
 */
export const useAiAssistantThreads = () => {
  const { state, actions } = useAiAssistantContext();

  // Get all threads sorted by last activity
  const threads = useMemo(() => {
    return Array.from(state.threads.values()).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }, [state.threads]);

  // Get current thread
  const currentThread = useMemo(() => {
    if (!state.currentThreadId) {
      return null;
    }
    return state.threads.get(state.currentThreadId) || null;
  }, [state.currentThreadId, state.threads]);

  // Create new thread
  const createThread = useCallback(
    async (name?: string): Promise<string> => {
      return await actions.createThread(name);
    },
    [actions]
  );

  // Switch to thread
  const switchThread = useCallback(
    (threadId: string) => {
      actions.switchThread(threadId);
    },
    [actions]
  );

  // Delete thread
  const deleteThread = useCallback(
    async (threadId: string) => {
      await actions.deleteThread(threadId);
    },
    [actions]
  );

  // Update thread
  const updateThread = useCallback(
    async (threadId: string, updates: Partial<ThreadState>) => {
      await actions.updateThread(threadId, updates);
    },
    [actions]
  );

  // Get thread by ID
  const getThread = useCallback(
    (threadId: string): ThreadState | null => {
      return state.threads.get(threadId) || null;
    },
    [state.threads]
  );

  // Check if thread exists
  const hasThread = useCallback(
    (threadId: string): boolean => {
      return state.threads.has(threadId);
    },
    [state.threads]
  );

  return {
    threads,
    currentThread,
    currentThreadId: state.currentThreadId,
    createThread,
    switchThread,
    deleteThread,
    updateThread,
    getThread,
    hasThread,
    threadCount: state.threads.size,
    isLoading: state.isLoading,
    error: state.error,
  };
};

export default useAiAssistant;
