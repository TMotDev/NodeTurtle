import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import type { Project } from "@/api/projects";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API } from "@/services/api";

interface DeleteProjectFormProps {
  project?: Project;
  onSubmit?: () => void;
}

export default function DeleteProjectForm({
  project,
  onSubmit: onSuccess,
}: DeleteProjectFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!project) return;

    setIsLoading(true);
    setError(null);

    const result = await API.delete(`/projects/${project.id}`);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || "Failed to delete project. Please try again.");
    }

    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-800">This action cannot be undone</h4>
            <p className="text-sm text-red-700 mt-1">
              This will permanently delete the project{" "}
              <span className="font-semibold">"{project?.title}"</span> and remove all of its data.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => {
            setError(null), onSuccess?.();
          }}
        >
          Cancel
        </Button>
        <Button variant="destructive" disabled={isLoading} onClick={handleDelete}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
