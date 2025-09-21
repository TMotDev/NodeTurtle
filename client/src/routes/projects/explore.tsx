import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Calendar, Grid, Heart, List, Search, User } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { Project } from "@/api/projects";
import useAuthStore from "@/lib/authStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { API } from "@/services/api";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ExploreProjectCard } from "@/components/ExploreProjectCard";
import { useLikedProjects } from "@/hooks/UseLikedProjects";

export const Route = createFileRoute("/projects/explore")({
  component: ExploreProjects,
});

function ExploreProjects() {
  const user = useAuthStore((state) => state.user);
  const [projects, setProjects] = useState<Array<Project>>([]);

  // Use the custom hook for liked projects
  const {
    likedProjectIds,
    likeProject: hookLikeProject,
    unlikeProject: hookUnlikeProject,
    isProjectLiked,
  } = useLikedProjects();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    sortBy: "last_edited_at", // last_edited_at, created_at, likes_count
    sortOrder: "desc", // asc, desc
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProjects = useCallback(
    async (currentFilters: any) => {
      setLoading(true);
      try {
        const queryParams: any = {
          page,
          limit: 10,
          is_public: true,
        };

        // Add sorting
        queryParams.sort_by = currentFilters.sortBy;
        queryParams.sort_order = currentFilters.sortOrder;

        // Add search
        if (currentFilters.search_term) {
          queryParams.search_term = currentFilters.search_term;
        }

        const params = new URLSearchParams(queryParams).toString();
        const result = await API.get(`/projects/public?${params}`);

        if (result.success) {
          if (result.data.projects) {
            setProjects(result.data.projects);
          } else {
            setProjects([]);
          }
          setTotalPages(Math.ceil(result.data.meta.total / queryParams.limit));
        } else {
          toast.error(`Failed to fetch projects. ${result.error}`);
        }
      } catch (err) {
        toast.error("Failed to fetch projects. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [page],
  );

  useEffect(() => {
    fetchProjects(filters);
  }, [filters, page, fetchProjects]);

  const handleSearch = () => {
    setPage(1);
    fetchProjects({ ...filters, search_term: searchTerm });
  };

  const handleFilterChange = (key: "sortBy" | "sortOrder", value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleLikeProject = async (project: Project) => {
    const success = await hookLikeProject(project);
    if (success) {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, likes_count: p.likes_count + 1 } : p)),
      );
    }
  };

  const handleUnlikeProject = async (project: Project) => {
    const success = await hookUnlikeProject(project);
    if (success) {
      // Update the local projects state to reflect the new like count
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, likes_count: p.likes_count - 1 } : p)),
      );
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Toaster richColors position="top-center" expand />
        <div className="pattern px-16 py-8 pb-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Explore Projects</h1>
            <p className="text-muted-foreground mt-2">
              Discover amazing projects created by the community
            </p>
          </div>
          {/* Controls */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Search and View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 flex gap-2 max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-8 bg-background"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  Search
                </Button>
              </div>
            </div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterChange("sortBy", value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_edited_at">Last Edited</SelectItem>
                    <SelectItem value="created_at">Creation Date</SelectItem>
                    <SelectItem value="likes_count">Likes Count</SelectItem>
                  </SelectContent>
                </Select>
                <ToggleGroup
                  type="single"
                  value={filters.sortOrder}
                  onValueChange={(value) => value && handleFilterChange("sortOrder", value)}
                  className="border rounded-md bg-background"
                >
                  <ToggleGroupItem value="desc" aria-label="Descending" size="sm">
                    <ArrowDown className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="asc" aria-label="Ascending" size="sm">
                    <ArrowUp className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading projects...</p>
          </div>
        )}

        {/* Projects Grid/List */}
        {!loading && projects.length > 0 && (
          <div className="flex flex-row gap-6 mb-8 flex-wrap items-center justify-center py-2">
            {projects.map((project) => (
              <ExploreProjectCard
                key={project.id}
                project={project}
                onLike={handleLikeProject}
                onUnlike={handleUnlikeProject}
                isLiked={isProjectLiked(project.id)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "Try adjusting your search or filters"
                : "No public projects are available yet"}
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilters({ sortBy: "last_edited_at", sortOrder: "desc" });
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage((p) => p - 1);
                    }}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        isActive={page === pageNum}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNum);
                        }}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage((p) => p + 1);
                    }}
                    className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="text-center mt-4 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
