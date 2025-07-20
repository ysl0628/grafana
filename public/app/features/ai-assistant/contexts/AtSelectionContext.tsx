import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AtSelectionItem {
  id: string;
  type: 'database' | 'table' | 'datasource';
  title: string;
  subtitle?: string;
  icon?: string;
  active?: boolean; // New field to track if item is active/enabled
}

interface AtSelectionContextType {
  selectedItems: AtSelectionItem[];
  stagingItems: AtSelectionItem[]; // New staging state
  addItem: (item: AtSelectionItem) => void;
  removeItem: (itemId: string) => void;
  clearItems: () => void;
  toggleItem: (itemId: string) => void; // New toggle function
  isSelected: (itemId: string) => boolean;
  isActive: (itemId: string) => boolean; // New function to check if item is active
  isStagedForContext: (itemId: string) => boolean; // New function to check staging state
}

const AtSelectionContext = createContext<AtSelectionContextType | undefined>(undefined);

export const useAtSelection = () => {
  const context = useContext(AtSelectionContext);
  if (!context) {
    throw new Error('useAtSelection must be used within an AtSelectionProvider');
  }
  return context;
};

interface AtSelectionProviderProps {
  children: ReactNode;
}

export const AtSelectionProvider: React.FC<AtSelectionProviderProps> = ({ children }) => {
  const [selectedItems, setSelectedItems] = useState<AtSelectionItem[]>([]);
  const [stagingItems, setStagingItems] = useState<AtSelectionItem[]>([]);

  const addItem = useCallback((item: AtSelectionItem) => {
    const itemWithActive = { ...item, active: true };
    
    setSelectedItems(prev => {
      // Check if item already exists
      if (prev.some(existingItem => existingItem.id === item.id)) {
        return prev;
      }
      return [...prev, itemWithActive];
    });

    // Also add to staging for context usage
    setStagingItems(prev => {
      if (prev.some(existingItem => existingItem.id === item.id)) {
        return prev;
      }
      return [...prev, itemWithActive];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
    setStagingItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setSelectedItems(prev => 
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, active: !item.active };
          
          // Update staging based on active state
          setStagingItems(stagingPrev => {
            if (updatedItem.active) {
              // Add to staging if activated and not already there
              if (!stagingPrev.some(stagingItem => stagingItem.id === itemId)) {
                return [...stagingPrev, updatedItem];
              }
              return stagingPrev.map(stagingItem => 
                stagingItem.id === itemId ? updatedItem : stagingItem
              );
            } else {
              // Remove from staging if deactivated
              return stagingPrev.filter(stagingItem => stagingItem.id !== itemId);
            }
          });
          
          return updatedItem;
        }
        return item;
      })
    );
  }, []);

  const clearItems = useCallback(() => {
    setSelectedItems([]);
    setStagingItems([]);
  }, []);

  const isSelected = useCallback((itemId: string) => {
    return selectedItems.some(item => item.id === itemId);
  }, [selectedItems]);

  const isActive = useCallback((itemId: string) => {
    const item = selectedItems.find(item => item.id === itemId);
    return item?.active ?? false;
  }, [selectedItems]);

  const isStagedForContext = useCallback((itemId: string) => {
    return stagingItems.some(item => item.id === itemId);
  }, [stagingItems]);

  const value: AtSelectionContextType = {
    selectedItems,
    stagingItems,
    addItem,
    removeItem,
    clearItems,
    toggleItem,
    isSelected,
    isActive,
    isStagedForContext,
  };

  return <AtSelectionContext.Provider value={value}>{children}</AtSelectionContext.Provider>;
};

export default AtSelectionContext;