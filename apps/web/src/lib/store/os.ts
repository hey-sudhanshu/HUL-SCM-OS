import { create } from 'zustand';

export interface Position { x: number; y: number }
export interface Size { width: number; height: number }

export interface WindowState {
  id: string;
  title: string;
  icon?: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: Position;
  size: Size;
  zIndex: number;
}

interface OSState {
  windows: Record<string, WindowState>;
  focusedWindowId: string | null;
  theme: 'paper' | 'ink';
  crtEnabled: boolean;
  desktopColor: 'default' | 'blue' | 'green';
  highestZIndex: number;
  isLiveSolver: boolean;
  isLiveLLM: boolean;
  openWindow: (id: string, title: string, defaultSize?: Size) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  updateWindowPosition: (id: string, pos: Position) => void;
  updateWindowSize: (id: string, size: Size) => void;
  setTheme: (theme: 'paper' | 'ink') => void;
  setCrtEnabled: (enabled: boolean) => void;
  setDesktopColor: (color: 'default' | 'blue' | 'green') => void;
  setLiveSolver: (isLive: boolean) => void;
  setLiveLLM: (isLive: boolean) => void;
}

export const useOSStore = create<OSState>((set) => ({
  windows: {},
  focusedWindowId: null,
  theme: 'paper',
  crtEnabled: true,
  desktopColor: 'default',
  highestZIndex: 10,
  isLiveSolver: false,
  isLiveLLM: false,

  openWindow: (id, title, defaultSize = { width: 600, height: 400 }) => set((state) => {
    const existing = state.windows[id];
    const newZ = state.highestZIndex + 1;
    if (existing) {
      return {
        windows: {
          ...state.windows,
          [id]: { ...existing, isOpen: true, isMinimized: false, zIndex: newZ }
        },
        focusedWindowId: id,
        highestZIndex: newZ
      };
    }
    
    const offset = Object.keys(state.windows).length * 20;
    
    return {
      windows: {
        ...state.windows,
        [id]: {
          id,
          title,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          position: { x: 50 + offset, y: 50 + offset },
          size: defaultSize,
          zIndex: newZ,
        }
      },
      focusedWindowId: id,
      highestZIndex: newZ
    };
  }),

  closeWindow: (id) => set((state) => {
    const { [id]: _, ...rest } = state.windows;
    return {
      windows: rest,
      focusedWindowId: state.focusedWindowId === id ? null : state.focusedWindowId
    };
  }),

  focusWindow: (id) => set((state) => {
    if (state.focusedWindowId === id) return state;
    const newZ = state.highestZIndex + 1;
    return {
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], zIndex: newZ, isMinimized: false }
      },
      focusedWindowId: id,
      highestZIndex: newZ
    };
  }),

  minimizeWindow: (id) => set((state) => ({
    windows: {
      ...state.windows,
      [id]: { ...state.windows[id], isMinimized: true }
    },
    focusedWindowId: state.focusedWindowId === id ? null : state.focusedWindowId
  })),
  
  restoreWindow: (id) => set((state) => {
    const newZ = state.highestZIndex + 1;
    return {
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], isMinimized: false, zIndex: newZ }
      },
      focusedWindowId: id,
      highestZIndex: newZ
    };
  }),

  toggleMaximizeWindow: (id) => set((state) => ({
    windows: {
      ...state.windows,
      [id]: { ...state.windows[id], isMaximized: !state.windows[id].isMaximized }
    }
  })),

  updateWindowPosition: (id, pos) => set((state) => ({
    windows: {
      ...state.windows,
      [id]: { ...state.windows[id], position: pos }
    }
  })),

  updateWindowSize: (id, size) => set((state) => ({
    windows: {
      ...state.windows,
      [id]: { ...state.windows[id], size }
    }
  })),

  setTheme: (theme) => set({ theme }),
  setCrtEnabled: (enabled) => set({ crtEnabled: enabled }),
  setDesktopColor: (color) => set({ desktopColor: color }),
  setLiveSolver: (isLive) => set({ isLiveSolver: isLive }),
  setLiveLLM: (isLive) => set({ isLiveLLM: isLive })
}));
