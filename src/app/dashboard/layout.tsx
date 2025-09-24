"use client";
import React from "react";
import { useAuth } from "../../hooks/useAuth";
import BottomNav from "../../components/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <>
      {children}
      <BottomNav profilePhotoUrl={user?.photoURL || undefined} />
    </>
  );
}