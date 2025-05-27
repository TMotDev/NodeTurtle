import { createFileRoute } from '@tanstack/react-router'
import AccountDialog from '@/components/AccountDialog'
import Header from '@/components/Header'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="text-center">
      <Header />
      <AccountDialog />
    </div>
  )
}
