import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

const STORAGE_KEY = 'guess-the-number-selected-tab';

type TabNavigationContextType = {
  currentTab: number;
  setCurrentTab: (tab: number) => void;
};

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

export const TabNavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(currentTab));
    } catch (e) {
      console.warn('Failed to store tab in localStorage:', e);
    }
  }, [currentTab]);

  return (
    <TabNavigationContext.Provider value={{ currentTab, setCurrentTab }}>
      {children}
    </TabNavigationContext.Provider>
  );
};

export const useTabNavigation = (): TabNavigationContextType => {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error('useTabNavigation must be used within TabNavigationProvider');
  }
  return context;
};
