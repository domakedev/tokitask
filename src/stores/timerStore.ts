import { create } from 'zustand';

interface TimerState {
  activeTimer: {
    taskId: string | null;
    startTimestamp: number | null;
    paused: boolean;
    remainingSeconds: number | null;
    effectiveDuration: string;
    isUsingBaseDuration: boolean;
  } | null;
  setActiveTimer: (timer: TimerState['activeTimer']) => void;
  clearActiveTimer: () => void;
  updateRemainingSeconds: (seconds: number | null) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  activeTimer: null,

  setActiveTimer: (timer) => set({ activeTimer: timer }),

  clearActiveTimer: () => set({ activeTimer: null }),

  updateRemainingSeconds: (seconds) =>
    set((state) => ({
      activeTimer: state.activeTimer
        ? { ...state.activeTimer, remainingSeconds: seconds }
        : null,
    })),

  pauseTimer: () =>
    set((state) => ({
      activeTimer: state.activeTimer
        ? { ...state.activeTimer, paused: true }
        : null,
    })),

  resumeTimer: () =>
    set((state) => ({
      activeTimer: state.activeTimer
        ? { ...state.activeTimer, paused: false }
        : null,
    })),
}));