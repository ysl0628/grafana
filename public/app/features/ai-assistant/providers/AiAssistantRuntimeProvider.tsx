import { AssistantRuntimeProvider, ThreadMessage } from '@assistant-ui/react';
import React, { useRef, ReactNode, useCallback, useEffect } from 'react';

import { LangChainMessage, useLangGraphRuntime } from './runtimes/langgraph';

import { config, locationService } from '@grafana/runtime';

import { createThread, sendMessage, getThreadState } from '../services/aiAssistantApi';
import { getAiAssistantTools } from '../services/aiAssistantTools';
import { useGrafanaContext } from '../utils/grafanaContext';

interface AiAssistantRuntimeProviderProps {
  children: ReactNode;
}

/**
 * AI Assistant Runtime Provider
 *
 * Provides the runtime environment for AI assistant conversations.
 * Integrates with LangGraph for backend connectivity and provides
 * Grafana-specific context and tools.
 */
export const AiAssistantRuntimeProvider: React.FC<AiAssistantRuntimeProviderProps> = ({ children }) => {
  const runtime = useAiAssistantRuntime();

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
};

/**
 * Custom hook for AI Assistant runtime
 *
 * Configures and provides the LangGraph runtime with Grafana integration.
 */
const useAiAssistantRuntime = () => {
  const threadIdRef = useRef<string | undefined>(undefined);
  const tools = getAiAssistantTools();
  // const getGrafanaContext = useGrafanaContext();

  // Enhanced message streaming with Grafana context
  const streamMessages = useCallback(
    async function* (messages: LangChainMessage[]) {
      try {
        // Ensure we have a thread ID
        if (!threadIdRef.current) {
          const response = await createThread();
          threadIdRef.current = response.thread_id;
        }

        const threadId = threadIdRef.current;
        // const grafanaContext = getGrafanaContext();

        // Convert to LangChain format
        // const langChainMessages = convertMessagesToLangChain(messages);

        // Send messages with context using LangGraph SDK
        const generator = sendMessage({
          threadId,
          messages: messages as unknown as LangChainMessage[],
        });

        yield* await generator;

        // Stream responses
        // for await (const chunk of stream) {
        //   if (chunk.event === 'messages' && chunk.data) {
        //     // Convert LangChain message back to AI Assistant format
        //     const message = chunk.data;
        //     if (message.type === 'ai') {
        //       yield {
        //         id: message.id || `msg-${Date.now()}`,
        //         role: 'assistant' as const,
        //         content: typeof message.content === 'string' ? message.content : message.content?.[0]?.text || '',
        //         timestamp: new Date(),
        //         context: grafanaContext,
        //       };
        //     }
        //   }
        // }
      } catch (error) {
        console.error('Error streaming messages:', error);
        return;
      }
    },
    [tools]
  );

  // Thread switching handler
  const handleSwitchToThread = async (externalId: string) => {
    try {
      const state = await getThreadState(externalId);
      threadIdRef.current = externalId;

      // Convert LangChain messages to AI Assistant format
      // const messages = (state.values?.messages || []).map((msg: any) => ({
      //   id: msg.id || `msg-${Date.now()}`,
      //   role: msg.type === 'human' ? 'user' : msg.type === 'ai' ? 'assistant' : 'system',
      //   content: typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || '',
      //   timestamp: new Date(),
      // }));

      // return {
      //   messages,
      //   interrupts: [], // LangGraph SDK doesn't expose interrupts in the same way
      return {
        messages: (state.values as { messages?: LangChainMessage[] }).messages ?? [],
        interrupts: state.tasks[0]?.interrupts ?? [],
      };
    } catch (error) {
      console.error('Error switching to thread:', error);

      // Return empty state to prevent UI crash
      return {
        messages: [],
        interrupts: [],
      };
    }
  };

  // New thread creation handler
  const handleSwitchToNewThread = async () => {
    const { thread_id } = await createThread();
    threadIdRef.current = thread_id;
  };

  // Error handler to display errors in thread
  const handleError = (error: unknown) => {
    console.error('AI Assistant error:', error);

    // Create an error message to display in the thread
    const errorMessage: ThreadMessage = {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: `❌ **Error**: ${error instanceof Error ? error.message : 'An unexpected error occurred while processing your request.'}\n\n${error instanceof Error ? `Details: ${error.stack}` : 'An unexpected error occurred while processing your request.'}`,
        },
      ],
      createdAt: new Date(),
      metadata: {
        unstable_state: {},
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      status: { type: 'incomplete', reason: 'error' },
    };

    // Add error message to current thread
    // Note: This would need to be integrated with the thread runtime
    // For now, we'll log it and could use notification system
    console.log('Error message for thread:', errorMessage);

    // Could also trigger a notification
    // notificationService.error(error.message);
  };

  // Info handler for informational messages
  const handleInfo = (data: unknown) => {
    console.log('AI Assistant info:', data);

    // Type guard to ensure we have the expected structure
    let info: { message: string; type?: 'info' | 'warning' | 'success' };

    if (typeof data === 'object' && data !== null && 'message' in data) {
      info = data as { message: string; type?: 'info' | 'warning' | 'success' };
    } else {
      // Fallback for unexpected data types
      info = {
        message: typeof data === 'string' ? data : 'Received informational message',
        type: 'info',
      };
    }

    // Create an info message to display in the thread
    const iconMap = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
    } as const;

    const infoType = info.type || 'info';
    const icon = iconMap[infoType];

    const infoMessage: ThreadMessage = {
      id: `info-${Date.now()}`,
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: `${icon} **${infoType.charAt(0).toUpperCase() + infoType.slice(1)}**: ${info.message}`,
        },
      ],
      status: { type: 'complete', reason: 'unknown' },
      createdAt: new Date(),
      metadata: {
        unstable_state: {},
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };

    console.log('Info message for thread:', infoMessage);
  };

  // Custom event handler for Grafana-specific events
  const handleCustomEvent = (event: string, data: any) => {
    console.log('AI Assistant event:', event, data);

    switch (event) {
      case 'dashboard:changed':
        // Update context when dashboard changes
        break;
      case 'tool:executed':
        // Handle tool execution results
        break;
      case 'user:context:changed':
        // Update context when user context changes
        break;
      case 'connection:lost':
        handleError(new Error('Connection to AI service lost. Please check your network connection.'));
        break;
      case 'api:rate_limit':
        handleInfo({
          message: 'Rate limit reached. Please wait a moment before sending another message.',
          type: 'warning',
        });
        break;
      default:
        console.log('Unknown event:', event);
    }
  };

  // Configure LangGraph runtime
  const runtime = useLangGraphRuntime({
    threadId: threadIdRef.current,
    autoCancelPendingToolCalls: true,
    unstable_allowCancellation: true,
    stream: streamMessages,
    onSwitchToThread: handleSwitchToThread,
    onSwitchToNewThread: handleSwitchToNewThread,
    eventHandlers: {
      onCustomEvent: handleCustomEvent,
      onError: handleError,
      onInfo: handleInfo,
    },
  });

  // Update runtime when Grafana context changes
  useEffect(() => {
    const unsubscribe = locationService.getLocationObservable().subscribe(() => {
      // Context has changed, runtime will use updated context on next message
    });

    return () => {
      unsubscribe.unsubscribe();
    };
  }, []);

  return runtime;
};

/**
 * Hook to get AI Assistant runtime context
 */
export const useAiAssistantRuntimeContext = () => {
  const getGrafanaContext = useGrafanaContext();
  const context = getGrafanaContext();

  return {
    isEnabled: !!(config.featureToggles?.extensionSidebar && config.featureToggles?.aiAssistant !== false),
    user: context.user,
    location: locationService.getLocation(),
    timeRange: context.timeRange,
    dashboardId: context.dashboardId,
  };
};

export default AiAssistantRuntimeProvider;
