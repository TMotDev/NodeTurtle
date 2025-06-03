import { Link } from '@tanstack/react-router'
import { Turtle } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import UserMenu from './UserMenu'
import useAuthStore from '@/lib/authStore'

export default function Header() {
  const [isLoading, user] = useAuthStore(
    useShallow((state) => [state.isLoading, state.user]),
  )

  return (
    <header className="w-full py-2 px-24 h-18 gap-2 bg-gray-200 text-black flex items-center">
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
        <UserMenu />
      </nav>
    </header>
  )
}