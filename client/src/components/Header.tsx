import { Link } from '@tanstack/react-router'
import { Turtle } from 'lucide-react'

export default function Header() {
  return (
    <header className="absolute w-full p-2 flex gap-2 bg-gray-200 text-black">
      <Turtle size={32} className='cursor-pointer'/>
      <nav className="flex flex-row">
        <div className="px-2 font-bold flex gap-4">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </nav>
    </header>
  )
}
