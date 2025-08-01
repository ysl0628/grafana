import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { AiAssistantContextProvider } from '../../providers/AiAssistantContextProvider';
import { AiAssistantRuntimeProvider } from '../../providers/AiAssistantRuntimeProvider';
import { AiAssistantSidebar } from '../AiAssistantSidebar';

// Mock dependencies
jest.mock('../../providers/AiAssistantRuntimeProvider', () => ({
  AiAssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="runtime-provider">{children}</div>
  ),
}));

jest.mock('../../providers/AiAssistantContextProvider', () => ({
  AiAssistantContextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-provider">{children}</div>
  ),
}));

jest.mock('../../hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({
    isLoading: false,
    error: null,
    currentThread: null,
    threads: [],
    createThread: jest.fn(),
    clearError: jest.fn(),
  }),
}));

describe('AiAssistantSidebar', () => {
  const defaultProps = {
    className: 'test-class',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<AiAssistantSidebar {...defaultProps} />);
    
    expect(screen.getByTestId('runtime-provider')).toBeInTheDocument();
    expect(screen.getByTestId('context-provider')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<AiAssistantSidebar {...defaultProps} />);
    
    expect(container.firstChild).toHaveClass('test-class');
  });

  it('renders AI Assistant header', () => {
    render(<AiAssistantSidebar {...defaultProps} />);
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders welcome message when no current thread', () => {
    render(<AiAssistantSidebar {...defaultProps} />);
    
    expect(screen.getByText('Welcome to AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Start New Conversation')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<AiAssistantSidebar {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close AI Assistant');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders new thread button', () => {
    render(<AiAssistantSidebar {...defaultProps} />);
    
    expect(screen.getByLabelText('New Thread')).toBeInTheDocument();
  });

  it('renders history button', () => {
    render(<AiAssistantSidebar {...defaultProps} />);
    
    expect(screen.getByLabelText('Thread History')).toBeInTheDocument();
  });

  it('does not render close button when onClose is not provided', () => {
    render(<AiAssistantSidebar className="test-class" />);
    
    expect(screen.queryByLabelText('Close AI Assistant')).not.toBeInTheDocument();
  });
});

describe('AiAssistantSidebar with error state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAiAssistant to return error state
    jest.doMock('../../hooks/useAiAssistant', () => ({
      useAiAssistant: () => ({
        isLoading: false,
        error: 'Test error message',
        currentThread: null,
        threads: [],
        createThread: jest.fn(),
        clearError: jest.fn(),
      }),
    }));
  });

  it('renders error message when error exists', () => {
    const { useAiAssistant } = require('../../hooks/useAiAssistant');
    useAiAssistant.mockReturnValue({
      isLoading: false,
      error: 'Test error message',
      currentThread: null,
      threads: [],
      createThread: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AiAssistantSidebar />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });
});

describe('AiAssistantSidebar with loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAiAssistant to return loading state
    jest.doMock('../../hooks/useAiAssistant', () => ({
      useAiAssistant: () => ({
        isLoading: true,
        error: null,
        currentThread: null,
        threads: [],
        createThread: jest.fn(),
        clearError: jest.fn(),
      }),
    }));
  });

  it('renders loading state when loading', () => {
    const { useAiAssistant } = require('../../hooks/useAiAssistant');
    useAiAssistant.mockReturnValue({
      isLoading: true,
      error: null,
      currentThread: null,
      threads: [],
      createThread: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AiAssistantSidebar />);
    
    expect(screen.getByText('Loading AI Assistant...')).toBeInTheDocument();
  });
});

describe('AiAssistantSidebar with thread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAiAssistant to return thread state
    jest.doMock('../../hooks/useAiAssistant', () => ({
      useAiAssistant: () => ({
        isLoading: false,
        error: null,
        currentThread: {
          id: 'test-thread',
          name: 'Test Thread',
          messages: [],
          lastActivity: new Date(),
          context: {},
        },
        threads: [],
        createThread: jest.fn(),
        clearError: jest.fn(),
      }),
    }));
  });

  it('renders thread component when current thread exists', () => {
    const { useAiAssistant } = require('../../hooks/useAiAssistant');
    useAiAssistant.mockReturnValue({
      isLoading: false,
      error: null,
      currentThread: {
        id: 'test-thread',
        name: 'Test Thread',
        messages: [],
        lastActivity: new Date(),
        context: {},
      },
      threads: [],
      createThread: jest.fn(),
      clearError: jest.fn(),
    });

    render(<AiAssistantSidebar />);
    
    // Should not show welcome message when thread exists
    expect(screen.queryByText('Welcome to AI Assistant')).not.toBeInTheDocument();
  });
});
