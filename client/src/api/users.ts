import z from "zod";
import {
  buildQueryParams,
  emailSchema,
  handleApiError,
  passwordSchema,
  usernameSchema,
  uuidSchema,
  validateData,
} from "./utils";
import type { PaginatedResponse } from "./utils";
import type { User } from "@/services/api";
import { API } from "@/services/api";

// ===== TYPES & SCHEMAS =====

export type Role = "user" | "admin" | "moderator";

export const roleSchema = z.enum(["user", "admin", "moderator"]);

// User filters for admin
export const userFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  role: z.union([roleSchema, z.literal("all")]).default("all"),
  status: z.enum(["activated", "deactivated", "all"]).default("all"),
  search_term: z.string().optional(),
});

export type UserFilters = z.infer<typeof userFiltersSchema>;

// ===== AUTH OPERATIONS =====

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;

export async function login(data: LoginData): Promise<User> {
  const validatedData = validateData(loginSchema, data);

  const result = await API.post("/auth/session", validatedData);

  if (!result.success) {
    handleApiError(result);
  }

  return result.data;
}

export async function logout(): Promise<void> {
  const result = await API.delete("/auth/session");

  if (!result.success) {
    handleApiError(result);
  }
}

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterData = z.infer<typeof registerSchema>;

export async function register(data: RegisterData): Promise<void> {
  const validatedData = validateData(registerSchema, data);

  const result = await API.post("/users", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export async function getCurrentUser(): Promise<User> {
  const result = await API.get("/users/me");

  if (!result.success) {
    handleApiError(result);
  }

  return result.data;
}

// ===== ACTIVATION & PASSWORD RESET =====

export const activationRequestSchema = z.object({
  email: emailSchema,
});

export type ActivationRequestData = z.infer<typeof activationRequestSchema>;

export async function requestActivation(data: ActivationRequestData): Promise<void> {
  const validatedData = validateData(activationRequestSchema, data);

  const result = await API.post("/auth/activate", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export async function activateAccount(token: string): Promise<void> {
  const result = await API.post(`/users/activate/${token}`);

  if (!result.success) {
    handleApiError(result);
  }
}

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;

export async function requestPasswordReset(data: PasswordResetRequestData): Promise<void> {
  const validatedData = validateData(passwordResetRequestSchema, data);

  const result = await API.post("/password/request-reset", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export const passwordResetSchema = z.object({
  password: passwordSchema,
});

export type PasswordResetData = z.infer<typeof passwordResetSchema>;

export async function resetPassword(token: string, data: PasswordResetData): Promise<void> {
  const validatedData = validateData(passwordResetSchema, data);

  const result = await API.put(`/password/reset/${token}`, validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

// ===== USER PROFILE OPERATIONS =====

export const changeEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type ChangeEmailData = z.infer<typeof changeEmailSchema>;

export async function changeEmail(data: ChangeEmailData): Promise<void> {
  const validatedData = validateData(changeEmailSchema, data);

  const result = await API.post("/users/me", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export const changeUsernameSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export type ChangeUsernameData = z.infer<typeof changeUsernameSchema>;

export async function changeUsername(data: ChangeUsernameData): Promise<void> {
  const validatedData = validateData(changeUsernameSchema, data);

  const result = await API.put("/users/me", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Old password is required"),
  new_password: passwordSchema,
});

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export async function changePassword(data: ChangePasswordData): Promise<void> {
  const validatedData = validateData(changePasswordSchema, data);

  const result = await API.put("/users/me/password", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export const deactivateAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type DeactivateAccountData = z.infer<typeof deactivateAccountSchema>;

export async function deactivateAccount(data: DeactivateAccountData): Promise<void> {
  const validatedData = validateData(deactivateAccountSchema, data);

  const result = await API.post("/users/me/deactivate", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export async function confirmDeactivation(token: string): Promise<void> {
  const result = await API.post(`/auth/deactivate/${token}`);

  if (!result.success) {
    handleApiError(result);
  }
}

// ===== AVAILABILITY CHECKS =====

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const result = await API.get(`/users/username/${encodeURIComponent(username)}`);

  if (!result.success) {
    handleApiError(result);
  }

  return result.data.available;
}

export async function checkEmailAvailability(email: string): Promise<boolean> {
  const result = await API.get(`/users/email/${encodeURIComponent(email)}`);

  if (!result.success) {
    handleApiError(result);
  }

  return result.data.available;
}

// ===== ADMIN OPERATIONS =====

export async function getAllUsers(
  filters: Partial<UserFilters> = {},
): Promise<PaginatedResponse<User>> {
  const validatedFilters = validateData(userFiltersSchema, filters);

  const queryParams: Record<string, any> = {
    page: validatedFilters.page,
    limit: validatedFilters.limit,
  };

  if (validatedFilters.role !== "all") {
    queryParams.role = validatedFilters.role;
  }

  if (validatedFilters.status !== "all") {
    queryParams.activated = validatedFilters.status === "activated";
  }

  if (validatedFilters.search_term) {
    queryParams.search_term = validatedFilters.search_term;
  }

  const queryString = buildQueryParams(queryParams);
  const result = await API.get(`/admin/users/all${queryString}`);

  if (!result.success) {
    handleApiError(result);
  }

  return {
    data: result.data.users,
    meta: result.data.meta,
  };
}

export const changeUserRoleSchema = z.object({
  role: roleSchema,
});

export type ChangeUserRoleData = z.infer<typeof changeUserRoleSchema>;

export async function changeUserRole(userId: string, data: ChangeUserRoleData): Promise<void> {
  const validatedUserId = validateData(uuidSchema, userId);
  const validatedData = validateData(changeUserRoleSchema, data);

  const result = await API.put(`/admin/users/${validatedUserId}`, validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export const banUserSchema = z.object({
  reason: z.string().min(1, "Ban reason is required"),
  user_id: uuidSchema,
  duration: z.string().optional(), // Duration string like "7d", "30d", etc.
});

export type BanUserData = z.infer<typeof banUserSchema>;

export async function banUser(data: BanUserData): Promise<void> {
  const validatedData = validateData(banUserSchema, data);

  const result = await API.post("/admin/users/ban", validatedData);

  if (!result.success) {
    handleApiError(result);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const validatedUserId = validateData(uuidSchema, userId);

  const result = await API.delete(`/admin/users/ban/${validatedUserId}`);

  if (!result.success) {
    handleApiError(result);
  }
}
