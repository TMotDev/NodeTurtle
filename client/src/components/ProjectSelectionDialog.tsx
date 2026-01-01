import { useState } from "react";
import { AudioLines, Calendar, FileText, Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import type { Project } from "@/api/projects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectSelectionDialogProps {
  open: boolean;
  savedProjects: Array<Project>;
  onSelectProject: (projectId: string) => void;
  onCreateNew: (title: string) => void;
  onDeleteProject: (projectId: string) => void;
  onClose: () => void;
}

export function ProjectSelectionDialog({
  open,
  savedProjects,
  onSelectProject,
  onCreateNew,
  onDeleteProject,
  onClose,
}: ProjectSelectionDialogProps) {
  const [newProjectTitle, setNewProjectTitle] = useState("Untitled Project");
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const handleCreateNew = () => {
    if (newProjectTitle.trim().length > 0) {
      setNewProjectTitle(newProjectTitle.trim());
      onCreateNew(newProjectTitle.trim());
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setDeleteProjectId(projectId);
  };

  const handleConfirmDelete = () => {
    if (deleteProjectId) {
      onDeleteProject(deleteProjectId);
      setDeleteProjectId(null);
      sortedProjects.filter((p) => p.id !== deleteProjectId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const sortedProjects = [...savedProjects].sort(
    (a, b) => new Date(b.last_edited_at).getTime() - new Date(a.last_edited_at).getTime(),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Local Projects
            </DialogTitle>
            <DialogDescription>
              Choose an existing project or create a new one to start editing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-6 min-h-0">
            {/* Create New Project Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Project
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="project-title">Project Title</Label>
                  <Input
                    id="project-title"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateNew();
                      }
                    }}
                    placeholder="Enter project name..."
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateNew} className="mb-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Existing Projects Section */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-3">
                Existing Projects ({savedProjects.length})
              </h3>

              {savedProjects.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No projects found</p>
                    <p className="text-sm">Create your first project to get started</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedProjects.map((project) => (
                      <Card
                        key={project.id}
                        className="cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => onSelectProject(project.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{project.title}</CardTitle>
                              <CardDescription className="flex items-center gap-2 text-xs mt-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(project.last_edited_at)}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 p-2 h-8 w-8"
                              onClick={(e) => handleDeleteClick(e, project.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{project.data?.nodeCount || 0} nodes</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive/80 hover:bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
