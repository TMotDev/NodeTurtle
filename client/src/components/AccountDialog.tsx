import { useState } from 'react'
import { User } from 'lucide-react'

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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function AccountDialog() {
  // Main dialog state
  const [isMainOpen, setIsMainOpen] = useState(false)

  // Form dialog states
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false)
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isDeactivateAccountOpen, setIsDeactivateAccountOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)

  // Mock user data - replace with actual user data from your app context/state
  const userData = {
    username: 'john_doe',
    email: 'john.doe@example.com',
  }

  return (
    <div className="p-8">
      <Dialog open={isMainOpen} onOpenChange={setIsMainOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Account Settings
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Username Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg font-medium">
                Username
              </div>
              <div className="text-sm text-muted-foreground">
                {userData.username}
              </div>
              <Button
                variant="link"
                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                onClick={() => setIsChangeNameOpen(true)}
              >
                Change name
              </Button>
            </div>

            {/* Email Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg font-medium">
                Email
              </div>
              <div className="text-sm text-muted-foreground">
                {userData.email}
              </div>
              <Button
                variant="link"
                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                onClick={() => setIsChangeEmailOpen(true)}
              >
                Change email
              </Button>
            </div>

            <Separator />

            {/* Security Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                Security
              </div>
              <div className="space-y-2 flex flex-col items-start">
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                  onClick={() => setIsChangePasswordOpen(true)}
                >
                  Change password
                </Button>
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                  onClick={() => setIsResetPasswordOpen(true)}
                >
                  Forgot password?
                </Button>
              </div>
            </div>

            <Separator />

            {/* Deactivate Account Section */}
            <div className="space-y-2">
              <Button
                variant="link"
                className="p-0 h-auto text-red-600 hover:text-red-800"
                onClick={() => setIsDeactivateAccountOpen(true)}
              >
                Deactivate account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeNameOpen} onOpenChange={setIsChangeNameOpen}>
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

      <Dialog open={isChangeEmailOpen} onOpenChange={setIsChangeEmailOpen}>
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
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
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

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
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
      {/* <Button
        type="button"
        variant="link"
        className="w-full p-0 h-auto text-blue-600 hover:text-blue-800"
        onClick={onForgotPasswordClick}
      >
        Forgot your current password?
      </Button> */}

      <DeactivateAccountForm
        isOpen={isDeactivateAccountOpen}
        onOpenChange={setIsDeactivateAccountOpen}
      />
    </div>
  )
}
