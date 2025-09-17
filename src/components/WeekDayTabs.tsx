import React from 'react';
import { WeekDay, WEEKDAY_LABELS, WEEKDAY_ORDER } from '../types';

interface WeekDayTabsProps {
  activeTab: WeekDay;
  onTabChange: (tab: WeekDay) => void;
}

const WeekDayTabs: React.FC<WeekDayTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex overflow-x-auto border-b border-slate-700 bg-slate-900/50 pb-2 mb-2 md:mb-4">
      <div className="flex min-w-max">
        {WEEKDAY_ORDER.map((day) => (
          <button
            key={day}
            onClick={() => onTabChange(day)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === day
                ? 'text-cyan-400 border-emerald-400 bg-slate-800/50'
                : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {WEEKDAY_LABELS[day]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WeekDayTabs;