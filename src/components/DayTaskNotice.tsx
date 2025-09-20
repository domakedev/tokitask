import React from "react";
import Icon from "./Icon";

const DayTaskNotice: React.FC = () => {
  return (
    <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center">
        <Icon
          name="informationcircle"
          className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0"
        />
        <p className="text-sm text-slate-300">
          Estas tareas son únicas para este día y se repetirán cada día igual a este.
        </p>
      </div>
    </div>
  );
};

export default DayTaskNotice;