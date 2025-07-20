import { AssistantRuntimeProvider } from '@assistant-ui/react';
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
        throw error;
      }
    },
    [tools]
  );

  // Thread switching handler
  const handleSwitchToThread = useCallback(async (externalId: string) => {
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
      throw error;
    }
  }, []);

  // New thread creation handler
  const handleSwitchToNewThread = async () => {
    const { thread_id } = await createThread();
    threadIdRef.current = thread_id;
  };

  // Custom event handler for Grafana-specific events
  const handleCustomEvent = useCallback((event: string, data: any) => {
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
      default:
        console.log('Unknown event:', event);
    }
  }, []);

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
