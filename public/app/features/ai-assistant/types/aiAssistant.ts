import { ComponentType } from 'react';

import { CurrentUserDTO, TimeRange } from '@grafana/data';
import { AtSelectionItem } from '../contexts/AtSelectionContext';

export interface DataQuery {
  refId: string;
  hide?: boolean;
  key?: string;
  queryType?: string;
  datasource?: any;
}

export interface User {
  isSignedIn: boolean;
  id: number;
  uid: string;
  login: string;
  email: string;
  name: string;
  externalUserId: string;
  theme: string;
  orgCount: number;
  orgId: number;
  orgName: string;
  orgRole: string;
  isGrafanaAdmin: boolean;
  gravatarUrl: string;
  timezone: string;
  weekStart: string;
  regionalFormat: string;
  language: string;
  helpFlags1: number;
  hasEditPermissionInFolders: boolean;
  permissions?: any;
  analytics: any;
  fiscalYearStartMonth: number;
  authenticatedBy: string;
}

export interface AiAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content:
    | Array<{
        type: 'text' | 'tool-call' | 'image';
        text?: string;
        toolCallId?: string;
        toolName?: string;
        args?: any;
        argsText?: string;
        image?: string;
      }>
    | string; // Allow string for backward compatibility
  timestamp: Date;
  createdAt?: string;
  tools?: ToolCall[];
  context?: GrafanaContext;
  userContext?: AtSelectionItem[]; // User context items when the message was sent
  // Tool message specific fields
  toolName?: string;
  toolCallId?: string;
  result?: any;
  isError?: boolean;
}

export interface GrafanaContext {
  dashboardId?: string;
  panelId?: string;
  datasourceUid?: string;
  timeRange?: TimeRange;
  user?: User;
  path?: string;
  query?: Record<string, any>;
}

export interface ThreadState {
  threadId: string;
  messages: AiAssistantMessage[];
  lastActivity: Date;
  archived?: boolean;
  title?: string;
  metadata: {
    user?: CurrentUserDTO;
    threadTitle?: string;
  };
}

export interface AiAssistantConfig {
  enabled: boolean;
  apiEndpoint: string;
  maxThreads: number;
  persistence: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  executionTime?: number;
}

export interface AiAssistantTools {
  getDashboardInfo: (context: GrafanaContext) => Promise<any>;
  queryData: (query: DataQuery, context: GrafanaContext) => Promise<any>;
  navigateToUrl: (url: string) => Promise<void>;
  getCurrentUser: () => Promise<User>;
  getTimeSeries: (query: DataQuery, context: GrafanaContext) => Promise<any>;
}

export interface AiAssistantState {
  isOpen: boolean;
  currentThreadId: string | null;
  threads: Map<string, ThreadState>;
  isLoading: boolean;
  error: string | null;
  archivedThreadIds: Set<string>;
}

export interface AiAssistantContextValue {
  state: AiAssistantState;
  actions: {
    openSidebar: () => void;
    closeSidebar: () => void;
    switchThread: (threadId: string) => void;
    deleteThread: (threadId: string) => void;
    updateThread: (threadId: string, updates: Partial<ThreadState>) => void;
    archiveThread: (threadId: string) => Promise<void>;
    unarchiveThread: (threadId: string) => Promise<void>;
    addThread: (thread: ThreadState) => void;
    clearError: () => void;
  };
  tools: AiAssistantTools;
  getActiveThreads: () => ThreadState[];
  getArchivedThreads: () => ThreadState[];
}

export interface AiAssistantComponentProps {
  className?: string;
  onClose?: () => void;
}

export interface AiAssistantExtensionConfig {
  id: string;
  title: string;
  description: string;
  component: ComponentType<AiAssistantComponentProps>;
  defaultWidth: number;
  minWidth: number;
  maxWidth: string | number;
}

export interface AiAssistantHookResult {
  isOpen: boolean;
  currentThread: ThreadState | null;
  threads: ThreadState[];
  archivedThreads: ThreadState[];
  isLoading: boolean;
  error: string | null;
  switchThread: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  archiveThread: (threadId: string) => Promise<void>;
  unarchiveThread: (threadId: string) => Promise<void>;
  clearError: () => void;
  onRename: (threadId: string, newTitle: string) => Promise<void>;
}

export interface ThreadManagementHookResult {
  threads: ThreadState[];
  currentThreadId: string | null;
  createThread: (name?: string) => string;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<ThreadState>) => void;
  getThread: (threadId: string) => ThreadState | null;
}

export interface AiAssistantToolsHookResult {
  tools: AiAssistantTools;
  executeToolCall: (toolCall: ToolCall) => Promise<any>;
  validatePermissions: (toolName: string) => boolean;
  availableTools?: string[];
}

// Local storage keys
export const AI_ASSISTANT_STORAGE_KEYS = {
  THREADS: 'grafana.ai-assistant.threads',
  CURRENT_THREAD: 'grafana.ai-assistant.currentThread',
  SIDEBAR_WIDTH: 'grafana.ai-assistant.sidebarWidth',
  PREFERENCES: 'grafana.ai-assistant.preferences',
} as const;

// Default values
export const AI_ASSISTANT_DEFAULTS = {
  SIDEBAR_WIDTH: 300,
  MIN_SIDEBAR_WIDTH: 100,
  MAX_SIDEBAR_WIDTH: '66vw',
  MAX_THREADS: 10,
  THREAD_NAME_MAX_LENGTH: 50,
} as const;

// Event types
export const AI_ASSISTANT_EVENTS = {
  SIDEBAR_OPENED: 'ai-assistant:sidebar:opened',
  SIDEBAR_CLOSED: 'ai-assistant:sidebar:closed',
  THREAD_CREATED: 'ai-assistant:thread:created',
  THREAD_SWITCHED: 'ai-assistant:thread:switched',
  MESSAGE_SENT: 'ai-assistant:message:sent',
  TOOL_CALLED: 'ai-assistant:tool:called',
} as const;

// Extension point configuration
export const AI_ASSISTANT_EXTENSION_POINT = {
  ID: 'ai-assistant',
  PLUGIN_ID: 'grafana-assistant-app',
  COMPONENT_TITLE: 'AI Assistant',
  DESCRIPTION: 'AI-powered assistant for Grafana',
} as const;

export interface LogData {
  metric?: Record<string, string>;
  labels?: Record<string, string>;
  line: string;
  timestamp: string;
  values?: any[];
}
