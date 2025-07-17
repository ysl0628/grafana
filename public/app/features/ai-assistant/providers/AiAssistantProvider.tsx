import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import { config } from '@grafana/runtime';

interface AiAssistantState {
  isOpen: boolean;
  width: number;
}

interface AiAssistantContextType {
  state: AiAssistantState;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setWidth: (width: number) => void;
}

const AiAssistantContext = createContext<AiAssistantContextType | undefined>(undefined);

const AI_ASSISTANT_STORAGE_KEY = 'ai-assistant-sidebar';
const DEFAULT_WIDTH_RATIO = 1/3; // AI assistant 佔 1/3
const MIN_WIDTH = 300;
const MAX_WIDTH_RATIO = 2/3; // 最大不超過 2/3

interface AiAssistantProviderProps {
  children: ReactNode;
}

export const AiAssistantProvider: React.FC<AiAssistantProviderProps> = ({ children }) => {
  const [state, setState] = useState<AiAssistantState>(() => {
    // Calculate default width based on viewport
    const getDefaultWidth = () => {
      const viewportWidth = window.innerWidth;
      const calculatedWidth = Math.floor(viewportWidth * DEFAULT_WIDTH_RATIO);
      const maxWidth = Math.floor(viewportWidth * MAX_WIDTH_RATIO);
      return Math.max(MIN_WIDTH, Math.min(maxWidth, calculatedWidth));
    };

    // Load from localStorage or use defaults
    const stored = localStorage.getItem(AI_ASSISTANT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const viewportWidth = window.innerWidth;
        const maxWidth = Math.floor(viewportWidth * MAX_WIDTH_RATIO);
        return {
          isOpen: parsed.isOpen || false,
          width: Math.max(MIN_WIDTH, Math.min(maxWidth, parsed.width || getDefaultWidth())),
        };
      } catch (e) {
        console.warn('Failed to parse AI assistant state from localStorage:', e);
      }
    }
    return {
      isOpen: config.featureToggles.aiAssistant === true, // Default to open if feature is enabled
      width: getDefaultWidth(),
    };
  });

  const saveState = useCallback((newState: AiAssistantState) => {
    localStorage.setItem(AI_ASSISTANT_STORAGE_KEY, JSON.stringify(newState));
  }, []);

  const openSidebar = useCallback(() => {
    const newState = { ...state, isOpen: true };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  const closeSidebar = useCallback(() => {
    const newState = { ...state, isOpen: false };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  const toggleSidebar = useCallback(() => {
    const newState = { ...state, isOpen: !state.isOpen };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  const setWidth = useCallback((width: number) => {
    const viewportWidth = window.innerWidth;
    const maxWidth = Math.floor(viewportWidth * MAX_WIDTH_RATIO);
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, width));
    const newState = { ...state, width: clampedWidth };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  const contextValue: AiAssistantContextType = {
    state,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    setWidth,
  };

  return (
    <AiAssistantContext.Provider value={contextValue}>
      {children}
    </AiAssistantContext.Provider>
  );
};

export const useAiAssistantSidebar = (): AiAssistantContextType => {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error('useAiAssistantSidebar must be used within an AiAssistantProvider');
  }
  return context;
};
