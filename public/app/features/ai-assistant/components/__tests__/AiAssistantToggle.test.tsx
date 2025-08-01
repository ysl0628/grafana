import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import * as aiAssistantExtension from '../../../extensions/aiAssistantExtension';
import { AiAssistantToggle } from '../AiAssistantToggle';

// Mock the AI Assistant extension
jest.mock('../../../extensions/aiAssistantExtension', () => ({
  isAiAssistantEnabled: jest.fn(),
  openAiAssistantSidebar: jest.fn(),
}));

describe('AiAssistantToggle', () => {
  const mockIsAiAssistantEnabled = aiAssistantExtension.isAiAssistantEnabled as jest.MockedFunction<typeof aiAssistantExtension.isAiAssistantEnabled>;
  const mockOpenAiAssistantSidebar = aiAssistantExtension.openAiAssistantSidebar as jest.MockedFunction<typeof aiAssistantExtension.openAiAssistantSidebar>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when AI Assistant is enabled', () => {
    beforeEach(() => {
      mockIsAiAssistantEnabled.mockReturnValue(true);
    });

    it('renders the toggle button', () => {
      render(<AiAssistantToggle />);
      
      expect(screen.getByLabelText('Open AI Assistant')).toBeInTheDocument();
      expect(screen.getByTestId('ai-assistant-toggle')).toBeInTheDocument();
    });

    it('has correct icon', () => {
      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      expect(button).toHaveAttribute('data-icon', 'robot');
    });

    it('shows tooltip on hover', () => {
      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      fireEvent.mouseEnter(button);
      
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });

    it('calls openAiAssistantSidebar when clicked', () => {
      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      fireEvent.click(button);
      
      expect(mockOpenAiAssistantSidebar).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility attributes', () => {
      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      expect(button).toHaveAttribute('aria-label', 'Open AI Assistant');
      expect(button).toHaveAttribute('data-testid', 'ai-assistant-toggle');
    });
  });

  describe('when AI Assistant is disabled', () => {
    beforeEach(() => {
      mockIsAiAssistantEnabled.mockReturnValue(false);
    });

    it('does not render the toggle button', () => {
      render(<AiAssistantToggle />);
      
      expect(screen.queryByLabelText('Open AI Assistant')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-assistant-toggle')).not.toBeInTheDocument();
    });

    it('does not call openAiAssistantSidebar', () => {
      render(<AiAssistantToggle />);
      
      expect(mockOpenAiAssistantSidebar).not.toHaveBeenCalled();
    });
  });

  describe('button interactions', () => {
    beforeEach(() => {
      mockIsAiAssistantEnabled.mockReturnValue(true);
    });

    it('responds to keyboard events', () => {
      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      
      expect(mockOpenAiAssistantSidebar).toHaveBeenCalledTimes(1);
    });

    it('responds to space key', () => {
      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      
      expect(mockOpenAiAssistantSidebar).toHaveBeenCalledTimes(1);
    });

    it('can be clicked multiple times', () => {
      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockOpenAiAssistantSidebar).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockIsAiAssistantEnabled.mockReturnValue(true);
    });

    it('handles errors from openAiAssistantSidebar gracefully', () => {
      mockOpenAiAssistantSidebar.mockImplementation(() => {
        throw new Error('Test error');
      });

      render(<AiAssistantToggle />);
      
      const button = screen.getByLabelText('Open AI Assistant');
      
      // Should not throw error when clicked
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });
  });
});
