import { ComponentType } from 'react';

import { TimeRange, DataQuery } from '@grafana/data';
import { User } from 'app/types/user';

export interface AiAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tools?: ToolCall[];
  context?: GrafanaContext;
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
  id: string;
  name: string;
  messages: AiAssistantMessage[];
  lastActivity: Date;
  context: GrafanaContext;
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
}

export interface AiAssistantContextValue {
  state: AiAssistantState;
  actions: {
    openSidebar: () => void;
    closeSidebar: () => void;
    createThread: (name?: string) => string;
    switchThread: (threadId: string) => void;
    deleteThread: (threadId: string) => void;
    updateThread: (threadId: string, updates: Partial<ThreadState>) => void;
    sendMessage: (message: string, threadId?: string) => Promise<void>;
    clearError: () => void;
  };
  tools: AiAssistantTools;
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
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  createThread: (name?: string) => Promise<string>;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  clearError: () => void;
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
