import React from 'react';
import Icon from './Icon';

interface BadgeProps {
  label: string;
  icon?: string;
  variant: 'flexible' | 'fixed' | 'habit' | 'unselected' | 'ai' | 'high' | 'medium' | 'low';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  label,
  icon,
  variant,
  selected = true,
  onClick,
  className = ''
}) => {
  const getClasses = () => {
    if (!selected) return 'bg-slate-600 text-slate-400 border-slate-500/30';
    switch (variant) {
      case 'flexible':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'fixed':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'habit':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'ai':
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30';
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-600 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <span
      className={`font-medium px-2 py-0.5 rounded-full border text-xs whitespace-nowrap flex justify-center items-center ${getClasses()} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      {icon && <Icon name={icon} className="h-3 w-3 inline mr-1" />}
      {label}
    </span>
  );
};

export default Badge;