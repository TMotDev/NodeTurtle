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
import type { FormStatus } from '@/lib/validation'
import {
  emailSchema,
  getValidationIcon,
  getValidationMessage,
} from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFieldValidation } from '@/lib/utils'

const changeEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export default function ChangeEmailForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  })

  const { validationState, validateField, setValidationState } =
    useFieldValidation()

  const form = useForm<z.infer<typeof changeEmailSchema>>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const watchedEmail = form.watch('email')

  useEffect(() => {
    if (watchedEmail) {
      validateField('email', watchedEmail, emailSchema)
    }
  }, [watchedEmail, validateField])

  async function onSubmit(values: z.infer<typeof changeEmailSchema>) {
    setIsLoading(true)
    setFormStatus({ success: false, error: null })

    if (validationState.email === 'taken') {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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

  return (
    <>
      {formStatus.success ? (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>Email change successful</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getValidationIcon(validationState.email)}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {validationState.email !== 'idle' && (
                      <p
                        className={`text-xs mt-1 ${
                          validationState.email === 'available'
                            ? 'text-green-600'
                            : validationState.email === 'taken'
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {getValidationMessage('email', validationState.email)}
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
                  <AlertTriangle className="h-4 w-4 stroke-destructive" />
                  <AlertDescription className="text-destructive">
                    {formStatus.error}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Email'
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </>
  )
}
