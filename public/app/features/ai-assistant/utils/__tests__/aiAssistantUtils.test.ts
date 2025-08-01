import { AiAssistantMessage, ThreadState } from '../../types/aiAssistant';
import {
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
  isThreadEmpty,
  formatBytes,
  calculateReadingTime,
} from '../aiAssistantUtils';

describe('aiAssistantUtils', () => {
  describe('formatThreadDate', () => {
    it('formats recent dates as relative time', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const result = formatThreadDate(oneHourAgo);
      expect(result).toContain('ago');
    });

    it('formats yesterday as "Yesterday"', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = formatThreadDate(yesterday);
      expect(result).toBe('Yesterday');
    });

    it('formats dates within a week as day of week', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const result = formatThreadDate(threeDaysAgo);
      expect(result).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/);
    });

    it('formats older dates as month and day', () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const result = formatThreadDate(oneMonthAgo);
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });
  });

  describe('generateThreadPreview', () => {
    it('returns "No messages yet" for empty messages', () => {
      const result = generateThreadPreview([]);
      expect(result).toBe('No messages yet');
    });

    it('returns full content if within max length', () => {
      const messages: AiAssistantMessage[] = [{
        id: '1',
        role: 'user',
        content: 'Short message',
        timestamp: new Date(),
      }];
      
      const result = generateThreadPreview(messages);
      expect(result).toBe('Short message');
    });

    it('truncates long content with ellipsis', () => {
      const longContent = 'This is a very long message that exceeds the maximum length';
      const messages: AiAssistantMessage[] = [{
        id: '1',
        role: 'user',
        content: longContent,
        timestamp: new Date(),
      }];
      
      const result = generateThreadPreview(messages, 20);
      expect(result).toBe('This is a very long ...');
    });

    it('uses last message for preview', () => {
      const messages: AiAssistantMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'First message',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Last message',
          timestamp: new Date(),
        },
      ];
      
      const result = generateThreadPreview(messages);
      expect(result).toBe('Last message');
    });
  });

  describe('validateMessage', () => {
    it('returns invalid for empty message', () => {
      const result = validateMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('returns invalid for whitespace-only message', () => {
      const result = validateMessage('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('returns invalid for message that is too long', () => {
      const longMessage = 'a'.repeat(10001);
      const result = validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message is too long (max 10,000 characters)');
    });

    it('returns valid for normal message', () => {
      const result = validateMessage('Hello, this is a valid message');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('extractDashboardId', () => {
    it('extracts from /d/ URL format', () => {
      const result = extractDashboardId('/d/dashboard-uid-123/dashboard-name');
      expect(result).toBe('dashboard-uid-123');
    });

    it('extracts from /dashboard/ URL format', () => {
      const result = extractDashboardId('/dashboard/dashboard-uid-456');
      expect(result).toBe('dashboard-uid-456');
    });

    it('extracts from query parameter', () => {
      const result = extractDashboardId('/some/path?dashboardUid=query-uid-789&other=param');
      expect(result).toBe('query-uid-789');
    });

    it('returns undefined for URLs without dashboard ID', () => {
      const result = extractDashboardId('/some/other/path');
      expect(result).toBeUndefined();
    });
  });

  describe('generateMessageId', () => {
    it('generates unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });
  });

  describe('isSafeUrl', () => {
    // Mock window.location
    const originalLocation = window.location;
    
    beforeAll(() => {
      delete (window as any).location;
      window.location = { origin: 'https://grafana.example.com' } as any;
    });
    
    afterAll(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('allows relative URLs', () => {
      expect(isSafeUrl('/dashboard/123')).toBe(true);
      expect(isSafeUrl('/explore')).toBe(true);
    });

    it('allows same origin URLs', () => {
      expect(isSafeUrl('https://grafana.example.com/dashboard')).toBe(true);
    });

    it('blocks different origin URLs', () => {
      expect(isSafeUrl('https://evil.com/malicious')).toBe(false);
    });

    it('blocks malformed URLs and allows only relative', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
      expect(isSafeUrl('/relative-path')).toBe(true);
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes HTML tags', () => {
      const result = sanitizeHtml('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('preserves plain text', () => {
      const result = sanitizeHtml('Plain text message');
      expect(result).toBe('Plain text message');
    });
  });

  describe('calculateThreadStats', () => {
    it('calculates stats correctly', () => {
      const thread: ThreadState = {
        id: 'test',
        name: 'Test Thread',
        lastActivity: new Date(),
        context: {},
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'User message',
            timestamp: new Date(Date.now() - 1000),
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Assistant message',
            timestamp: new Date(),
            tools: [{ id: 'tool1', name: 'test', parameters: {} }],
          },
        ],
      };
      
      const stats = calculateThreadStats(thread);
      
      expect(stats.messageCount).toBe(2);
      expect(stats.userMessageCount).toBe(1);
      expect(stats.assistantMessageCount).toBe(1);
      expect(stats.toolCallCount).toBe(1);
      expect(stats.duration).toBeGreaterThan(0);
    });
  });

  describe('searchMessages', () => {
    const messages: AiAssistantMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Goodbye moon',
        timestamp: new Date(),
      },
    ];

    it('returns all messages for empty query', () => {
      const result = searchMessages(messages, '');
      expect(result).toHaveLength(2);
    });

    it('filters messages by content', () => {
      const result = searchMessages(messages, 'world');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello world');
    });

    it('is case insensitive', () => {
      const result = searchMessages(messages, 'HELLO');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello world');
    });
  });

  describe('isThreadEmpty', () => {
    it('returns true for thread with no messages', () => {
      const thread: ThreadState = {
        id: 'test',
        name: 'Test',
        messages: [],
        lastActivity: new Date(),
        context: {},
      };
      
      expect(isThreadEmpty(thread)).toBe(true);
    });

    it('returns false for thread with messages', () => {
      const thread: ThreadState = {
        id: 'test',
        name: 'Test',
        messages: [{
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        }],
        lastActivity: new Date(),
        context: {},
      };
      
      expect(isThreadEmpty(thread)).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('formats bytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('formats with decimals', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('calculateReadingTime', () => {
    it('calculates reading time correctly', () => {
      const shortText = 'Hello world';
      expect(calculateReadingTime(shortText)).toBe('1 min read');
      
      const longText = 'word '.repeat(400);
      expect(calculateReadingTime(longText)).toBe('2 min read');
    });
  });
});
