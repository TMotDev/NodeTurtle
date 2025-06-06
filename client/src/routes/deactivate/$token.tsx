import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import type { FormStatus } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/deactivate/$token')({
  component: DeactivationPage,
})

function DeactivationPage() {
  const { token } = Route.useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  })

  const handleDeactivation = async () => {
    if (!token) {
      setFormStatus({
        success: false,
        error: 'No deactivation token found in URL',
      })
      return
    }

    setIsLoading(true)
    setFormStatus({ success: false, error: null })
    setShowConfirmDialog(false)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/deactivate/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      if (!response.ok) {
        let errorMessage =
          'Unable to deactivate account. Please try again or contact support.'

        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          if (response.status >= 500) {
            errorMessage = 'Server error occurred. Please try again later.'
          } else if (response.status === 404) {
            errorMessage = 'Invalid or expired deactivation link.'
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please try again later.'
          }
        }

        throw new Error(errorMessage)
      }

      setFormStatus({ success: true, error: null })
    } catch (error) {
      let errorMessage =
        'Unable to deactivate account. Please try again or contact support.'

      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          errorMessage =
            'Network error. Please check your connection and try again.'
        } else {
          errorMessage = error.message
        }
      }

      setFormStatus({
        success: false,
        error: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmDialog(true)
  }

  if (formStatus.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Account Deactivated
            </CardTitle>
            <CardDescription>
              Your account has been successfully deactivated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We're sorry to see you go. Your account is now deactivated and
                you will no longer receive notifications or have access to our
                services.
              </p>
              <Link className="btn w-full" to="/">
                Return to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Deactivate Your Account
          </CardTitle>
          <CardDescription>
            This action will permanently deactivate your account and remove
            access to all services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formStatus.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4 stroke-destructive" />
                <AlertDescription className="text-destructive">
                  {formStatus.error}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Before you proceed:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>You will lose access to all your data</li>
                    <li>This action cannot be undone</li>
                    <li>Any active subscriptions will be cancelled</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <AlertDialogTrigger asChild>
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deactivating...
                    </>
                  ) : (
                    'Deactivate Account'
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 stroke-destructive" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently deactivate your account. You will lose
                    access to all your data, and this action cannot be undone.
                    Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeactivation}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deactivating...
                      </>
                    ) : (
                      'Yes, deactivate my account'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
