import React from "react";
import { BaseTask, DayTask } from "../types";
import TaskListItem from "./TaskListItem";

interface TaskItemProps {
  task: DayTask | (BaseTask & { completed?: boolean; isCurrent?: boolean });
  isDaily: boolean;
  onToggleComplete?: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  onUpdateAiDuration?: (id: string, newAiDuration: string) => void;
  showCopyButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
}

const TaskItem: React.FC<
  TaskItemProps & React.HTMLAttributes<HTMLDivElement>
> = ({
  task,
  isDaily,
  onToggleComplete,
  onDelete,
  onEdit,
  onUpdateAiDuration,
  showCopyButton = true,
  showEditButton = true,
  showDeleteButton = true,
  className,
  ...divProps
}) => {
  const getTaskSpecificClasses = () => {
    if (!isDaily) {
      return "border-slate-600 bg-slate-800";
    }
    if (task.completed) {
      // Fainter border and opacity for completed tasks
      return "border-slate-700 bg-slate-800 opacity-50";
    }
    if (task.isCurrent) {
      // Prominent border for the current task
      return "border-emerald-500 bg-slate-800";
    }
    // Default style for pending tasks
    return "border-slate-600 bg-slate-800";
  };

  return (
    <TaskListItem
      task={task}
      isDaily={isDaily}
      onToggleComplete={onToggleComplete}
      onDelete={onDelete}
      onEdit={onEdit}
      onUpdateAiDuration={onUpdateAiDuration}
      showCopyButton={showCopyButton}
      showEditButton={showEditButton}
      showDeleteButton={showDeleteButton}
      className={`${getTaskSpecificClasses()} ${className}`}
      {...divProps}
    />
  );
};

export default TaskItem;
