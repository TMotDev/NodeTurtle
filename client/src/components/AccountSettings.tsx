import { useState } from 'react'
import { Loader, User } from 'lucide-react'

import ChangeEmailForm from './forms/ChangeEmailForm'
import ChangeNameForm from './forms/ChangeNameForm'
import ChangePasswordForm from './forms/ChangePasswordForm'
import DeactivateAccountForm from './forms/DeactivateAccountForm'
import ResetPasswordForm from './forms/ResetPasswordForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import useAuthStore from '@/lib/authStore'

export default function AccountSettings() {
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const user = useAuthStore((state) => state.user)

  return (
    <>
      <div className="space-y-6">
        {/* Username Section */}
        <section className="space-y-2">
          <header className="flex items-center gap-2 text-lg font-medium">
            Username
          </header>
          <div className="text-sm text-muted-foreground">
            {user ? user.username : <Loader />}
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-blue-600 hover:text-blue-800"
            onClick={() => setIsNameDialogOpen(true)}
          >
            Change name
          </Button>
        </section>

        {/* Email Section */}
        <section className="space-y-2">
          <header className="flex items-center gap-2 text-lg font-medium">
            Email
          </header>
          <div className="text-sm text-muted-foreground">
            {user ? user.email : <Loader />}
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-blue-600 hover:text-blue-800"
            onClick={() => setIsEmailDialogOpen(true)}
          >
            Change email
          </Button>
        </section>

        <Separator />

        {/* Security Section */}
        <section className="space-y-4">
          <header className="flex items-center gap-2 text-lg font-medium">
            Security
          </header>
          <div className="space-y-2 flex flex-col items-start">
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 hover:text-blue-800"
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              Change password
            </Button>
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 hover:text-blue-800"
              onClick={() => setIsResetDialogOpen(true)}
            >
              Forgot password?
            </Button>
          </div>
        </section>

        <Separator />

        {/* Deactivate Account Section */}
        <section className="space-y-2">
          <Button
            variant="link"
            className="p-0 h-auto text-red-600 hover:text-red-800"
            onClick={() => setIsDeactivateDialogOpen(true)}
          >
            Deactivate account
          </Button>
        </section>
      </div>

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
            <DialogDescription>
              Enter your new username and confirm with your password.
            </DialogDescription>
          </DialogHeader>
          <ChangeNameForm />
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Enter your new email and confirm with your password.
            </DialogDescription>
          </DialogHeader>
          <ChangeEmailForm />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current and new password.
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm />
        </DialogContent>
      </Dialog>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email to receive a password reset link.
            </DialogDescription>
          </DialogHeader>
          <ResetPasswordForm />
        </DialogContent>
      </Dialog>

      <DeactivateAccountForm
        isOpen={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
      />
    </>
  )
}
