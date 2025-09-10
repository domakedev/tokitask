import React, { useRef, useState } from 'react';
import { DayTask, GeneralTask } from '../types';
import TaskItem from './TaskItem';

type Task = DayTask | GeneralTask;

interface TaskListProps {
    tasks: Task[];
    isDaily: boolean;
    onToggleComplete?: (id: number) => void;
    onDelete: (id: number) => void;
    onReorder: (reorderedTasks: Task[]) => void;
    onEdit?: (id: number) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, isDaily, onToggleComplete, onDelete, onReorder, onEdit }) => {
    const [dragging, setDragging] = useState(false);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        setDragging(true);
        // Use a transparent image to hide default drag preview
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
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

    return (
        <div className="space-y-4">
            {tasks.map((task, index) => (
                <TaskItem
                    key={task.id}
                    task={task}
                    isDaily={isDaily}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={dragging && dragItem.current === index ? 'dragging' : ''}
                />
            ))}
        </div>
    );
};

export default TaskList;