import { Link, createFileRoute } from "@tanstack/react-router";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Header from "@/components/Header";
import LoginForm from "@/components/forms/LoginForm";
import { Button } from "@/components/ui/button";
import ResetPasswordForm from "@/components/forms/ResetPasswordForm";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col justify-center items-center p-4">
        <LoginForm />
        <div className="flex flex-col gap-2">
          <p className="flex gap-2 font-medium">
            Don't have an account?
            <Link to="/register" className="font-medium text-primary underline">
              Register
            </Link>
          </p>
          <Button
            variant="link"
            className="p-0 h-auto underline font-medium"
            onClick={() => setIsResetDialogOpen(true)}
          >
            Forgot password?
          </Button>
        </div>
      </main>
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email to receive a password reset link.
            </DialogDescription>
          </DialogHeader>
          <ResetPasswordForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
