import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import z from "zod";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";

import { Button } from "../ui/button";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import RequestActivationForm from "./RequestActivationForm";
import type { FormStatus } from "@/lib/schemas";
import type { Role, User } from "@/lib/authStore";
import useAuthStore from "@/lib/authStore";
import { API, ERROR_CODES } from "@/services/api";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string(),
});

export default function LoginForm() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const [isActivationFormOpen, setIsActivationFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  });

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setFormStatus({ success: false, error: null });

    const result = await API.post("/auth/session", {
      email: values.email,
      password: values.password,
    });

    if (result.success) {
      const userData: User = {
        username: result.data.user.username,
        email: result.data.user.email,
        id: result.data.user.id,
        role: result.data.user.role as Role,
      };
      setUser(userData);
      setFormStatus({ success: true, error: null });
      navigate({ to: "/" });
    } else {
      setFormStatus({
        success: false,
        error: result.error,
      });
    }
    setIsLoading(false);
  }

  return (
    <>
      <Card className="w-full max-w-md bg-background border-none shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          {formStatus.error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 stroke-destructive" />
              <AlertDescription className="text-destructive">
                {formStatus.error === ERROR_CODES.INACTIVE_ACCOUNT ? (
                  <span>
                    Account is not activated,
                    <u
                      className="pl-1 underline-offset-2 hover:text-red-900 cursor-pointer"
                      onClick={() => setIsActivationFormOpen(true)}
                    >
                      send activation email
                    </u>
                  </span>
                ) : (
                  formStatus.error
                )}
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} />
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
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
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
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Dialog open={isActivationFormOpen} onOpenChange={setIsActivationFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resend Activation Link</DialogTitle>
            <DialogDescription>
              Enter your email to send a new account activation link.
            </DialogDescription>
          </DialogHeader>
          <RequestActivationForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
