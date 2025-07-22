import { useCallback, useMemo, useState } from 'react';

import { useGrafana } from '../../../core/context/GrafanaContext';
import { contextSrv } from '../../../core/core';

import {
  getAiAssistantTools,
  executeToolCall,
  canUseAiAssistantTools,
  getAvailableToolNames,
} from '../services/aiAssistantTools';
import { AiAssistantToolsHookResult, ToolCall, GrafanaContext } from '../types/aiAssistant';

/**
 * Hook for AI Assistant tools functionality
 *
 * Provides access to AI assistant tools with proper permission validation
 * and context management for Grafana integration.
 */
export const useAiAssistantTools = (): AiAssistantToolsHookResult => {
  const { chrome } = useGrafana();
  const tools = useMemo(() => getAiAssistantTools(), []);
  console.log(chrome);

  // Get current Grafana context
  const getCurrentContext = useCallback((): GrafanaContext => {
    const user = contextSrv.user;

    return {
      user,
      path: window.location.pathname,
      query: new URLSearchParams(window.location.search).entries()
        ? Object.fromEntries(new URLSearchParams(window.location.search))
        : {},
      dashboardId: extractDashboardId(window.location.pathname),
    };
  }, []);

  // Execute tool call with context
  const executeToolWithContext = useCallback(
    async (toolCall: ToolCall): Promise<any> => {
      const context = getCurrentContext();
      return await executeToolCall(toolCall, context);
    },
    [getCurrentContext]
  );

  // Validate permissions for specific tool
  const validatePermissions = useCallback((toolName: string): boolean => {
    // Check global AI assistant permissions
    if (!canUseAiAssistantTools()) {
      return false;
    }

    // Check specific tool permissions
    switch (toolName) {
      case 'getDashboardInfo':
      case 'getDashboardPanels':
        return contextSrv.hasPermission('dashboard:read');

      case 'queryData':
      case 'getTimeSeries':
      case 'getDatasourceInfo':
        return contextSrv.hasPermission('datasource:read');

      case 'navigateToUrl':
      case 'getCurrentUser':
        return true; // These are always available

      default:
        return false;
    }
  }, []);

  // Get available tools based on permissions
  const availableTools = useMemo(() => {
    return getAvailableToolNames().filter((toolName) => validatePermissions(toolName));
  }, [validatePermissions]);

  return {
    tools,
    executeToolCall: executeToolWithContext,
    validatePermissions,
  };
};

/**
 * Hook for dashboard-specific tools
 */
export const useDashboardTools = () => {
  const { executeToolCall, validatePermissions } = useAiAssistantTools();

  // Get dashboard information
  const getDashboardInfo = useCallback(
    async (dashboardId?: string) => {
      if (!validatePermissions('getDashboardInfo')) {
        throw new Error('Insufficient permissions to access dashboard information');
      }

      const toolCall: ToolCall = {
        id: `dashboard-info-${Date.now()}`,
        name: 'getDashboardInfo',
        parameters: { dashboardId },
      };

      return await executeToolCall(toolCall);
    },
    [executeToolCall, validatePermissions]
  );

  // Get dashboard panels
  const getDashboardPanels = useCallback(
    async (dashboardId?: string) => {
      if (!validatePermissions('getDashboardPanels')) {
        throw new Error('Insufficient permissions to access dashboard panels');
      }

      const toolCall: ToolCall = {
        id: `dashboard-panels-${Date.now()}`,
        name: 'getDashboardPanels',
        parameters: { dashboardId },
      };

      return await executeToolCall(toolCall);
    },
    [executeToolCall, validatePermissions]
  );

  // Check if dashboard tools are available
  const canUseDashboardTools = useMemo(() => {
    return validatePermissions('getDashboardInfo');
  }, [validatePermissions]);

  return {
    getDashboardInfo,
    getDashboardPanels,
    canUseDashboardTools,
  };
};

/**
 * Hook for data query tools
 */
