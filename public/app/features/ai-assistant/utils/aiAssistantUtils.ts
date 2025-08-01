import { format, formatDistanceToNow } from 'date-fns';

import { AiAssistantMessage, ThreadState } from '../types/aiAssistant';

/**
 * AI Assistant Utilities
 * 
 * Collection of utility functions for AI assistant functionality
 * including formatting, validation, and helper methods.
 */

/**
 * Format a date for display in thread history
 */
export function formatThreadDate(date: Date): string {
  const now = new Date();
  const timeDiff = now.getTime() - date.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else if (daysDiff === 1) {
    return 'Yesterday';
  } else if (daysDiff < 7) {
    return format(date, 'EEEE'); // Day of week
  } else {
    return format(date, 'MMM d'); // Month and day
  }
}

/**
 * Generate a thread preview from messages
 */
export function generateThreadPreview(messages: AiAssistantMessage[], maxLength = 60): string {
  if (messages.length === 0) {
    return 'No messages yet';
  }

  const lastMessage = messages[messages.length - 1];
  const content = lastMessage.content;
  
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength) + '...';
}

/**
 * Generate a thread name from messages
 */
export function generateThreadName(messages: AiAssistantMessage[]): string {
  if (messages.length === 0) {
    return 'New Chat';
  }

  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (!firstUserMessage) {
    return 'New Chat';
  }

  const content = firstUserMessage.content;
  const words = content.split(' ');
  
  if (words.length <= 5) {
    return content;
  }
  
  return words.slice(0, 5).join(' ') + '...';
}

/**
 * Validate message content
 */
export function validateMessage(content: string): { isValid: boolean; error?: string } {
  if (!content.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > 10000) {
    return { isValid: false, error: 'Message is too long (max 10,000 characters)' };
  }
  
  return { isValid: true };
}

/**
 * Validate thread name
 */
export function validateThreadName(name: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: 'Thread name cannot be empty' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Thread name is too long (max 100 characters)' };
  }
  
  return { isValid: true };
}

/**
 * Extract dashboard ID from various URL formats
 */
export function extractDashboardId(url: string): string | undefined {
  const patterns = [
    /\/d\/([^\/\?]+)/,           // /d/dashboard-uid
    /\/dashboard\/([^\/\?]+)/,   // /dashboard/dashboard-uid
    /dashboardUid=([^&]+)/,      // query parameter
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique thread ID
 */
export function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if URL is safe for navigation
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    
    // Only allow same origin or relative URLs
    return parsedUrl.origin === window.location.origin || url.startsWith('/');
  } catch {
    // If URL parsing fails, only allow relative URLs
    return url.startsWith('/');
  }
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Format message timestamp
 */
export function formatMessageTime(timestamp: Date): string {
  return format(timestamp, 'HH:mm');
}

/**
 * Format message date
 */
export function formatMessageDate(timestamp: Date): string {
  const now = new Date();
  const isToday = now.toDateString() === timestamp.toDateString();
  
  if (isToday) {
    return 'Today';
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === timestamp.toDateString();
  
  if (isYesterday) {
    return 'Yesterday';
  }
  
  return format(timestamp, 'MMM d, yyyy');
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(messages: AiAssistantMessage[]): Record<string, AiAssistantMessage[]> {
  const grouped: Record<string, AiAssistantMessage[]> = {};
  
  messages.forEach(message => {
    const date = formatMessageDate(message.timestamp);
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(message);
  });
  
  return grouped;
}

/**
 * Calculate thread statistics
 */
export function calculateThreadStats(thread: ThreadState) {
  const messageCount = thread.messages.length;
  const userMessageCount = thread.messages.filter(m => m.role === 'user').length;
  const assistantMessageCount = thread.messages.filter(m => m.role === 'assistant').length;
  const toolCallCount = thread.messages.reduce((count, msg) => count + (msg.tools?.length || 0), 0);
  
  const duration = thread.messages.length > 0 
    ? new Date(thread.lastActivity).getTime() - new Date(thread.messages[0].timestamp).getTime()
    : 0;
  
  return {
    messageCount,
    userMessageCount,
    assistantMessageCount,
    toolCallCount,
    duration,
  };
}

/**
 * Search messages within a thread
 */
export function searchMessages(messages: AiAssistantMessage[], query: string): AiAssistantMessage[] {
  if (!query.trim()) {
    return messages;
  }
  
  const lowerQuery = query.toLowerCase();
  return messages.filter(message => 
    message.content.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get message context for display
 */
export function getMessageContext(message: AiAssistantMessage): string {
  if (!message.context) {
    return '';
  }
  
  const context = message.context;
  const parts = [];
  
  if (context.dashboardId) {
    parts.push('Dashboard');
  }
  
  if (context.panelId) {
    parts.push('Panel');
  }
  
  if (context.datasourceUid) {
    parts.push('Datasource');
  }
  
  return parts.join(' • ');
}

/**
 * Export thread as JSON
 */
export function exportThreadAsJson(thread: ThreadState): string {
  const exportData = {
    id: thread.id,
    name: thread.name,
    created: thread.messages[0]?.timestamp || new Date(),
    lastActivity: thread.lastActivity,
    messageCount: thread.messages.length,
    messages: thread.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      context: msg.context,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export thread as text
 */
export function exportThreadAsText(thread: ThreadState): string {
  const lines = [
    `Thread: ${thread.name}`,
    `Created: ${formatMessageDate(thread.messages[0]?.timestamp || new Date())}`,
    `Messages: ${thread.messages.length}`,
    '',
    '--- Messages ---',
    '',
  ];
  
  thread.messages.forEach(message => {
    lines.push(`[${formatMessageTime(message.timestamp)}] ${message.role.toUpperCase()}: ${message.content}`);
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * Check if thread is empty
 */
export function isThreadEmpty(thread: ThreadState): boolean {
  return thread.messages.length === 0;
}

/**
 * Check if thread has errors
 */
export function hasThreadErrors(thread: ThreadState): boolean {
  return thread.messages.some(msg => msg.tools?.some(tool => tool.error));
}

/**
 * Get thread error count
 */
export function getThreadErrorCount(thread: ThreadState): number {
  return thread.messages.reduce((count, msg) => 
    count + (msg.tools?.filter(tool => tool.error).length || 0), 0
  );
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 Bytes';}
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate estimated reading time
 */
export function calculateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.split(' ').length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
        timeoutId = null;
      }, delay - (currentTime - lastExecTime));
    }
  };
}

export default {
  formatThreadDate,
  generateThreadPreview,
  generateThreadName,
  validateMessage,
  validateThreadName,
  extractDashboardId,
  generateMessageId,
  generateThreadId,
  isSafeUrl,
  sanitizeHtml,
  formatMessageTime,
  formatMessageDate,
  groupMessagesByDate,
  calculateThreadStats,
  searchMessages,
  getMessageContext,
  exportThreadAsJson,
  exportThreadAsText,
  isThreadEmpty,
  hasThreadErrors,
  getThreadErrorCount,
  formatBytes,
  calculateReadingTime,
  debounce,
  throttle,
};
