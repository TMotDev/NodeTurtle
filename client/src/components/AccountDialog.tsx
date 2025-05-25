import React, { useState } from 'react'
import { z } from 'zod'
import { AlertTriangle, Check, Lock, Mail, Trash2, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

const changeNameSchema = z.object({
  newName: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(1, 'Password is required'),
})

const changeEmailSchema = z.object({
  newEmail: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

const passwordResetSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export default function AccountDialog() {
  // Main dialog state
  const [isMainOpen, setIsMainOpen] = useState(false)

  // Nested dialog states
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false)
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false)

  // Form states
  const [changeNameForm, setChangeNameForm] = useState({
    newName: '',
    password: '',
  })
  const [changeEmailForm, setChangeEmailForm] = useState({
    newEmail: '',
    password: '',
  })
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  })
  const [passwordResetForm, setPasswordResetForm] = useState({ email: '' })
  const [deleteAccountForm, setDeleteAccountForm] = useState({ password: '' })

  // UI states
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  // Mock user data
  const userData = {
    username: 'john_doe',
    email: 'john.doe@example.com',
  }

  const resetForms = () => {
    setChangeNameForm({ newName: '', password: '' })
    setChangeEmailForm({ newEmail: '', password: '' })
    setChangePasswordForm({ oldPassword: '', newPassword: '' })
    setPasswordResetForm({ email: userData.email })
    setDeleteAccountForm({ password: '' })
    setErrors({})
    setSuccess('')
    setShowForgotPassword(false)
  }

  const handleSubmit = async <T extends z.ZodTypeAny>(
    schema: T,
    data: z.infer<T>,
    action: string,
  ) => {
    setLoading(true)
    setErrors({})
    setSuccess('')

    try {
      schema.parse(data)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      switch (action) {
        case 'changeName':
          setSuccess('Name changed successfully!')
          break
        case 'changeEmail':
          setSuccess('Email change confirmation sent to your new email!')
          break
        case 'changePassword':
          setSuccess('Password changed successfully!')
          break
        case 'resetPassword':
          setSuccess('Password reset link sent to your email!')
          break
        case 'deleteAccount':
          setSuccess(
            'Account deletion confirmation sent to your email. Please follow the instructions to complete the process.',
          )
          break
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          fieldErrors[err.path[0] as string] = err.message
        })
        setErrors(fieldErrors)
      }
    } finally {
      setLoading(false)
    }
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
                onClick={() => {
                  setIsChangeNameOpen(true)
                  resetForms()
                }}
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
                onClick={() => {
                  setIsChangeEmailOpen(true)
                  resetForms()
                }}
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
              <div className="space-y-2">
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    setIsChangePasswordOpen(true)
                    resetForms()
                  }}
                >
                  Change password
                </Button>
              </div>
            </div>

            <Separator />

            {/* Delete Account Section */}
            <div className="space-y-2">
              <Button
                variant="link"
                className="p-0 h-auto text-red-600 hover:text-red-800"
                onClick={() => {
                  setIsDeleteAccountOpen(true)
                  resetForms()
                }}
              >
                Delete account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Name Dialog */}
      <Dialog open={isChangeNameOpen} onOpenChange={setIsChangeNameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Name</DialogTitle>
            <DialogDescription>
              Enter your new name and confirm with your password.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <Alert variant="success">
              <Check />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newName">New Name</Label>
                <Input
                  id="newName"
                  value={changeNameForm.newName}
                  onChange={(e) =>
                    setChangeNameForm((prev) => ({
                      ...prev,
                      newName: e.target.value,
                    }))
                  }
                  placeholder="Enter new name"
                />
                {errors.newName && (
                  <p className="text-sm text-red-600">{errors.newName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={changeNameForm.password}
                  onChange={(e) =>
                    setChangeNameForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsChangeNameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  handleSubmit(changeNameSchema, changeNameForm, 'changeName')
                }
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Name'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={isChangeEmailOpen} onOpenChange={setIsChangeEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Enter your new email and confirm with your password.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={changeEmailForm.newEmail}
                  onChange={(e) =>
                    setChangeEmailForm((prev) => ({
                      ...prev,
                      newEmail: e.target.value,
                    }))
                  }
                  placeholder="Enter new email"
                />
                {errors.newEmail && (
                  <p className="text-sm text-red-600">{errors.newEmail}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPasswordEmail">Confirm Password</Label>
                <Input
                  id="confirmPasswordEmail"
                  type="password"
                  value={changeEmailForm.password}
                  onChange={(e) =>
                    setChangeEmailForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsChangeEmailOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  handleSubmit(
                    changeEmailSchema,
                    changeEmailForm,
                    'changeEmail',
                  )
                }
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Email'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              {showForgotPassword
                ? 'Enter your email to receive a password reset link.'
                : 'Enter your current and new password.'}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : showForgotPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  value={passwordResetForm.email}
                  onChange={(e) =>
                    setPasswordResetForm({ email: e.target.value })
                  }
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <Button
                variant="link"
                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                onClick={() => setShowForgotPassword(false)}
              >
                Back to password change
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Current Password</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={changePasswordForm.oldPassword}
                  onChange={(e) =>
                    setChangePasswordForm((prev) => ({
                      ...prev,
                      oldPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter current password"
                />
                {errors.oldPassword && (
                  <p className="text-sm text-red-600">{errors.oldPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={changePasswordForm.newPassword}
                  onChange={(e) =>
                    setChangePasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter new password"
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <Button
                variant="link"
                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot your password?
              </Button>
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  showForgotPassword
                    ? handleSubmit(
                        passwordResetSchema,
                        passwordResetForm,
                        'resetPassword',
                      )
                    : handleSubmit(
                        changePasswordSchema,
                        changePasswordForm,
                        'changePassword',
                      )
                }
                disabled={loading}
              >
                {loading
                  ? 'Processing...'
                  : showForgotPassword
                    ? 'Send Reset Link'
                    : 'Change Password'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm your password to
              proceed.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Account deletion confirmation will be sent to your email.
                  Follow the instructions in the email to complete the deletion
                  process.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="deletePassword">Confirm Password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deleteAccountForm.password}
                  onChange={(e) =>
                    setDeleteAccountForm({ password: e.target.value })
                  }
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteAccountOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  handleSubmit(
                    deleteAccountSchema,
                    deleteAccountForm,
                    'deleteAccount',
                  )
                }
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
