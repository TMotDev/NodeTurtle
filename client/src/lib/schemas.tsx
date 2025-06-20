import z from "zod";
import { AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react";
import type { ValidationStatus } from "./utils";

export type FormStatus = {
  success: boolean;
  error: string | null;
};

export const usernameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters long." })
  .max(20, { message: "Username must be at most 20 characters long." })
  .regex(/^[a-zA-Z0-9]+$/, {
    message: "Username can only contain alphanumeric characters.",
  });

export const emailSchema = z
  .string()
  .email({ message: "Please enter a valid email address." })
  .min(1);

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long." });

export const getValidationIcon = (status: ValidationStatus) => {
  switch (status) {
    case "checking":
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case "available":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "taken":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

export const getValidationMessage = (
  field: "username" | "email",
  status: ValidationStatus,
) => {
  switch (status) {
    case "checking":
      return `Checking ${field} availability...`;
    case "available":
      return `${field === "username" ? "Username" : "Email"} is available`;
    case "taken":
      return `This ${field} is already taken`;
    case "error":
      return `Could not verify ${field} availability`;
    default:
      return "";
  }
};
