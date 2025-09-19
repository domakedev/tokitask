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
  Play,
  Pause,
  StopCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Calendar,
  CheckCircle,
  TrendingUp,
  Settings,
  LucideInfo,
  Lock,
  Bird,
  TimerIcon,
  Rotate3D as Orbit,
  ListTodoIcon
} from "lucide-react";

interface IconProps {
  name: string;
  className?: string;
}

const icons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
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
  play: Play,
  pause: Pause,
  stop: StopCircle,
  clock: Clock,
  chevronleft: ChevronLeft,
  chevronright: ChevronRight,
  flame: Flame,
  calendar: Calendar,
  checkcircle: CheckCircle,
  trendingup: TrendingUp,
  settings: Settings,
  informationcircle: LucideInfo,
  lock: Lock,
  bird: Bird,
  timer: TimerIcon,
  orbit: Orbit,
  list: ListTodoIcon
};

const Icon: React.FC<IconProps> = ({ name, className = "h-6 w-6" }) => {
  const LucideIcon = icons[name.toLowerCase()];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} />;
};

export default Icon;
