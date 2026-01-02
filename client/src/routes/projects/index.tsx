import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ReactFlowProvider } from "@xyflow/react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AddProjectForm from "@/components/forms/AddProjectForm";
import { API } from "@/services/api";
import useAuthStore, { Role } from "@/lib/authStore";
import { requireAuth } from "@/lib/utils";
import { ProjectCard } from "@/components/ProjectCard";
import { useLocalProjectManager } from "@/hooks/FlowManager";

export const Route = createFileRoute("/projects/")({
  beforeLoad: requireAuth(Role.User),
  component: () => (
    <ReactFlowProvider>
      <ProjectPage />
    </ReactFlowProvider>
  ),

  head: () => ({
    meta: [
      {
        title: "Turtle Graphics - My Projects",
      },
    ],
  }),
});

function ProjectPage() {
  const navigate = useNavigate();

  const contextUser = useAuthStore((state) => state.user);

  const [userProjects, setUserProjects] = useState<Array<Project>>([]);
  const [likedProjects, setLikedProjects] = useState<Array<Project>>([]);

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const { getSavedFlows } = useLocalProjectManager();

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

  const fetchProjects = useCallback(async () => {
    const result = await API.get(`/users/${contextUser?.id}/projects`);

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
    <div className="flex flex-col min-h-screen overflow-x-hidden useGutter">
      <Header />
      <main className="w-full lg:w-3/4 self-center">
        <div className="space-y-6 px-6">
          <Accordion
            type="multiple"
            defaultValue={["user-projects", "liked-projects", "local-projects"]}
            className="w-full"
          >
            <AccordionItem value="user-projects">
              <AccordionTrigger className="text-lg font-bold hover:no-underline">
                Your Projects ({userProjects.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                  {userProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      isOwned={true}
                    />
                  ))}
                  <div
                    className="relative h-32 w-32 rounded-sm border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-gray-400 transition-colors duration-200 flex items-center justify-center bg-gray-50 hover:bg-gray-100"
                    onClick={() => {
                      setAddDialogOpen(true);
                    }}
                  >
                    <div className="text-center text-gray-600">
                      <Plus className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm font-medium">Add New Project</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="liked-projects">
              <AccordionTrigger className="text-lg font-bold hover:no-underline">
                Liked Projects ({likedProjects.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4">
                  {likedProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-32 text-gray-500 text-sm bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      No liked projects yet
                      <Link
                        to="/projects/explore"
                        className="underline underline-offset-2 font-bold mt-2"
                      >
                        Explore Projects
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                      {likedProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onUnlike={handleUnlike}
                          isOwned={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="local-projects">
              <AccordionTrigger className="text-lg font-bold hover:no-underline">
                Local Projects ({getSavedFlows().length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                  {getSavedFlows().map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      isOwned={true}
                      isLocal={true}
                    />
                  ))}
                  <div
                    className="relative h-32 w-32 rounded-sm border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-gray-400 transition-colors duration-200 flex items-center justify-center bg-gray-50 hover:bg-gray-100"
                    onClick={() => {
                      setAddDialogOpen(true);
                      navigate({ to: `/projects/create`, search: { projectId: undefined } });
                    }}
                  >
                    <div className="text-center text-gray-600">
                      <Plus className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm font-medium">Add New Project</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
            onCancel={() => {
              setEditDialogOpen(false);
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
