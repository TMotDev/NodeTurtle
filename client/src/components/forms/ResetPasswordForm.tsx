import { useState } from "react";
import { z } from "zod";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import type { FormStatus } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API } from "@/services/api";

const passwordResetSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export default function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  });

  const form = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof passwordResetSchema>) {
    setIsLoading(true);
    setFormStatus({ success: false, error: null });

    const result = await API.post("/password/request-reset", {
      email: values.email,
    });

    if (result.success) {
      setFormStatus({ success: true, error: null });
      form.reset();
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
      {formStatus.success ? (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>
            Password reset email sent successfully! Check your inbox.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {formStatus.error && (
            <Alert variant="destructive">
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </Form>
        </>
      )}
    </>
  );
}
