"use client";
import React, { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../stores/authStore";
import ProfileView from "../../../components/ProfileView";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const handleSignOut = useAuthStore(state => state.handleSignOut);

  const handleSignOutWithRedirect = useCallback(async () => {
    await handleSignOut();
    router.push("/");
  }, [handleSignOut, router]);

  const profileViewComponent = useMemo(
    () => <ProfileView user={user} onSignOut={handleSignOutWithRedirect} />,
    [user, handleSignOutWithRedirect]
  );

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {profileViewComponent}
    </div>
  );
}