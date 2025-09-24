import React, { useRef, useState } from "react";
import { DayTask, GeneralTask } from "../types";
import TaskItem from "./TaskItem";
import { generateUniqueId } from "@/utils/idGenerator";
import { motion, AnimatePresence } from "framer-motion";

type Task = DayTask | GeneralTask;

interface TaskListProps {
  tasks: Task[];
  isDaily: boolean;
  onToggleComplete?: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (reorderedTasks: Task[]) => Promise<void>;
  onEdit?: (id: string) => void;
  onUpdateAiDuration?: (id: string, newAiDuration: string) => void;
  showCopyButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  showTimer?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  isDaily,
  onToggleComplete,
  onDelete,
  onReorder,
  onEdit,
  onUpdateAiDuration,
  showCopyButton = true,
  showEditButton = true,
  showDeleteButton = true,
  showTimer = true,
}) => {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [dragging, setDragging] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Sync localTasks with props.tasks
  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    position: number
  ) => {
    dragItem.current = position;
    setDragging(true);
    // Use a transparent image to hide default drag preview
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnter = (
    e: React.DragEvent<HTMLDivElement>,
    position: number
  ) => {
    if (dragItem.current === null) return;
    dragOverItem.current = position;
    const list = [...tasks];
    const dragItemContent = list[dragItem.current];
    list.splice(dragItem.current, 1);
    list.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = dragOverItem.current;
    dragOverItem.current = null;
    onReorder(list);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setDragging(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index > 0) {
      const originalTasks = [...localTasks];
      const newTasks = [...localTasks];
      [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
      setLocalTasks(newTasks);
      try {
        await onReorder(newTasks);
      } catch (error) {
        setLocalTasks(originalTasks);
        console.error('Error reordering tasks:', error);
      }
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index < localTasks.length - 1) {
      const originalTasks = [...localTasks];
      const newTasks = [...localTasks];
      [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
      setLocalTasks(newTasks);
      try {
        await onReorder(newTasks);
      } catch (error) {
        setLocalTasks(originalTasks);
        console.error('Error reordering tasks:', error);
      }
    }
  };

  return (
    <motion.div className="space-y-4" layout>
      {localTasks.map((task, index) => (
        <motion.div key={task.id} layout>
          <TaskItem
            task={task}
            isDaily={isDaily}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onEdit={onEdit}
            onUpdateAiDuration={onUpdateAiDuration}
            showCopyButton={showCopyButton}
            showEditButton={showEditButton}
            showDeleteButton={showDeleteButton}
            showTimer={showTimer}
            index={index}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={dragging && dragItem.current === index ? "dragging" : ""}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default TaskList;
