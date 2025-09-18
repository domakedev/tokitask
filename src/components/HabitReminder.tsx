import React from "react";
import Icon from "./Icon";

const HabitReminder: React.FC = () => {
  return (
    <div className="bg-blue-900/10 border border-blue-500/20 rounded-md p-2 mb-3">
      <div className="flex items-center space-x-2">
        <Icon name="info" className="h-3 w-3 text-blue-400 flex-shrink-0" />
        <p className="text-sm text-blue-300">
          💡 Marca tus tareas como &quot;Hábito&quot; para verlas aquí.
        </p>
      </div>
    </div>
  );
};

export default HabitReminder;