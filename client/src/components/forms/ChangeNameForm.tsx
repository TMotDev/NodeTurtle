import { useEffect, useState } from "react";
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
import {
  getValidationIcon,
  getValidationMessage,
  usernameSchema,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFieldValidation } from "@/lib/utils";
import useAuthStore from "@/lib/authStore";
import { API } from "@/services/api";

const changeUsernameSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export default function ChangeUsernameForm() {
  const updateUser = useAuthStore((state) => state.updateUser);

  const [isLoading, setIsLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  });

  const { validationState, validateField, setValidationState } =
    useFieldValidation();

  const form = useForm<z.infer<typeof changeUsernameSchema>>({
    resolver: zodResolver(changeUsernameSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const watchedUsername = form.watch("username");

  useEffect(() => {
    if (watchedUsername) {
      validateField("username", watchedUsername, usernameSchema);
    }
  }, [watchedUsername, validateField]);

  async function onSubmit(values: z.infer<typeof changeUsernameSchema>) {
    setIsLoading(true);
    setFormStatus({ success: false, error: null });

    if (validationState.username === "taken") {
      setIsLoading(false);
      return;
    }

    const result = await API.put("/users/me", {
      username: values.username,
      password: values.password,
    });

    if (result.success) {
      updateUser({ username: result.data.username });
      setFormStatus({ success: true, error: null });
      form.reset();
      setValidationState({ username: "idle", email: "idle" });
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
          <AlertDescription>Username change successful</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    {validationState.username !== "idle" && (
                      <p
                        className={`text-xs mt-1 ${
                          validationState.username === "available"
                            ? "text-green-600"
                            : validationState.username === "taken"
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {getValidationMessage(
                          "username",
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
                  "Change Username"
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </>
  );
}
