import { createFileRoute } from '@tanstack/react-router'
import Header from '@/components/Header'
import AccountSettings from '@/components/AccountSettings'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
     <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex justify-center items-center p-4">

      </main>
    </div>
  )
}
