import { useEffect, useState } from 'react'
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
} from '../ui/form'
import type { Dispatch, SetStateAction } from 'react'
import type { FormStatus } from '@/lib/validation'
import {
  getValidationIcon,
  getValidationMessage,
  usernameSchema,
} from '@/lib/validation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFieldValidation } from '@/lib/utils'

const changeUsernameSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
})

export default function ChangeUsernameForm({
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

  const { validationState, validateField, setValidationState } =
    useFieldValidation()

  const form = useForm<z.infer<typeof changeUsernameSchema>>({
    resolver: zodResolver(changeUsernameSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const watchedUsername = form.watch('username')

  useEffect(() => {
    if (watchedUsername) {
      validateField('username', watchedUsername, usernameSchema)
    }
  }, [watchedUsername, validateField])

  useEffect(() => {
    if (!isOpen) {
      form.reset()
      setFormStatus({ success: false, error: null })
      setValidationState({ username: 'idle', email: 'idle' })
    }
  }, [isOpen])

  async function onSubmit(values: z.infer<typeof changeUsernameSchema>) {
    setIsLoading(true)
    setFormStatus({ success: false, error: null })

    if (validationState.username === 'taken') {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        setFormStatus({
          success: false,
          error:
            errorData.message ||
            'An unexpected error occurred. Please try again.',
        })
      } else {
        setFormStatus({ success: true, error: null })
        form.reset()
        setValidationState({ username: 'idle', email: 'idle' })
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
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Username</DialogTitle>
          <DialogDescription>
            Enter your new username and confirm with your password.
          </DialogDescription>
        </DialogHeader>

        {formStatus.success ? (
          <Alert variant="success">
            <Check className="h-4 w-4" />
            <AlertDescription>Username change successful</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Username</FormLabel>

                      <FormControl>
                        <div className="relative">
                          <Input {...field} />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {getValidationIcon(validationState.username)}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                      {validationState.username !== 'idle' && (
                        <p
                          className={`text-xs mt-1 ${
                            validationState.username === 'available'
                              ? 'text-green-600'
                              : validationState.username === 'taken'
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {getValidationMessage(
                            'username',
                            validationState.username,
                          )}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {formStatus.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{formStatus.error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change Username'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
