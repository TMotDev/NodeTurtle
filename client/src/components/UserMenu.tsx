import { LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import AccountSettings from './AccountSettings'
import useAuthStore from '@/lib/authStore'
import { API } from '@/services/api'

export default function UserMenu() {
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false)

  const [setUser, isLoading, user] = useAuthStore(
    useShallow((state) => [state.setUser, state.isLoading, state.user]),
  )

  async function handleLogout() {
    const result = await API.delete('/auth/session')

    if(!result.success && result.error){
      console.warn('Logout request failed, but continuing with local logout:', result.error)
    }

    setUser(null)
  }

  if (!user) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          {isLoading ? 'Loading...' : 'Account'}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {isLoading ? (
            // Skeleton loaders while loading
            <div className="flex flex-col space-y-2">
              <div className="h-4 w-32 bg-gray-300 animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-300 animate-pulse"></div>
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
              <Button
                variant="ghost"
                onClick={() => setIsAccountSettingsOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="stroke-primary" />
                  Logout
                </Button>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Account Settings Dialog */}
      <Dialog
        open={isAccountSettingsOpen}
        onOpenChange={setIsAccountSettingsOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Manage your account settings and preferences.
            </DialogDescription>
          </DialogHeader>
          <AccountSettings />
        </DialogContent>
      </Dialog>
    </>
  )
}