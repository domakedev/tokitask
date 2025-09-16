import React from "react";
import Image from "next/image";
import { Page } from "../types";
import Icon from "./Icon";

interface BottomNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  profilePhotoUrl?: string;
}

const NavLink: React.FC<{
  page: Page;
  iconName: string;
  label: string;
  isActive: boolean;
  onClick: (page: Page) => void;
  profilePhotoUrl?: string;
}> = ({ page, iconName, label, isActive, onClick, profilePhotoUrl }) => (
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
    {iconName === "UserCircle2" && profilePhotoUrl && profilePhotoUrl.includes("lh3.googleusercontent.com") ? (
      <Image
        src={profilePhotoUrl}
        alt="Foto de perfil"
        width={28}
        height={28}
        className={`rounded-full object-cover border-2 ${
          isActive ? "border-emerald-400" : "border-slate-500"
        }`}
      />
    ) : (
      <Icon
        name={iconName}
        className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-white"}`}
      />
    )}
    <span className="text-xs font-medium mt-1">{label}</span>
  </a>
);

const BottomNav: React.FC<BottomNavProps> = ({ activePage, onNavigate, profilePhotoUrl }) => {
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
          page={Page.Progress}
          iconName="trendingUp"
          label="Progreso"
          isActive={activePage === Page.Progress}
          onClick={onNavigate}
        />
        <NavLink
          page={Page.Profile}
          iconName="UserCircle2"
          label="Perfil"
          isActive={activePage === Page.Profile}
          onClick={onNavigate}
          profilePhotoUrl={profilePhotoUrl}
        />
      </div>
    </nav>
  );
};

export default BottomNav;
