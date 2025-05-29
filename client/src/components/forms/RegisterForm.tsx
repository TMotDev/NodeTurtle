import { AlertTriangle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { FormStatus } from '@/lib/validation'
import {
  emailSchema,
  getValidationIcon,
  getValidationMessage,
  passwordSchema,
  usernameSchema,
} from '@/lib/validation'
import { useFieldValidation } from '@/lib/utils'

const registrationSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords don't match.",
    path: ['repeatPassword'],
  })

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  })

  const [showPassword, setShowPassword] = useState(false)

  const { validationState, validateField, setValidationState } =
    useFieldValidation()

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      repeatPassword: '',
    },
  })

  const watchedUsername = form.watch('username')
  const watchedEmail = form.watch('email')

  useEffect(() => {
    if (watchedUsername) {
      validateField('username', watchedUsername, usernameSchema)
    }
  }, [watchedUsername, validateField])

  useEffect(() => {
    if (watchedEmail) {
      validateField('email', watchedEmail, emailSchema)
    }
  }, [watchedEmail, validateField])

  async function onSubmit(values: z.infer<typeof registrationSchema>) {
    setIsLoading(true)
    setFormStatus({ success: false, error: null })

    if (
      validationState.username === 'taken' ||
      validationState.email === 'taken'
    ) {
      setIsLoading(false)
      return
    }

    const { repeatPassword, ...data } = values

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
    <Card className="w-full max-w-md border-none shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your details below to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formStatus.success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Account registered successfully! Please check your email for
              confirmation.
            </AlertDescription>
          </Alert>
        )}

        {formStatus.error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 stroke-destructive" />
            <AlertDescription className="text-destructive">
              {formStatus.error}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
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
                  <FormLabel>Password</FormLabel>
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
              name="repeatPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeat password</FormLabel>
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
            <Button
              size="lg"
              disabled={
                isLoading ||
                validationState.username === 'taken' ||
                validationState.email === 'taken' ||
                validationState.username === 'checking' ||
                validationState.email === 'checking'
              }
              type="submit"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <p className="flex gap-2">
          Already registered?
          <Link to="/login" className="font-medium text-primary underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
