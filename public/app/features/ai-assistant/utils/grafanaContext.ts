import { locationService } from '@grafana/runtime';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { contextSrv } from 'app/core/core';
import { useCallback } from 'react';

import { GrafanaContext } from '../types/aiAssistant';

/**
 * Extract dashboard ID from pathname
 */
export const extractDashboardId = (pathname: string): string | undefined => {
  const dashboardMatch = pathname.match(/\/d\/([^\/]+)/);
  return dashboardMatch ? dashboardMatch[1] : undefined;
};

/**
 * Get current Grafana context without timeRange (safe for non-React contexts)
 */
export const getCurrentGrafanaContext = (): GrafanaContext => {
  const location = locationService.getLocation();
  const user = contextSrv.user;
  
  return {
    user,
    path: location.pathname,
    query: location.search,
    dashboardId: extractDashboardId(location.pathname),
    timeRange: undefined, // Will be set by hook if needed
  };
};

/**
 * Hook to get current Grafana context with timeRange
 * This should only be used inside React components
 */
export const useGrafanaContext = () => {
  const { chrome } = useGrafana();
  
  return useCallback((): GrafanaContext => {
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
};