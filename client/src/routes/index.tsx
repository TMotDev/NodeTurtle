import { createFileRoute } from '@tanstack/react-router'
import logo from '../logo.svg'
import AccountDialog from '@/components/AccountDialog'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="text-center">
     <AccountDialog/>
    </div>
  )
}
