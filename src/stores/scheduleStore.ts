import { create } from 'zustand';
import { DayTask, GeneralTask, WeekDay, Page } from '../types';

interface ScheduleState {
  endOfDay: string;
  dayTasks: DayTask[];
  generalTasks: GeneralTask[];
  weeklyTasks: Record<WeekDay, GeneralTask[]>;
  calendarTasks: GeneralTask[];
  currentPage: Page;
  setEndOfDay: (endOfDay: string) => void;
  setDayTasks: (tasks: DayTask[]) => void;
  setGeneralTasks: (tasks: GeneralTask[]) => void;
  setWeeklyTasks: (tasks: Record<WeekDay, GeneralTask[]>) => void;
  setCalendarTasks: (tasks: GeneralTask[]) => void;
  setCurrentPage: (page: Page) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  endOfDay: '18:00',
  dayTasks: [],
  generalTasks: [],
  weeklyTasks: {
    [WeekDay.All]: [],
    [WeekDay.Monday]: [],
    [WeekDay.Tuesday]: [],
    [WeekDay.Wednesday]: [],
    [WeekDay.Thursday]: [],
    [WeekDay.Friday]: [],
    [WeekDay.Saturday]: [],
    [WeekDay.Sunday]: [],
  },
  calendarTasks: [],
  currentPage: Page.Day,

  setEndOfDay: (endOfDay) => set({ endOfDay }),
  setDayTasks: (dayTasks) => set({ dayTasks }),
  setGeneralTasks: (generalTasks) => set({ generalTasks }),
  setWeeklyTasks: (weeklyTasks) => set({ weeklyTasks }),
  setCalendarTasks: (calendarTasks) => set({ calendarTasks }),
  setCurrentPage: (currentPage) => set({ currentPage }),
}));