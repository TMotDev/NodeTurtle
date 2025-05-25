import { Link, createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod' // Using the specific import path you provided

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const registrationSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: 'Username must be at least 3 characters long.' })
      .max(20, { message: 'Username must be at most 20 characters long.' })
      .regex(/^[a-zA-Z0-9]+$/, {
        message: 'Username can only contain alphanumeric characters.',
      }),
    email: z
      .string()
      .email({ message: 'Please enter a valid email address.' })
      .min(1),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long.' }),
    repeatPassword: z
      .string()
      .min(8, {
        message: 'Password confirmation must be at least 8 characters long.',
      }),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords don't match.",
    path: ['repeatPassword'],
  })

export const Route = createFileRoute('/login')({
  component: RegistrationFormComponent,
})

function RegistrationFormComponent() {
  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      repeatPassword: '',
    },
  })

  function onSubmit(values: z.infer<typeof registrationSchema>) {
    // Handle form submission, e.g., send data to your API
    // Exclude repeatPassword if your backend doesn't expect it
    const { repeatPassword, ...submissionData } = values
    console.log('Form submitted with:', submissionData)
    // Example: alert(JSON.stringify(submissionData, null, 2));
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          {/* Optional: You can add a CardDescription here if needed */}
          {/* <CardDescription>Enter your details below to get started.</CardDescription> */}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p>
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
