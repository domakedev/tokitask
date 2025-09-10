import React from "react";
import {
  Check,
  Trash2,
  Pencil,
  Sunrise,
  ClipboardList,
  GripVertical,
  Loader,
  Plus,
  CalendarCheck,
  ListChecks,
  UserCircle2,
  Lightbulb,
} from "lucide-react";

interface IconProps {
  name: string;
  className?: string;
}

const icons: Record<string, React.ElementType> = {
  check: Check,
  trash2: Trash2,
  pencil: Pencil,
  sunrise: Sunrise,
  clipboardList: ClipboardList,
  gripVertical: GripVertical,
  loader: Loader,
  plus: Plus,
  calendarcheck: CalendarCheck,
  listchecks: ListChecks,
  usercircle2: UserCircle2,
  lightbulb: Lightbulb,
};

const Icon: React.FC<IconProps> = ({ name, className = "h-6 w-6" }) => {
  const LucideIcon = icons[name.toLowerCase()];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} />;
};

export default Icon;
