import { useMemo, useCallback } from 'react';
import { UserData, GeneralTask, WeekDay } from '../types';
import { getCurrentWeekDay } from '../utils/dateUtils';

interface UseScheduledTasksProps {
  userData: UserData;
  selectedDate: string; // YYYY-MM-DD format
}

export const useScheduledTasks = ({ userData, selectedDate }: UseScheduledTasksProps) => {
  const { scheduledTasks, weekTasks } = useMemo(() => {
    // Parse selected date
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const selectedDayOfWeek = selectedDateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Map JavaScript day index to WeekDay enum
    const weekDayMap: Record<number, WeekDay> = {
      1: WeekDay.Monday,
      2: WeekDay.Tuesday,
      3: WeekDay.Wednesday,
      4: WeekDay.Thursday,
      5: WeekDay.Friday,
      6: WeekDay.Saturday,
      0: WeekDay.Sunday
    };

    const targetWeekDay = weekDayMap[selectedDayOfWeek];

    // 1. Tasks specifically scheduled for this date (from calendarTasks)
    const scheduledTasks: GeneralTask[] = [];
    if (userData.calendarTasks) {
      const tasksForDate = userData.calendarTasks.filter(task =>
        task.scheduledDate && task.scheduledDate === selectedDate
      );
      scheduledTasks.push(...tasksForDate);
    }

    // 2. Tasks from "Mi semana" (general + weekday tasks)
    const weekTasks: GeneralTask[] = [];

    // Add tasks from "Todos los días" (generalTasks)
    if (userData.generalTasks) {
      weekTasks.push(...userData.generalTasks);
    }

    // Add tasks from the specific weekday
    if (userData.weeklyTasks && targetWeekDay && userData.weeklyTasks[targetWeekDay]) {
      weekTasks.push(...userData.weeklyTasks[targetWeekDay]);
    }

    // Remove duplicates in weekTasks based on id
    const uniqueWeekTasks = weekTasks.filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    );

    return { scheduledTasks, weekTasks: uniqueWeekTasks };
  }, [userData, selectedDate]);

  // All tasks combined (for backward compatibility)
  const tasksForDate = useMemo(() => {
    return [...scheduledTasks, ...weekTasks].filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    );
  }, [scheduledTasks, weekTasks]);

  // Function to get tasks for today's date (for cloning)
  const getTasksForToday = useCallback(() => {
    const today = new Date().toLocaleDateString('en-CA');
    return tasksForDate.filter(task => {
      // Include if it's a general task, weekday task for today, or specifically scheduled for today
      return task.scheduledDate === today ||
             task.scheduledDate === undefined ||
             task.scheduledDate === "";
    });
  }, [tasksForDate]);

  return { tasksForDate, scheduledTasks, weekTasks, getTasksForToday };
};