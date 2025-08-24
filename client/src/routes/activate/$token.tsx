import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import type { FormStatus } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API } from "@/services/api";

export const Route = createFileRoute("/activate/$token")({
  component: ActivationPage,
});

function ActivationPage() {
  const { token } = Route.useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({
    success: false,
    error: null,
  });

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setFormStatus({
        success: false,
        error: "No activation token found in URL",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFormStatus({ success: false, error: null });

    const result = await API.post(`/users/activate/${token}`);

    if (result.success) {
      setFormStatus({ success: true, error: null });
    } else {
      setFormStatus({
        success: false,
        error: result.error || "Unexpected error occured while ",
      });
    }

    setIsLoading(false);
  };

  if (formStatus.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Activation successful
            </CardTitle>
            <CardDescription>Your account has been successfully activated</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="btn w-full" to="/login">
              Go to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activate Your Account</CardTitle>
          <CardDescription>
            Click the button below to activate your account and start using our services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivation} className="space-y-4">
            {formStatus.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4 stroke-destructive" />
                <AlertDescription className="text-destructive">{formStatus.error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Activate Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
