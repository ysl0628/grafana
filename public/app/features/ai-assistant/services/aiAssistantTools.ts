import { TimeRange, dateTime } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { contextSrv } from '../../../core/core';

import { GrafanaContext, AiAssistantTools, ToolCall, DataQuery } from '../types/aiAssistant';

/**
 * AI Assistant Tools Service
 *
 * Provides AI assistant with tools to interact with Grafana APIs and functionality.
 * All tools include proper permission validation and error handling.
 */

/**
 * Get all available AI Assistant tools
 */
export function getAiAssistantTools(): AiAssistantTools {
  return {
    getDashboardInfo: (context: GrafanaContext) => getDashboardInfo(context),
    queryData: (query: DataQuery, context: GrafanaContext) => queryData(query, context),
    navigateToUrl: (url: string) => navigateToUrl(url),
    getCurrentUser: () => getCurrentUser(),
    getTimeSeries: (query: DataQuery, context: GrafanaContext) => getTimeSeries(query, context),
  };
}

/**
 * Get dashboard information
 */
export async function getDashboardInfo(context: GrafanaContext): Promise<any> {
  validatePermission('dashboard:read');

  if (!context.dashboardId) {
    throw new Error('No dashboard ID provided in context');
  }

  try {
    const response = await getBackendSrv().get(`/api/dashboards/uid/${context.dashboardId}`);

    return {
      uid: response.dashboard.uid,
      title: response.dashboard.title,
      tags: response.dashboard.tags,
      panels: response.dashboard.panels?.map((panel: any) => ({
        id: panel.id,
        title: panel.title,
        type: panel.type,
        targets: panel.targets,
      })),
      meta: response.meta,
      folderId: response.dashboard.folderId,
      folderTitle: response.dashboard.folderTitle,
      version: response.dashboard.version,
      created: response.dashboard.created,
      updated: response.dashboard.updated,
    };
  } catch (error: any) {
    console.error('Error fetching dashboard info:', error);
    throw new Error(`Failed to fetch dashboard information: ${error.message}`);
  }
}

/**
 * Execute a data query
 */
export async function queryData(query: DataQuery, context: GrafanaContext): Promise<any> {
  validatePermission('datasource:read');

  if (!query.datasource) {
    throw new Error('No datasource specified in query');
  }

  try {
    const requestData = {
      queries: [query],
      range: context.timeRange || getDefaultTimeRange(),
      scopedVars: {},
    };

    const response = await getBackendSrv().post('/api/ds/query', requestData);

    return response.results?.[query.refId!] || [];
  } catch (error: any) {
    console.error('Error executing query:', error);
    throw new Error(`Failed to execute query: ${error.message}`);
  }
}

/**
 * Navigate to a URL within Grafana
 */
export async function navigateToUrl(url: string): Promise<void> {
  if (!url) {
    throw new Error('URL is required');
  }

  // Validate URL is within Grafana domain for security
  if (!isValidGrafanaUrl(url)) {
    throw new Error('Invalid URL: Only Grafana URLs are allowed');
  }

  try {
    window.location.href = url;
  } catch (error: any) {
    console.error('Error navigating to URL:', error);
    throw new Error(`Failed to navigate to URL: ${error.message}`);
  }
}

/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<any> {
  try {
    const user = contextSrv.user;

    return {
      isSignedIn: user.isSignedIn,
      id: user.id,
      uid: user.uid,
      login: user.login,
      email: user.email,
      name: user.name,
      externalUserId: user.externalUserId,
      theme: user.theme,
      orgCount: user.orgCount,
      orgId: user.orgId,
      orgName: user.orgName,
      orgRole: user.orgRole,
      isGrafanaAdmin: user.isGrafanaAdmin,
      gravatarUrl: user.gravatarUrl,
      timezone: user.timezone,
      weekStart: user.weekStart,
      regionalFormat: user.regionalFormat,
      language: user.language,
      permissions: user.permissions,
    };
  } catch (error: any) {
    console.error('Error getting current user:', error);
    throw new Error(`Failed to get current user: ${error.message}`);
  }
}

/**
 * Get time series data
 */
export async function getTimeSeries(query: DataQuery, context: GrafanaContext): Promise<any> {
  validatePermission('datasource:read');

  try {
    const data = await queryData(query, context);

    // Transform data to time series format
    const timeSeries = data.map((series: any) => ({
      target: series.target,
      datapoints: series.datapoints,
      tags: series.tags,
    }));

    return timeSeries;
  } catch (error: any) {
    console.error('Error getting time series:', error);
    throw new Error(`Failed to get time series data: ${error.message}`);
  }
}

