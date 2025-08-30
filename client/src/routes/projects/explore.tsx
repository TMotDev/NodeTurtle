import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Grid,
  Heart,
  List,
  Search,
  User,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { getTimeSince } from "@/lib/utils";
import { API } from "@/services/api";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/projects/explore")({
  component: ExploreProjects,
});

const ExploreProjectCard = ({
  project,
  onLike,
  onUnlike,
  isLiked,
  viewMode = "grid",
}: {
  project: Project;
  onLike: (p: Project) => void;
  onUnlike: (p: Project) => void;
  isLiked: boolean;
  viewMode?: "grid" | "list";
}) => {
  const user = useAuthStore((state) => state.user);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please log in to like projects");
      return;
    }
    if (isLiked) {
      onUnlike(project);
    } else {
      onLike(project);
    }
  };

  if (viewMode === "list") {
    return (
      <a
        href={`/projects/${project.id}`}
        className="block self-center min-w-64 justify-self-center p-4 rounded-lg border bg-white hover:shadow-md transition-all duration-200 hover:border-blue-300"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate" title={project.title}>
                  {project.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{project.creator_username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Created {getTimeSince(project.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Updated {getTimeSince(project.last_edited_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handleLikeClick}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    isLiked
                      ? "text-red-600 bg-red-50 hover:bg-red-100"
                      : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                  <span className="text-sm">{project.likes_count}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={`/projects/${project.id}`}
      className="block w-full max-w-sm rounded-lg border bg-white hover:shadow-lg transition-all duration-200 hover:border-blue-300 overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold line-clamp-2 flex-1 pr-2" title={project.title}>
            {project.title}
          </h3>
          <button
            onClick={handleLikeClick}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors flex-shrink-0 ${
              isLiked
                ? "text-red-600 bg-red-50 hover:bg-red-100"
                : "text-gray-600 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-sm">{project.likes_count}</span>
          </button>
        </div>

        <p className="text-sm text-gray-600 line-clamp-3 mb-4">{project.description}</p>

        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate">by {project.creator_username}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Created {getTimeSince(project.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Updated {getTimeSince(project.last_edited_at)}</span>
          </div>
        </div>

        {project.featured_until && new Date(project.featured_until) > new Date() && (
          <div className="mt-3">
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Featured</Badge>
          </div>
        )}
      </div>
    </a>
  );
};

function ExploreProjects() {
  const user = useAuthStore((state) => state.user);
  const [projects, setProjects] = useState<Array<Project>>([]);
  const [likedProjects, setLikedProjects] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
          limit: viewMode === "grid" ? 12 : 10,
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
          setProjects(result.data.projects);
          setTotalPages(Math.ceil(result.data.meta.total / queryParams.limit));

          // Fetch user's liked projects if logged in
          if (user) {
            const likedResult = await API.get(`/users/${user.id}/liked-projects`);
            if (likedResult.success) {
              const likedIds = new Set<string>(likedResult.data.projects.map((p: Project) => p.id));
              setLikedProjects(likedIds);
            }
          }
        } else {
          toast.error(`Failed to fetch projects. ${result.error}`);
        }
      } catch (err) {
        toast.error("Failed to fetch projects. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [page, user, viewMode],
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
    if (!user) return;

    try {
      const result = await API.post(`/projects/${project.id}/likes`);
      if (result.success) {
        setLikedProjects((prev) => new Set(prev).add(project.id));
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, likes_count: p.likes_count + 1 } : p)),
        );
        toast.success("Project liked!");
      } else {
        toast.error("Failed to like project");
      }
    } catch (err) {
      toast.error("Failed to like project");
    }
  };

  const handleUnlikeProject = async (project: Project) => {
    if (!user) return;

    try {
      const result = await API.delete(`/projects/${project.id}/likes`);
      if (result.success) {
        setLikedProjects((prev) => {
          const newSet = new Set(prev);
          newSet.delete(project.id);
          return newSet;
        });
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, likes_count: p.likes_count - 1 } : p)),
        );
        toast.success("Project unliked!");
      } else {
        toast.error("Failed to unlike project");
      }
    } catch (err) {
      toast.error("Failed to unlike project");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Toaster richColors position="top-center" expand />

        <div className="container mx-auto py-8 px-4">
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
                  className="pl-8"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  Search
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
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
                  className="border rounded-md"
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

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading projects...</p>
            </div>
          )}

          {/* Projects Grid/List */}
          {!loading && projects.length > 0 && (
            <div
              className={
                viewMode === "grid"
                  ? "flex flex-row gap-6 mb-8 flex-wrap items-center justify-center"
                  : "space-y-4 mb-8"
              }
            >
              {projects.map((project) => (
                <ExploreProjectCard
                  key={project.id}
                  project={project}
                  onLike={handleLikeProject}
                  onUnlike={handleUnlikeProject}
                  isLiked={likedProjects.has(project.id)}
                  viewMode={viewMode}
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
        </div>
      </main>
    </div>
  );
}
