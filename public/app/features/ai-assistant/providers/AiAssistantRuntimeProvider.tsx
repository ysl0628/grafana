import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useLangGraphRuntime } from '@assistant-ui/react-langgraph';
import React, { useRef, ReactNode, useCallback, useEffect } from 'react';

import { config, getBackendSrv, locationService } from '@grafana/runtime';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { contextSrv } from 'app/core/core';

import { createThread, sendMessage, getThreadState, switchToThread, createNewThread } from '../services/aiAssistantApi';
import { getAiAssistantTools } from '../services/aiAssistantTools';
import { GrafanaContext, AiAssistantMessage } from '../types/aiAssistant';

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
  const { chrome } = useGrafana();
  const threadIdRef = useRef<string | undefined>(undefined);
  const tools = getAiAssistantTools();

  // Get current Grafana context
  const getGrafanaContext = useCallback((): GrafanaContext => {
    const location = locationService.getLocation();
    const user = contextSrv.user;
    const chromeState = chrome.useState();

    return {
      user,
      path: location.pathname,
      query: location.search,
      dashboardId: extractDashboardId(location.pathname),
      timeRange: chromeState.timeRange,
    };
  }, [chrome]);

  // Enhanced message streaming with Grafana context
  const streamMessages = useCallback(
    async function* (messages: AiAssistantMessage[]) {
      try {
        // Ensure we have a thread ID
        if (!threadIdRef.current) {
          const response = await createThread();
          threadIdRef.current = response.thread_id;
        }

        const threadId = threadIdRef.current;
        const grafanaContext = getGrafanaContext();

        // Add Grafana context to messages
        const contextualMessages = messages.map((msg) => ({
          ...msg,
          context: grafanaContext,
        }));

        // Send messages with context
        const generator = sendMessage({
          threadId,
          messages: contextualMessages,
          context: grafanaContext,
          tools,
        });

        // Stream responses
        for await (const chunk of generator) {
          yield chunk;
        }
      } catch (error) {
        console.error('Error streaming messages:', error);
        throw error;
      }
    },
    [getGrafanaContext, tools]
  );

  // Thread switching handler
  const handleSwitchToThread = useCallback(async (externalId: string) => {
    try {
      const state = await getThreadState(externalId);
      threadIdRef.current = externalId;

      return {
        messages: state.values?.messages || [],
        interrupts: state.tasks?.[0]?.interrupts || [],
      };
    } catch (error) {
      console.error('Error switching to thread:', error);
      throw error;
    }
  }, []);

  // New thread creation handler
  const handleSwitchToNewThread = useCallback(async () => {
    try {
      const response = await createNewThread();
      threadIdRef.current = response.thread_id;
      return {
        messages: [],
        interrupts: [],
      };
    } catch (error) {
      console.error('Error creating new thread:', error);
      throw error;
    }
  }, []);

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
 * Extract dashboard ID from pathname
 */
const extractDashboardId = (pathname: string): string | undefined => {
  const dashboardMatch = pathname.match(/\/d\/([^\/]+)/);
  return dashboardMatch ? dashboardMatch[1] : undefined;
};

/**
 * Hook to get AI Assistant runtime context
 */
export const useAiAssistantRuntimeContext = () => {
  const { chrome } = useGrafana();
  const chromeState = chrome.useState();

  return {
    isEnabled: !!(config.featureToggles?.extensionSidebar && config.featureToggles?.aiAssistant !== false),
    user: contextSrv.user,
    location: locationService.getLocation(),
    timeRange: chromeState.timeRange,
    dashboardId: extractDashboardId(locationService.getLocation().pathname),
  };
};

/**
 * Development/Mock runtime provider
 *
 * For development purposes when LangGraph backend is not available.
 */
export const MockAiAssistantRuntimeProvider: React.FC<AiAssistantRuntimeProviderProps> = ({ children }) => {
  const mockRuntime = useMockRuntime();

  return <AssistantRuntimeProvider runtime={mockRuntime}>{children}</AssistantRuntimeProvider>;
};

/**
 * Mock runtime for development
 */
const useMockRuntime = () => {
  const streamMessages = useCallback(async function* (messages: AiAssistantMessage[]) {
    // Simulate streaming response
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockResponse = {
      id: 'mock-response',
      role: 'assistant' as const,
      content: 'This is a mock response for development. The AI assistant is working correctly!',
      timestamp: new Date(),
    };

    yield mockResponse;
  }, []);

  return {
    stream: streamMessages,
    onSwitchToThread: async () => ({ messages: [], interrupts: [] }),
    onSwitchToNewThread: async () => ({ messages: [], interrupts: [] }),
  };
};

export default AiAssistantRuntimeProvider;
