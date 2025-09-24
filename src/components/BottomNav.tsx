import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Page } from "../types";
import Icon from "./Icon";

interface BottomNavProps {
  profilePhotoUrl?: string;
}

const NavLink: React.FC<{
  href: string;
  iconName: string;
  label: string;
  isActive: boolean;
  profilePhotoUrl?: string;
}> = ({ href, iconName, label, isActive, profilePhotoUrl }) => (
  <Link
    href={href}
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
    <span className="text-xs font-medium mt-1 text-center">{label}</span>
  </Link>
);

const BottomNav: React.FC<BottomNavProps> = ({ profilePhotoUrl }) => {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 z-30">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
        <NavLink
          href="/dashboard/day"
          iconName="CalendarCheck"
          label="Hoy"
          isActive={isActive("/dashboard/day")}
        />
        <NavLink
          href="/dashboard/general"
          iconName="settings"
          label="Configurar Horario"
          isActive={isActive("/dashboard/general")}
        />
        <NavLink
          href="/dashboard/progress"
          iconName="trendingUp"
          label="Progreso"
          isActive={isActive("/dashboard/progress")}
        />
        <NavLink
          href="/dashboard/profile"
          iconName="UserCircle2"
          label="Perfil"
          isActive={isActive("/dashboard/profile")}
          profilePhotoUrl={profilePhotoUrl}
        />
      </div>
    </nav>
  );
};

export default BottomNav;
