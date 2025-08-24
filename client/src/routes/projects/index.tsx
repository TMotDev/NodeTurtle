import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/api/projects";
import Header from "@/components/Header";
import EditProjectForm from "@/components/forms/EditProjectForm";
import DeleteProjectForm from "@/components/forms/DeleteProjectForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddProjectForm from "@/components/forms/AddProjectForm";
import { API } from "@/services/api";
import useAuthStore, { Role } from "@/lib/authStore";
import { requireAuth } from "@/lib/utils";
import { ProjectCard } from "@/components/ProjectCard";

export const Route = createFileRoute("/projects/")({
  beforeLoad: requireAuth(Role.User),
  component: ProjectPage,
});

function ProjectPage() {
  const contextUser = useAuthStore((state) => state.user);

  const [userProjects, setUserProjects] = useState<Array<Project>>([]);
  const [likedProjects, setLikedProjects] = useState<Array<Project>>([]);

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleUnlike = async (project: Project) => {
    const result = await API.delete(`/projects/${project.id}/likes`);

    if (result.success) {
      fetchLikedProjects();
      toast.success("Project unliked successfully");
    } else {
      toast.error(`Failed to unlike project. ${result.error}`);
    }
  };

  // TODO: tanstack query to refetch data after changes
  const fetchProjects = useCallback(async () => {
    const result = await API.get(`/users/${contextUser?.id}/projects`);

    console.log(result)
    if (result.success) {
      setUserProjects(result.data.projects);
    } else {
      toast.error(`Failed to fetch users. ${result.error}`);
    }
  }, [contextUser?.id]);

  const fetchLikedProjects = useCallback(async () => {
    const result = await API.get(`/users/${contextUser?.id}/liked-projects`);

    if (result.success) {
      setLikedProjects(result.data.projects ?? []);
    } else {
      toast.error(`Failed to fetch liked projects. ${result.error}`);
    }
  }, [contextUser?.id]);

  useEffect(() => {
    fetchProjects();
    fetchLikedProjects();
  }, [fetchProjects, fetchLikedProjects]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="w-full">
        <div className="space-y-6 px-6">
          <div className="space-y-4">
            <div className="text-lg font-bold">Your Projects</div>

            <div className="flex gap-4 overflow-x-auto pb-2 p-2">
              <div
                className="relative w-64 h-32 rounded-sm border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-gray-400 transition-colors duration-200 flex-shrink-0 flex items-center justify-center bg-gray-50 hover:bg-gray-100"
                onClick={() => {
                  setAddDialogOpen(true);
                }}
              >
                <div className="text-center text-gray-600">
                  <Plus className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">Add New Project</span>
                </div>
              </div>

              {userProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  isOwned={true}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-lg font-bold">Liked Projects</div>

            <div className="flex gap-4 overflow-x-auto pb-2 p-2">
              {likedProjects.length === 0 ? (
                <div className="flex items-center justify-center w-64 h-32 text-gray-500 text-sm bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  No liked projects yet
                </div>
              ) : (
                likedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onUnlike={handleUnlike}
                    isOwned={false}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Make changes to your project. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <EditProjectForm
            project={selectedProject}
            onCancel={()=>{
              setAddDialogOpen(false)
            }}
            onSuccess={() => {
              setEditDialogOpen(false), fetchProjects();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>Create a new project. Fill in the details below.</DialogDescription>
          </DialogHeader>
          <AddProjectForm
            onCancel={() => {
              setAddDialogOpen(false);
            }}
            onSuccess={() => {
              setAddDialogOpen(false), fetchProjects();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DeleteProjectForm
            project={selectedProject}
            onSubmit={() => {
              setDeleteDialogOpen(false), fetchProjects();
            }}
          />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

