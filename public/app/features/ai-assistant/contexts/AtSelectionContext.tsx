import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export enum AtSelectionItemType {
  Dashboard = 'dashboard',
  Datasource = 'datasource',
}

export interface DashboardItem {
  id: number;
  isDeleted: boolean;
  isStarred: boolean;
  orgId: number;
  slug: string;
  sortMeta: number;
  tags: string[];
  title: string;
  type: string;
  uid: string;
  uri: string;
  url: string;
}
export interface AtSelectionItem {
  id: string | number;
  type: 'database' | 'table' | 'datasource' | 'loki' | 'dashboard';
  icon?: string;
  active?: boolean;
  // Common fields
  name: string;
  uid: string;
  orgId?: number;
  // Datasource fields (optional)
  access?: string;
  basicAuth?: boolean;
  database?: string;
  isDefault?: boolean;
  jsonData?: {};
  readOnly?: boolean;
  typeLogoUrl?: string;
  typeName?: string;
  url?: string;
  user?: string;
  // Dashboard fields (optional)
  uri?: string;
  isDeleted?: boolean;
  isStarred?: boolean;
  tags?: string[];
  title?: string;
  slug?: string;
  sortMeta?: number;
}

interface AtSelectionContextType {
  selectedItems: AtSelectionItem[];
  stagingItems: AtSelectionItem[]; // New staging state
  addItem: (item: AtSelectionItem | DashboardItem) => void;
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

  const addItem = useCallback((item: AtSelectionItem | DashboardItem) => {
    // Convert DashboardItem to AtSelectionItem if needed
    const normalizedItem: AtSelectionItem = 'title' in item && !('name' in item) ? {
      ...item,
      name: item.title || 'Unnamed Dashboard',
      type: 'dashboard' as const,
      id: item.id,
      uid: item.uid,
    } : item as AtSelectionItem;
    
    const itemWithActive = { ...normalizedItem, active: true };

    setSelectedItems((prev) => {
      // Check if item already exists
      if (prev.some((existingItem) => existingItem.uid === itemWithActive.uid)) {
        return prev;
      }
      return [...prev, itemWithActive];
    });

    // Also add to staging for context usage
    setStagingItems((prev) => {
      if (prev.some((existingItem) => existingItem.uid === itemWithActive.uid)) {
        return prev;
      }
      return [...prev, itemWithActive];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.uid !== itemId));
    setStagingItems((prev) => prev.filter((item) => item.uid !== itemId));
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.uid === itemId) {
          const updatedItem = { ...item, active: !item.active };

          // Update staging based on active state
          setStagingItems((stagingPrev) => {
            if (updatedItem.active) {
              // Add to staging if activated and not already there
              if (!stagingPrev.some((stagingItem) => stagingItem.uid === itemId)) {
                return [...stagingPrev, updatedItem];
              }
              return stagingPrev.map((stagingItem) => (stagingItem.uid === itemId ? updatedItem : stagingItem));
            } else {
              // Remove from staging if deactivated
              return stagingPrev.filter((stagingItem) => stagingItem.uid !== itemId);
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

  const isSelected = useCallback(
    (itemId: string) => {
      return selectedItems.some((item) => item.uid === itemId);
    },
    [selectedItems]
  );

  const isActive = useCallback(
    (itemId: string) => {
      const item = selectedItems.find((item) => item.uid === itemId);
      return item?.active ?? false;
    },
    [selectedItems]
  );

  const isStagedForContext = useCallback(
    (itemId: string) => {
      return stagingItems.some((item) => item.uid === itemId);
    },
    [stagingItems]
  );

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
