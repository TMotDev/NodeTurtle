import { Link, Navigate } from '@tanstack/react-router'
import { LogOut, Turtle } from 'lucide-react'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import useAuthStore from '@/lib/authStore'


export default function Header() {

  const [logout, isLoading, user] = useAuthStore(useShallow((state)=> [
    state.logout, state.isLoading, state.user
  ]))

  async function Logout() {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/session`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
    } else {
      logout()
    }
  }

  return (
    <header className="absolute w-full py-2 px-24 h-18 gap-2 bg-gray-200 text-black flex items-center">
      <Turtle size={32} className="cursor-pointer" />
      <nav className="flex flex-row justify-between w-full">
        <div className="px-2 font-bold flex gap-4">
          <Link to="/">Home</Link>
          {!user && !isLoading && (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              {isLoading ? 'Loading...' : 'Account'}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {isLoading ? (
                // Skeleton loaders while loading
                <div className="flex flex-col space-y-2">
                  <div className="h-4 w-32 bg-gray-300 animate-pulse">.</div>
                  <div className="h-4 w-24 bg-gray-300 animate-pulse">..</div>
                </div>
              ) : (
                <>
                  <DropdownMenuLabel className="flex flex-col space-y-1">
                    <span className="text-sm font-medium leading-none">
                      {user.username}
                    </span>
                    <span className="text-muted-foreground text-xs leading-none">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Button variant="ghost" onClick={Logout}>
                      <LogOut className="stroke-primary" />
                      Logout
                    </Button>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    </header>
  )
}
