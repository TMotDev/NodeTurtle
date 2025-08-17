import { z } from "zod";

// Common response types
export type ApiResponse<T = any> = { success: true; data: T } | { success: false; error: string };

export type PaginatedResponse<T> = {
  data: Array<T>;
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
};

// Common validation schemas
export const emailSchema = z.string().email("Invalid email format");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, hyphens, and underscores",
  );

// UUID validation
export const uuidSchema = z.string().uuid("Invalid UUID format");

// Common utility functions
export function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "boolean") {
        searchParams.append(key, value.toString());
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

// Error handling utilities
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(result: ApiResponse): never {
  throw new ApiError(result.success ? "Unknown error" : result.error);
}

// Validation helper
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new ApiError(`Validation failed: ${errorMessages}`);
    }
    throw error;
  }
}
