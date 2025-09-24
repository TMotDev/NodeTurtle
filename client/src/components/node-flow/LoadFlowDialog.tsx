import { Clock, FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DialogDescription } from "@radix-ui/react-dialog";
import type { Project } from "@/api/projects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { getTimeSince } from "@/lib/utils";
import { useFlowManagerContext } from "@/hooks/FlowManager";

interface LoadFlowDialogProps {
  onLoadFlow: (flowId: string) => void;
  onDeleteFlow: (flowId: string) => void;
  hasUnsavedChanges: boolean;
  onSaveCurrentFlow: () => void;
  children: React.ReactNode;
}

export const LoadFlowDialog = ({
  onLoadFlow,
  onDeleteFlow,
  hasUnsavedChanges,
  onSaveCurrentFlow,
  children,
}: LoadFlowDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);

  const { getSavedFlows } = useFlowManagerContext();

  const [flows, setFlows] = useState<Array<Project>>([]);
  useEffect(() => {
    const f = getSavedFlows();
    setFlows(f);
  }, [getSavedFlows, isOpen]);

  const handleLoadClick = (flowId: string) => {
    if (hasUnsavedChanges) {
      setPendingLoadId(flowId);
      setShowUnsavedDialog(true);
    } else {
      onLoadFlow(flowId);
      setIsOpen(false);
    }
  };

  const handleConfirmLoad = () => {
    if (pendingLoadId) {
      onLoadFlow(pendingLoadId);
      setPendingLoadId(null);
      setShowUnsavedDialog(false);
      setIsOpen(false);
    }
  };

  const handleSaveAndLoad = () => {
    onSaveCurrentFlow();
    handleConfirmLoad();
  };

  const handleDeleteClick = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation();
    setFlowToDelete(flowId);
  };

  const confirmDelete = () => {
    if (flowToDelete) {
      onDeleteFlow(flowToDelete);
      setFlows((ff) => ff.filter((f) => f.id != flowToDelete));
      setFlowToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load Flow</DialogTitle>
            <DialogDescription>
              Choose a saved flow from your browser's local storage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {flows.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No saved flows found
              </p>
            ) : (
              flows
                .sort(
                  (a, b) =>
                    new Date(b.last_edited_at).getTime() -
                    new Date(a.last_edited_at).getTime(),
                )
                .map((flow) => (
                  <div
                    key={flow.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer group"
                    onClick={() => handleLoadClick(flow.id)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{flow.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{flow.data?.nodeCount} nodes</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{getTimeSince(flow.last_edited_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                      onClick={(e) => handleDeleteClick(e, flow.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your current flow. What would you like
              to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLoad}>
              Discard Changes
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSaveAndLoad}>
              Save & Load
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!flowToDelete}
        onOpenChange={() => setFlowToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flow? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
