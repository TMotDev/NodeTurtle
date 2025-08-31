import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Project } from "@/api/projects";
import { API } from "@/services/api";
import useAuthStore from "@/lib/authStore";

interface UseLikedProjectsReturn {
  likedProjectIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  likeProject: (project: Project) => Promise<boolean>;
  unlikeProject: (project: Project) => Promise<boolean>;
  isProjectLiked: (projectId: string) => boolean;
  refreshLikedProjects: () => Promise<void>;
}

export const useLikedProjects = (): UseLikedProjectsReturn => {
  const user = useAuthStore((state) => state.user);
  const [likedProjectIds, setLikedProjectIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLikedProjects = useCallback(async () => {
    if (!user) {
      setLikedProjectIds(new Set());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await API.get(`/users/${user.id}/liked-projects`);

      if (result.success) {
        const likedIds = new Set<string>(
          result.data.projects.map((project: Project) => project.id),
        );
        setLikedProjectIds(likedIds);
      } else {
        setError(result.error || "Failed to fetch liked projects");
      }
    } catch (err) {
      const errorMessage = "Failed to fetch liked projects";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const likeProject = useCallback(
    async (project: Project): Promise<boolean> => {
      if (!user) {
        toast.error("Please log in to like projects");
        return false;
      }

      try {
        const result = await API.post(`/projects/${project.id}/likes`);

        if (result.success) {
          setLikedProjectIds((prev) => new Set(prev).add(project.id));
          toast.success("Project liked!");
          return true;
        } else {
          toast.error("Failed to like project");
          return false;
        }
      } catch (err) {
        toast.error("Failed to like project");
        return false;
      }
    },
    [user],
  );

  const unlikeProject = useCallback(
    async (project: Project): Promise<boolean> => {
      if (!user) {
        toast.error("Please log in to unlike projects");
        return false;
      }

      try {
        const result = await API.delete(`/projects/${project.id}/likes`);

        if (result.success) {
          setLikedProjectIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(project.id);
            return newSet;
          });
          toast.success("Project unliked!");
          return true;
        } else {
          toast.error("Failed to unlike project");
          return false;
        }
      } catch (err) {
        toast.error("Failed to unlike project");
        return false;
      }
    },
    [user],
  );

  const isProjectLiked = useCallback(
    (projectId: string): boolean => {
      return likedProjectIds.has(projectId);
    },
    [likedProjectIds],
  );

  const refreshLikedProjects = useCallback(async () => {
    await fetchLikedProjects();
  }, [fetchLikedProjects]);

  // Fetch liked projects when user changes
  useEffect(() => {
    fetchLikedProjects();
  }, [fetchLikedProjects]);

  return {
    likedProjectIds,
    isLoading,
    error,
    likeProject,
    unlikeProject,
    isProjectLiked,
    refreshLikedProjects,
  };
};
