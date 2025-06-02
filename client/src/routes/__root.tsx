import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useEffect } from 'react';
import useAuthStore from '@/lib/authStore';

export const Route = createRootRoute({
  component: Root
})

function Root() {

  const checkAuthStatus = useAuthStore((state)=>state.checkAuthStatus);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <>
      <Outlet />
      <TanStackRouterDevtools />
      </>
  )
}