/**
 * Execute a tool call with proper error handling
 */
export async function executeToolCall(toolCall: ToolCall, context: GrafanaContext): Promise<any> {
  const tools = getAiAssistantTools();

  if (!tools[toolCall.name as keyof AiAssistantTools]) {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  try {
    const tool = tools[toolCall.name as keyof AiAssistantTools];
    let result;

    // Handle different tool signatures
    switch (toolCall.name) {
      case 'queryData':
      case 'getTimeSeries':
        result = await (tool as any)(toolCall.parameters.query, context);
        break;
      case 'navigateToUrl':
        result = await (tool as any)(toolCall.parameters.url);
        break;
      case 'getCurrentUser':
        result = await (tool as any)();
        break;
      case 'getDashboardInfo':
      default:
        result = await (tool as any)(context);
        break;
    }

    return {
      ...toolCall,
      result,
      error: null,
    };
  } catch (error: any) {
    console.error(`Error executing tool ${toolCall.name}:`, error);

    return {
      ...toolCall,
      result: null,
      error: error.message,
    };
  }
}

/**
 * Validate user permissions for a specific action
 */
function validatePermission(action: string): void {
  if (!contextSrv.hasPermission(action)) {
    throw new Error(`Insufficient permissions for action: ${action}`);
  }
}

/**
 * Validate if URL is within Grafana domain
 */
function isValidGrafanaUrl(url: string): boolean {
  // Allow relative URLs
  if (url.startsWith('/')) {
    return true;
  }

  // Allow URLs within the same origin
  try {
    const urlObj = new URL(url);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Get default time range
 */
function getDefaultTimeRange(): TimeRange {
  const now = dateTime();
  const oneHourAgo = dateTime().subtract(1, 'hour');

  return {
    from: oneHourAgo,
    to: now,
    raw: {
      from: 'now-1h',
      to: 'now',
    },
  };
}

/**
 * Get dashboard panels information
 */
export async function getDashboardPanels(context: GrafanaContext): Promise<any> {
  validatePermission('dashboard:read');

  const dashboardInfo = await getDashboardInfo(context);

  return dashboardInfo.panels || [];
}

/**
 * Get datasource information
 */
export async function getDatasourceInfo(datasourceUid: string): Promise<any> {
  validatePermission('datasource:read');

  try {
    const response = await getBackendSrv().get(`/api/datasources/uid/${datasourceUid}`);

    return {
      uid: response.uid,
      name: response.name,
      type: response.type,
      url: response.url,
      access: response.access,
      isDefault: response.isDefault,
      readOnly: response.readOnly,
    };
  } catch (error: any) {
    console.error('Error fetching datasource info:', error);
    throw new Error(`Failed to fetch datasource information: ${error.message}`);
  }
}

/**
 * Get current dashboard context
 */
export async function getCurrentDashboardContext(): Promise<GrafanaContext> {
  const user = contextSrv.user;

  return {
    user,
    path: window.location.pathname,
    query: Object.fromEntries(new URLSearchParams(window.location.search)),
    dashboardId: extractDashboardId(window.location.pathname),
  };
}

/**
 * Extract dashboard ID from pathname
 */
function extractDashboardId(pathname: string): string | undefined {
  const dashboardMatch = pathname.match(/\/d\/([^\/]+)/);
  return dashboardMatch ? dashboardMatch[1] : undefined;
}

/**
 * Check if user has permission to use AI Assistant tools
 */
export function canUseAiAssistantTools(): boolean {
  // Check if user has basic permissions
  return contextSrv.hasPermission('datasource:read') || contextSrv.hasPermission('dashboard:read');
}

/**
 * Get available tool names based on user permissions
 */
export function getAvailableToolNames(): string[] {
  const tools: string[] = [];

  if (contextSrv.hasPermission('dashboard:read')) {
    tools.push('getDashboardInfo', 'getDashboardPanels');
  }

  if (contextSrv.hasPermission('datasource:read')) {
    tools.push('queryData', 'getTimeSeries', 'getDatasourceInfo');
  }

  // Navigation is always available
  tools.push('navigateToUrl', 'getCurrentUser');

  return tools;
}

export default {
  getAiAssistantTools,
  executeToolCall,
  canUseAiAssistantTools,
  getAvailableToolNames,
};
