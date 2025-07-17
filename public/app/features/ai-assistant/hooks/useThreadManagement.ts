import { useCallback, useMemo } from 'react';

import { useAiAssistantContext } from '../providers/AiAssistantContextProvider';
import { ThreadManagementHookResult, ThreadState } from '../types/aiAssistant';

/**
 * Hook for AI Assistant thread management
 * 
 * Provides comprehensive thread management functionality including
 * creation, deletion, updating, and navigation between threads.
 */
export const useThreadManagement = (): ThreadManagementHookResult => {
  const { state, actions } = useAiAssistantContext();

  // Get all threads sorted by last activity
  const threads = useMemo(() => {
    return Array.from(state.threads.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }, [state.threads]);

  // Get current thread ID
  const currentThreadId = useMemo(() => {
    return state.currentThreadId;
  }, [state.currentThreadId]);

  // Create new thread
  const createThread = useCallback(async (name?: string): Promise<string> => {
    try {
      const threadId = await actions.createThread(name);
      return threadId;
    } catch (error) {
      console.error('Failed to create thread:', error);
      throw error;
    }
  }, [actions]);

  // Switch to thread
  const switchThread = useCallback((threadId: string) => {
    if (state.threads.has(threadId)) {
      actions.switchThread(threadId);
    } else {
      console.warn(`Thread with ID ${threadId} not found`);
    }
  }, [actions, state.threads]);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      await actions.deleteThread(threadId);
    } catch (error) {
      console.error('Failed to delete thread:', error);
      throw error;
    }
  }, [actions]);

  // Update thread
  const updateThread = useCallback(async (threadId: string, updates: Partial<ThreadState>) => {
    try {
      await actions.updateThread(threadId, updates);
    } catch (error) {
      console.error('Failed to update thread:', error);
      throw error;
    }
  }, [actions]);

  // Get thread by ID
  const getThread = useCallback((threadId: string): ThreadState | null => {
    return state.threads.get(threadId) || null;
  }, [state.threads]);

  return {
    threads,
    currentThreadId,
    createThread,
    switchThread,
    deleteThread,
    updateThread,
    getThread,
  };
};

/**
 * Hook for managing thread selection and navigation
 */
export const useThreadNavigation = () => {
  const { state, actions } = useAiAssistantContext();

  // Get current thread
  const currentThread = useMemo(() => {
    if (!state.currentThreadId) {return null;}
    return state.threads.get(state.currentThreadId) || null;
  }, [state.currentThreadId, state.threads]);

  // Get thread list for navigation
  const threadList = useMemo(() => {
    return Array.from(state.threads.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }, [state.threads]);

  // Get current thread index
  const currentThreadIndex = useMemo(() => {
    if (!state.currentThreadId) {return -1;}
    return threadList.findIndex(thread => thread.id === state.currentThreadId);
  }, [state.currentThreadId, threadList]);

  // Navigate to previous thread
  const goToPreviousThread = useCallback(() => {
    if (currentThreadIndex > 0) {
      const previousThread = threadList[currentThreadIndex - 1];
      actions.switchThread(previousThread.id);
    }
  }, [currentThreadIndex, threadList, actions]);

  // Navigate to next thread
  const goToNextThread = useCallback(() => {
    if (currentThreadIndex < threadList.length - 1) {
      const nextThread = threadList[currentThreadIndex + 1];
      actions.switchThread(nextThread.id);
    }
  }, [currentThreadIndex, threadList, actions]);

  // Check if navigation is possible
  const canGoToPrevious = useMemo(() => {
    return currentThreadIndex > 0;
  }, [currentThreadIndex]);

  const canGoToNext = useMemo(() => {
    return currentThreadIndex < threadList.length - 1;
  }, [currentThreadIndex, threadList.length]);

  return {
    currentThread,
    threadList,
    currentThreadIndex,
    goToPreviousThread,
    goToNextThread,
    canGoToPrevious,
    canGoToNext,
    totalThreads: threadList.length,
  };
};

/**
 * Hook for thread search and filtering
 */
export const useThreadSearch = () => {
  const { state } = useAiAssistantContext();

  // Search threads by name or content
  const searchThreads = useCallback((query: string) => {
    if (!query.trim()) {
      return Array.from(state.threads.values());
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(state.threads.values()).filter(thread => 
      thread.name.toLowerCase().includes(lowerQuery) ||
      thread.messages.some(message => 
        message.content.toLowerCase().includes(lowerQuery)
      )
    );
  }, [state.threads]);

  // Filter threads by date range
  const filterThreadsByDate = useCallback((startDate: Date, endDate: Date) => {
    return Array.from(state.threads.values()).filter(thread => {
      const threadDate = new Date(thread.lastActivity);
      return threadDate >= startDate && threadDate <= endDate;
    });
  }, [state.threads]);

  // Filter threads by message count
  const filterThreadsByMessageCount = useCallback((minCount: number, maxCount?: number) => {
    return Array.from(state.threads.values()).filter(thread => {
      const messageCount = thread.messages.length;
      return messageCount >= minCount && (maxCount === undefined || messageCount <= maxCount);
    });
  }, [state.threads]);

  // Get thread statistics
  const getThreadStatistics = useCallback(() => {
    const threads = Array.from(state.threads.values());
    const totalThreads = threads.length;
    const totalMessages = threads.reduce((sum, thread) => sum + thread.messages.length, 0);
    const averageMessages = totalThreads > 0 ? totalMessages / totalThreads : 0;
    
    const oldestThread = threads.reduce((oldest, thread) => 
      new Date(thread.lastActivity) < new Date(oldest.lastActivity) ? thread : oldest
    );
    
    const newestThread = threads.reduce((newest, thread) => 
      new Date(thread.lastActivity) > new Date(newest.lastActivity) ? thread : newest
    );

    return {
      totalThreads,
      totalMessages,
      averageMessages,
      oldestThread,
      newestThread,
    };
  }, [state.threads]);

  return {
    searchThreads,
    filterThreadsByDate,
    filterThreadsByMessageCount,
    getThreadStatistics,
  };
};

/**
 * Hook for bulk thread operations
 */
export const useBulkThreadOperations = () => {
  const { actions } = useAiAssistantContext();

  // Delete multiple threads
  const deleteMultipleThreads = useCallback(async (threadIds: string[]) => {
    const results = await Promise.allSettled(
      threadIds.map(id => actions.deleteThread(id))
    );
    
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);
    
    if (errors.length > 0) {
      console.error('Some threads failed to delete:', errors);
      throw new Error(`Failed to delete ${errors.length} threads`);
    }
  }, [actions]);

  // Update multiple threads
  const updateMultipleThreads = useCallback(async (
    updates: Array<{ threadId: string; updates: Partial<ThreadState> }>
  ) => {
    const results = await Promise.allSettled(
      updates.map(({ threadId, updates }) => actions.updateThread(threadId, updates))
    );
    
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);
    
    if (errors.length > 0) {
      console.error('Some threads failed to update:', errors);
      throw new Error(`Failed to update ${errors.length} threads`);
    }
  }, [actions]);

  // Archive multiple threads (add archived flag)
  const archiveMultipleThreads = useCallback(async (threadIds: string[]) => {
    const updates = threadIds.map(threadId => ({
      threadId,
      updates: { archived: true } as Partial<ThreadState>,
    }));
    
    await updateMultipleThreads(updates);
  }, [updateMultipleThreads]);

  return {
    deleteMultipleThreads,
    updateMultipleThreads,
    archiveMultipleThreads,
  };
};

export default useThreadManagement;
