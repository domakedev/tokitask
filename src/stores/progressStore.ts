import { create } from 'zustand';

interface ProgressState {
  taskCompletionsByProgressId: Record<string, string[]>;
  onboardingCompleted: boolean;
  setTaskCompletionsByProgressId: (completions: Record<string, string[]>) => void;
  setOnboardingCompleted: (completed: boolean) => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  taskCompletionsByProgressId: {},
  onboardingCompleted: false,

  setTaskCompletionsByProgressId: (taskCompletionsByProgressId) => set({ taskCompletionsByProgressId }),
  setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
}));