// __root.tsx

import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router"; // Add HeadContent here
import { useEffect } from "react";
import { Toaster } from "sonner";
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
    <div className="h-screen w-screen overflow-x-hidden root">
      <HeadContent />
      <Outlet />
      <Toaster richColors position="top-center" expand swipeDirections={["left", "right", "top"]} />
    </div>
  );
}
