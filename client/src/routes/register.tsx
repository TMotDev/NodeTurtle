import { createFileRoute } from '@tanstack/react-router'

import Header from '@/components/Header'
import RegisterForm from '@/components/forms/RegisterForm'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <div className="h-screen w-screen">
      <Header />
      <div className="flex justify-center h-full halftone items-center p-4">
        <RegisterForm />
      </div>
    </div>
  )
}
