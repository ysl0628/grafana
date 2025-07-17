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

export default useAiAssistant;