import { useState } from 'react'
import { z } from 'zod'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form' // Assuming path is correct
import type { Dispatch, SetStateAction } from 'react'
import type { FormStatus } from '@/lib/validation' // Assuming FormStatus type is defined here
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

const deactivateAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export default function DeactivateAccountForm({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  })

  const form = useForm<z.infer<typeof deactivateAccountSchema>>({
    resolver: zodResolver(deactivateAccountSchema),
    defaultValues: {
      password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof deactivateAccountSchema>) {
    setIsLoading(true)
    setFormStatus({ success: false, error: null })

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/me/deactivate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(values),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setFormStatus({
          success: false,
          error:
            errorData.message ||
            'Failed to request account deactivation. Please try again.',
        })
      } else {
        setFormStatus({ success: true, error: null })
        form.reset()
      }
    } catch (error) {
      setFormStatus({
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
      setFormStatus({ success: false, error: null })
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Deactivate Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please confirm your password to
            proceed. Account deactivation confirmation will be sent to your
            email. Follow the instructions in the email to complete the
            deactivation process.
          </DialogDescription>
        </DialogHeader>

        {formStatus.success ? (
          <Alert variant="success">
            <Check className="h-4 w-4" />
            <AlertDescription>
              Account deactivation request sent successfully! Please check your
              email to complete the process.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Account deactivation confirmation will be sent to your email.
                Follow the instructions in the email to complete the
                deactivation process.
              </AlertDescription>
            </Alert>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {formStatus.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 stroke-destructive" />
                    <AlertDescription className="text-destructive">
                      {formStatus.error}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  variant="destructive"
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Deactivate Account'
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
