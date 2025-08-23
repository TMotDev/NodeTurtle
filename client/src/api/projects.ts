import { z } from "zod";
import { buildQueryParams, handleApiError, uuidSchema, validateData } from "./utils";
import type { ApiResponse, PaginatedResponse } from "./utils";

import { API } from "@/services/api";

// ===== TYPES & SCHEMAS =====

export interface Project{
  id: string;
  title: string;
  description: string;
  data?: Flow; // react-flow JSON data
  creator_id: string;
  creator_username: string;
  likes_count: number;
  featured_until?: string;
  created_at: string;
  last_edited_at: string;
  is_public: boolean;
};

export interface Flow {
  nodes: Array<any>;
  edges: Array<any>;
  viewport: any;
  nodeCount: number;
}


export type ProjectLike = {
  project_id: string;
  user_id: string;
  created_at: string;
};

// Project validation schemas
export const projectTitleSchema = z
  .string()
  .min(3, "Title must be at least 3 characters")
  .max(100, "Title must be at most 100 characters");

export const projectDescriptionSchema = z
  .string()
  .max(5000, "Description must be at most 5000 characters")
  .optional();

export const createProjectSchema = z.object({
  title: projectTitleSchema,
  description: projectDescriptionSchema,
  is_public: z.boolean(),
  data: z.any().optional(), // react-flow data
});

export type CreateProjectData = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  title: projectTitleSchema.optional(),
  description: projectDescriptionSchema,
  is_public: z.boolean().optional(),
  data: z.any().optional(), // react-flow data
});

export type UpdateProjectData = z.infer<typeof updateProjectSchema>;

