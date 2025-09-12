import React from "react";
import { Page } from "../types";
import Icon from "./Icon";

interface BottomNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NavLink: React.FC<{
  page: Page;
  iconName: string;
  label: string;
  isActive: boolean;
  onClick: (page: Page) => void;
}> = ({ page, iconName, label, isActive, onClick }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick(page);
    }}
    className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
      isActive ? "text-emerald-400" : "text-slate-400 hover:text-white"
    }`}
    aria-current={isActive ? "page" : undefined}
  >
    <Icon name={iconName} className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-white"}`} />
    <span className="text-xs font-medium mt-1">{label}</span>
  </a>
);

const BottomNav: React.FC<BottomNavProps> = ({ activePage, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 z-30">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
        <NavLink
          page={Page.Day}
          iconName="CalendarCheck"
          label="Día"
          isActive={activePage === Page.Day}
          onClick={onNavigate}
        />
        <NavLink
          page={Page.General}
          iconName="ListChecks"
          label="Horario General"
          isActive={activePage === Page.General}
          onClick={onNavigate}
        />
        <NavLink
          page={Page.Profile}
          iconName="UserCircle2"
          label="Perfil"
          isActive={activePage === Page.Profile}
          onClick={onNavigate}
        />
      </div>
    </nav>
  );
};

export default BottomNav;
