import { createFileRoute } from "@tanstack/react-router";

import Header from "@/components/Header";
import RegisterForm from "@/components/forms/RegisterForm";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex justify-center items-center p-4">
        <RegisterForm />
      </main>
    </div>
  );
}
