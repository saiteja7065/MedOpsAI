import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  darkMode: boolean;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  aiAssistantOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setCommandPalette: (open: boolean) => void;
  setAIAssistant: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      aiAssistantOpen: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandPalette: (open) => set({ commandPaletteOpen: open }),
      setAIAssistant: (open) => set({ aiAssistantOpen: open }),
    }),
    {
      name: 'ui-storage',
      partialize: (s) => ({ darkMode: s.darkMode, sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
);
