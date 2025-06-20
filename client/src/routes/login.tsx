import { createFileRoute } from "@tanstack/react-router";

import Header from "@/components/Header";
import LoginForm from "@/components/forms/LoginForm";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex justify-center items-center p-4">
        <LoginForm />
      </main>
    </div>
  );
}