export const useDataQueryTools = () => {
  const { executeToolCall, validatePermissions } = useAiAssistantTools();

  // Execute data query
  const queryData = useCallback(
    async (query: any) => {
      if (!validatePermissions('queryData')) {
        throw new Error('Insufficient permissions to query data');
      }

      const toolCall: ToolCall = {
        id: `query-data-${Date.now()}`,
        name: 'queryData',
        parameters: { query },
      };

      return await executeToolCall(toolCall);
    },
    [executeToolCall, validatePermissions]
  );

  // Get time series data
  const getTimeSeries = useCallback(
    async (query: any) => {
      if (!validatePermissions('getTimeSeries')) {
        throw new Error('Insufficient permissions to get time series data');
      }

      const toolCall: ToolCall = {
        id: `time-series-${Date.now()}`,
        name: 'getTimeSeries',
        parameters: { query },
      };

      return await executeToolCall(toolCall);
    },
    [executeToolCall, validatePermissions]
  );

  // Get datasource information
  const getDatasourceInfo = useCallback(
    async (datasourceUid: string) => {
      if (!validatePermissions('getDatasourceInfo')) {
        throw new Error('Insufficient permissions to access datasource information');
      }

      const toolCall: ToolCall = {
        id: `datasource-info-${Date.now()}`,
        name: 'getDatasourceInfo',
        parameters: { datasourceUid },
      };

      return await executeToolCall(toolCall);
    },
    [executeToolCall, validatePermissions]
  );

  // Check if data query tools are available
  const canUseDataQueryTools = useMemo(() => {
    return validatePermissions('queryData');
  }, [validatePermissions]);

  return {
    queryData,
    getTimeSeries,
    getDatasourceInfo,
    canUseDataQueryTools,
  };
};

/**
 * Hook for navigation tools
 */
export const useNavigationTools = () => {
  const { executeToolCall } = useAiAssistantTools();

  // Navigate to URL
  const navigateToUrl = useCallback(
    async (url: string) => {
      const toolCall: ToolCall = {
        id: `navigate-${Date.now()}`,
        name: 'navigateToUrl',
        parameters: { url },
      };

      return await executeToolCall(toolCall);
    },
    [executeToolCall]
  );

  // Navigate to dashboard
  const navigateToDashboard = useCallback(
    async (dashboardUid: string) => {
      const url = `/d/${dashboardUid}`;
      return await navigateToUrl(url);
    },
    [navigateToUrl]
  );

  // Navigate to explore
  const navigateToExplore = useCallback(
    async (datasourceUid?: string) => {
      const url = datasourceUid ? `/explore?datasource=${datasourceUid}` : '/explore';
      return await navigateToUrl(url);
    },
    [navigateToUrl]
  );

  // Navigate to alerting
  const navigateToAlerting = useCallback(async () => {
    return await navigateToUrl('/alerting');
  }, [navigateToUrl]);

  return {
    navigateToUrl,
    navigateToDashboard,
    navigateToExplore,
    navigateToAlerting,
  };
};

/**
 * Hook for user context tools
 */
export const useUserContextTools = () => {
  const { executeToolCall } = useAiAssistantTools();

  // Get current user information
  const getCurrentUser = useCallback(async () => {
    const toolCall: ToolCall = {
      id: `current-user-${Date.now()}`,
      name: 'getCurrentUser',
      parameters: {},
    };

    return await executeToolCall(toolCall);
  }, [executeToolCall]);

  return {
    getCurrentUser,
  };
};

/**
 * Hook for tool execution monitoring
 */
export const useToolExecutionMonitoring = () => {
  const [executionHistory, setExecutionHistory] = useState<ToolCall[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { executeToolCall } = useAiAssistantTools();

  const executeWithMonitoring = useCallback(
    async (toolCall: ToolCall, context: GrafanaContext) => {
      setIsExecuting(true);
      const startTime = Date.now();

      try {
        const result = await executeToolCall(toolCall);
        const endTime = Date.now();

        const completedToolCall: ToolCall = {
          ...toolCall,
          result,
          executionTime: endTime - startTime,
        };

        setExecutionHistory((prev) => [completedToolCall, ...prev.slice(0, 99)]); // Keep last 100
        return result;
      } catch (error: any) {
        const endTime = Date.now();

        const failedToolCall: ToolCall = {
          ...toolCall,
          error: error.message,
          executionTime: endTime - startTime,
        };

        setExecutionHistory((prev) => [failedToolCall, ...prev.slice(0, 99)]);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [executeToolCall]
  );

  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  return {
    executeWithMonitoring,
    executionHistory,
    isExecuting,
    clearHistory,
  };
};

/**
 * Extract dashboard ID from pathname
 */
function extractDashboardId(pathname: string): string | undefined {
  const dashboardMatch = pathname.match(/\/d\/([^\/]+)/);
  return dashboardMatch ? dashboardMatch[1] : undefined;
}

export default useAiAssistantTools;
