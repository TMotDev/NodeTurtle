import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import useAuthStore from "@/lib/authStore";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  const { checkAuthStatus, user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      checkAuthStatus();
    }
  }, [checkAuthStatus, user]);

  return (
    <div className="h-screen w-screen overflow-x-hidden">
      <Outlet />
    </div>
  );
}
