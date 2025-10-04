import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Search, Star } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { Project } from "@/api/projects";
import useAuthStore, { Role } from "@/lib/authStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getTimeSince, getTimeUntil, requireAuth } from "@/lib/utils";
import FeatureDialog from "@/components/FeatureDialog";
import { API } from "@/services/api";

export const Route = createFileRoute("/admin/projects")({
  beforeLoad: requireAuth(Role.Admin),
  component: AdminProjects,
});

function AdminProjects() {
  const [projects, setProjects] = useState<Array<Project>>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({
    is_featured: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // dialog states
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const fetchProjects = useCallback(
    async (currentFilters: any) => {
      try {
        const queryParams: any = { page, limit: 10 };

        if (currentFilters.is_featured !== "all")
          queryParams.is_featured = currentFilters.is_featured === "featured";
        if (currentFilters.search_term) queryParams.search_term = currentFilters.search_term;

        const params = new URLSearchParams(queryParams).toString();
        const result = await API.get(`/admin/projects/all?${params}`);

        if (result.success) {
          setProjects(result.data.projects);
          setTotalPages(Math.ceil(result.data.meta.total / 10));
        } else {
          toast.error(`Failed to fetch projects. ${result.error}`);
        }
      } catch (err) {
        toast.error("Failed to fetch projects. Please try again.");
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

  const handleFilterChange = (key: "is_featured", value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusBadges = (project: Project) => {
    const badges = [];

    if (project.featured_until) {
      const isFeaturedActive =
        project.featured_until && new Date(project.featured_until) > new Date();

      if (isFeaturedActive) {
        const timeRemaining = getTimeUntil(project.featured_until);
        badges.push(
          <Badge key="featured" variant="default" className="bg-yellow-500">
            <Star className="w-3 h-3 mr-1" />
            Featured ({timeRemaining})
          </Badge>,
        );
      } else {
        badges.push(
          <Badge
            key="featured-expired"
            variant="outline"
            className="border-orange-500 text-orange-600"
          >
            <Star className="w-3 h-3 mr-1" />
            Featured Expired
          </Badge>,
        );
      }
    }

    return badges;
  };

  const handleFeatureProject = (project: Project) => {
    setSelectedProject(project);
    setFeatureDialogOpen(true);
  };

  const handleUnfeatureProject = async (projectId: string) => {
    const result = await API.patch(`/admin/projects/${projectId}`, {});
    if (result.success) {
      toast.success(`Project successfully unfeatured`);
    } else {
      toast.error(`Error when unfeaturing project: ${result.error}`);
    }
    fetchProjects(filters);
  };

  const handleFeatureDialogClose = () => {
    setFeatureDialogOpen(false);
    setSelectedProject(null);
  };

  const handleFeatureSubmit = () => {
    setFeatureDialogOpen(false);
    setSelectedProject(null);
    fetchProjects(filters);
  };

  const isFeaturedActive = (featuredUntil?: string) => {
    return featuredUntil && new Date(featuredUntil) > new Date();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex justify-center p-4">
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Project Management</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 flex gap-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or creator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
            <Select
              value={filters.is_featured}
              onValueChange={(value) => handleFilterChange("is_featured", value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by featured" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="not_featured">Not Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Edited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium max-w-xs">
                      <Link
                        to="/projects/$projectID"
                        params={{ projectID: project.id }}
                        className="truncate hover:underline decoration-gray-500"
                        title={project.title}
                      >
                        {project.title}
                      </Link>
                      {project.description && (
                        <div
                          className="text-xs text-muted-foreground truncate mt-1"
                          title={project.description}
                        >
                          {project.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className="cursor-pointer hover:text-blue-600"
                        title={`User ID: ${project.creator_id}`}
                      >
                        {project.creator_username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 flex-col">
                        {getStatusBadges(project)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{project.likes_count}</span>
                        <span className="text-red-500">♥</span>
                      </div>
                    </TableCell>
                    <TableCell>{getTimeSince(project.created_at)}</TableCell>
                    <TableCell>{getTimeSince(project.last_edited_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {project.featured_until && isFeaturedActive(project.featured_until) ? (
                            <DropdownMenuItem
                              onClick={() => handleUnfeatureProject(project.id)}
                              className="text-orange-600"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Unfeature Project
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleFeatureProject(project)}
                              className="text-yellow-600"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Feature Project
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={() => setPage((p) => Math.max(1, p - 1))} />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={page === i + 1}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <FeatureDialog
            isOpen={featureDialogOpen}
            selectedProject={selectedProject}
            onClose={handleFeatureDialogClose}
            onSubmit={handleFeatureSubmit}
          />
        </div>
      </main>
    </div>
  );
}
