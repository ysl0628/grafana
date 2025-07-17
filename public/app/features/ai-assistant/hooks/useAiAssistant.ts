import { useCallback, useMemo } from 'react';

import { useAiAssistantContext } from '../providers/AiAssistantContextProvider';
import { AiAssistantHookResult } from '../types/aiAssistant';

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

  // Get active threads (non-archived)
  const threads = useMemo(() => {
    return Array.from(state.threads.values())
      .filter((t) => !state.archivedThreadIds.has(t.threadId))
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }, [state.threads, state.archivedThreadIds]);

  // Get archived threads
  const archivedThreads = useMemo(() => {
    return Array.from(state.threads.values())
      .filter((t) => state.archivedThreadIds.has(t.threadId))
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }, [state.threads, state.archivedThreadIds]);

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

  // Archive thread
  const archiveThread = useCallback(
    async (threadId: string) => {
      await actions.archiveThread(threadId);
    },
    [actions]
  );

  // Unarchive thread
  const unarchiveThread = useCallback(
    async (threadId: string) => {
      await actions.unarchiveThread(threadId);
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
    archivedThreads,
    isLoading: state.isLoading,
    error: state.error,
    switchThread,
    deleteThread,
    archiveThread,
    unarchiveThread,
    clearError,
  };
};

export default useAiAssistant;
