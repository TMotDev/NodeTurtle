import { createFileRoute } from '@tanstack/react-router'

import Header from '@/components/Header'
import LoginForm from '@/components/forms/LoginForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="h-screen w-screen bg-background">
      <Header />
        <div className="flex justify-center h-full items-center p-4">
          <LoginForm />
        </div>
    </div>
  )
}
