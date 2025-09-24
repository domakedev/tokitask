"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../stores/authStore";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const loading = useAuthStore(state => state.loading);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard/day");
    }
  }, [user, loading, router]);

  return null;
}
