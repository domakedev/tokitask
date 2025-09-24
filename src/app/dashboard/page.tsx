"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userData) {
      router.replace("/dashboard/day");
    } else if (!loading && (!user || !userData)) {
      router.replace("/");
    }
  }, [user, userData, loading, router]);

  return null;
}
