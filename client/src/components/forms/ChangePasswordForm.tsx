import { useState } from 'react'
import { z } from 'zod'
import { AlertTriangle, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
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
import { passwordSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: passwordSchema,
    repeat_new_password: z.string(),
  })
  .refine((data) => data.new_password === data.repeat_new_password, {
    message: "Passwords don't match.",
    path: ['repeat_new_password'],
  })

export default function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  })

  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      repeat_new_password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof changePasswordSchema>) {
    setIsLoading(true)
    setFormStatus({ success: false, error: null })

    const { repeat_new_password, ...data } = values

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/me/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        },
      )

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
          <AlertDescription>Password changed successfully!</AlertDescription>
        </Alert>
      ) : (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="old_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
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
              <FormField
                control={form.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="repeat_new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
                  'Change Password'
                )}
              </Button>
            </form>
          </Form>
        </>
      )}
    </>
  )
}
