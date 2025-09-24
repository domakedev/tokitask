"use client";
import React, { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import ProfileView from "../../../components/ProfileView";
import FirebaseErrorScreen from "../../../components/FirebaseErrorScreen";
import Icon from "../../../components/Icon";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, authError, handleSignOut } = useAuth();

  const handleSignOutWithRedirect = useCallback(async () => {
    await handleSignOut();
    router.push("/");
  }, [handleSignOut, router]);

  // Handle redirect to login when user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const profileViewComponent = useMemo(
    () => <ProfileView user={user} onSignOut={handleSignOutWithRedirect} />,
    [user, handleSignOutWithRedirect]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Icon
          name="loader"
          className="h-12 w-12 animate-spin text-emerald-400 mb-4"
        />
        <p className="text-lg text-white font-semibold">Cargando...</p>
      </div>
    );
  }

  if (authError) {
    return <FirebaseErrorScreen />;
  }

  // Don't render anything while loading or if redirecting
  if (loading || !user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {profileViewComponent}
    </div>
  );
}