// Project filters
export const projectFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search_term: z.string().optional(),
  sort_field: z.enum(["created_at", "likes_count"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;

// ===== PROJECT CRUD OPERATIONS =====

export async function createProject(data: CreateProjectData): Promise<Project> {
  const validatedData = validateData(createProjectSchema, data);

  const result = await API.post("/projects", validatedData);

  if (!result.success) {
    handleApiError(result);
  }

  return result.data;
}

export async function getProject(projectId: string): Promise<Project> {
  const validatedId = validateData(uuidSchema, projectId);

  const result = await API.get(`/projects/${validatedId}`);

  if (!result.success) {
    handleApiError(result);
  }

  return result.data;
}

export async function updateProject(projectId: string, data: UpdateProjectData): Promise<Project> {
  const validatedId = validateData(uuidSchema, projectId);
  const validatedData = validateData(updateProjectSchema, data);

  const result = await API.put(`/projects/${validatedId}`, validatedData);

  if (!result.success) {
    handleApiError(result);
  }

  return result.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  const validatedId = validateData(uuidSchema, projectId);

  const result = await API.delete(`/projects/${validatedId}`);

  if (!result.success) {
    handleApiError(result);
  }
}

// ===== PROJECT LISTING =====

export async function getPublicProjects(
  filters: Partial<ProjectFilters> = {},
): Promise<PaginatedResponse<Project>> {
  const validatedFilters = validateData(projectFiltersSchema, filters);

  const queryParams: Record<string, any> = {
    page: validatedFilters.page,
    limit: validatedFilters.limit,
    sort_field: validatedFilters.sort_field,
    sort_order: validatedFilters.sort_order,
  };

  if (validatedFilters.search_term) {
    queryParams.search_term = validatedFilters.search_term;
  }

  const queryString = buildQueryParams(queryParams);
  const result = await API.get(`/projects/public${queryString}`);

  if (!result.success) {
    handleApiError(result);
  }

  return {
    data: result.data.projects,
    meta: result.data.meta,
  };
}

export async function getUserProjects(
  filters: Partial<ProjectFilters> = {},
): Promise<PaginatedResponse<Project>> {
  const validatedFilters = validateData(projectFiltersSchema, filters);

  const queryParams: Record<string, any> = {
    page: validatedFilters.page,
    limit: validatedFilters.limit,
    sort_field: validatedFilters.sort_field,
    sort_order: validatedFilters.sort_order,
  };

  if (validatedFilters.search_term) {
    queryParams.search_term = validatedFilters.search_term;
  }

  const queryString = buildQueryParams(queryParams);
  const result = await API.get(`/projects/me${queryString}`);

  if (!result.success) {
    handleApiError(result);
  }

  return {
    data: result.data.projects,
    meta: result.data.meta,
  };
}

export async function getFeaturedProjects(
  filters: Partial<ProjectFilters> = {},
): Promise<PaginatedResponse<Project>> {
  const validatedFilters = validateData(projectFiltersSchema, filters);

  const queryParams: Record<string, any> = {
    page: validatedFilters.page,
    limit: validatedFilters.limit,
  };

  const queryString = buildQueryParams(queryParams);
  const result = await API.get(`/projects/featured${queryString}`);

  if (!result.success) {
    handleApiError(result);
  }

  return {
    data: result.data.projects,
    meta: result.data.meta,
  };
}

// ===== PROJECT LIKES =====

export async function likeProject(projectId: string): Promise<void> {
  const validatedId = validateData(uuidSchema, projectId);

  const result = await API.post(`/projects/${validatedId}/like`);

  if (!result.success) {
    handleApiError(result);
  }
}

export async function unlikeProject(projectId: string): Promise<void> {
  const validatedId = validateData(uuidSchema, projectId);

  const result = await API.delete(`/projects/${validatedId}/like`);

  if (!result.success) {
    handleApiError(result);
  }
}

export async function getUserLikedProjects(
  filters: Partial<ProjectFilters> = {},
): Promise<PaginatedResponse<Project>> {
  const validatedFilters = validateData(projectFiltersSchema, filters);

  const queryParams: Record<string, any> = {
    page: validatedFilters.page,
    limit: validatedFilters.limit,
    sort_field: validatedFilters.sort_field,
    sort_order: validatedFilters.sort_order,
  };

  const queryString = buildQueryParams(queryParams);
  const result = await API.get(`/projects/liked${queryString}`);

  if (!result.success) {
    handleApiError(result);
  }

  return {
    data: result.data.projects,
    meta: result.data.meta,
  };
}

// ===== PROJECT STATISTICS =====

export async function getProjectStats(projectId: string): Promise<{
  views: number;
  likes: number;
  created_at: string;
  last_edited_at: string;
}> {
  const validatedId = validateData(uuidSchema, projectId);

  const result = await API.get(`/projects/${validatedId}/stats`);

  if (!result.success) {
    handleApiError(result);
  }

  return result.data;
}

// ===== ADMIN OPERATIONS =====

export async function featureProject(projectId: string, duration: string): Promise<void> {
  const validatedId = validateData(uuidSchema, projectId);

  const result = await API.post(`/admin/projects/${validatedId}/feature`, {
    duration,
  });

  if (!result.success) {
    handleApiError(result);
  }
}

export async function unfeatureProject(projectId: string): Promise<void> {
  const validatedId = validateData(uuidSchema, projectId);

  const result = await API.delete(`/admin/projects/${validatedId}/feature`);

  if (!result.success) {
    handleApiError(result);
  }
}

export async function getAllProjects(
  filters: Partial<ProjectFilters> = {},
): Promise<PaginatedResponse<Project>> {
  const validatedFilters = validateData(projectFiltersSchema, filters);

  const queryParams: Record<string, any> = {
    page: validatedFilters.page,
    limit: validatedFilters.limit,
    sort_field: validatedFilters.sort_field,
    sort_order: validatedFilters.sort_order,
  };

  if (validatedFilters.search_term) {
    queryParams.search_term = validatedFilters.search_term;
  }

  const queryString = buildQueryParams(queryParams);
  const result = await API.get(`/admin/projects${queryString}`);

  if (!result.success) {
    handleApiError(result);
  }

  return {
    data: result.data.projects,
    meta: result.data.meta,
  };
}
