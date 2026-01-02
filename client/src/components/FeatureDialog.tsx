import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { API } from "@/services/api";

// Assuming Project type structure
interface Project {
  id: string;
  title: string;
  creator_username: string;
}

type FeatureDialogProps = {
  isOpen: boolean;
  selectedProject: Project | null;
  onSubmit: () => void;
  onClose: () => void;
};

export default function FeatureDialog({
  isOpen,
  selectedProject,
  onSubmit,
  onClose,
}: FeatureDialogProps) {
  const [duration, setDuration] = useState("7");
  const [customDate, setCustomDate] = useState<Date>();
  const [showCustomDate, setShowCustomDate] = useState(false);

  const durationPresets = [
    { label: "3 Days", value: "3" },
    { label: "1 Week", value: "7" },
    { label: "1 Month", value: "30" },
    { label: "Permanent", value: "99999" },
    { label: "Custom Date", value: "custom" },
  ];

  const handleDurationChange = (value: string) => {
    if (!value) return;
    setDuration(value);
    if (value === "custom") {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomDate(undefined);
    }
  };

  const getDurationInHours = (): number | null => {
    if (duration === "custom") {
      if (!customDate || customDate <= new Date()) {
        return null;
      }
      const diffInMs = customDate.getTime() - new Date().getTime();
      return Math.ceil(diffInMs / (1000 * 60 * 60));
    }

    const days = parseInt(duration);
    if (isNaN(days) || days <= 0) {
      return null;
    }

    return days * 24;
  };

  const getPreviewDate = (): Date | null => {
    const hours = getDurationInHours();
    if (hours === null) return null;

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + hours);
    return futureDate;
  };

  const confirmFeature = async () => {
    if (selectedProject) {
      const durationInHours = getDurationInHours();

      if (!durationInHours || durationInHours <= 0) {
        toast.error("Please select a valid duration or a future date.");
        return;
      }

      const result = await API.patch(`/admin/projects/${selectedProject.id}`, {
        duration: durationInHours,
      });

      if (result.success) {
        toast.success(`Project has been successfully featured!`);
      } else {
        toast.error(`Error when featuring project: ${result.error}`);
      }

      setDuration("7");
      setCustomDate(undefined);
      setShowCustomDate(false);

      onSubmit();
    }
  };

  const handleClose = () => {
    setDuration("7");
    setCustomDate(undefined);
    setShowCustomDate(false);
    onClose();
  };

  const isFormValid = () => {
    const hours = getDurationInHours();
    return hours !== null && hours > 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Feature Project
          </DialogTitle>
          <DialogDescription>
            Feature "{selectedProject?.title}" by {selectedProject?.creator_username}. Featured
            projects will be highlighted and shown prominently to other users.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Duration</Label>
            <div className="col-span-3 space-y-3">
              <ToggleGroup
                type="single"
                variant="outline"
                value={duration}
                onValueChange={handleDurationChange}
                className="flex flex-wrap justify-start"
              >
                {durationPresets.map((preset) => (
                  <ToggleGroupItem
                    key={preset.value}
                    value={preset.value}
                    className="px-4 py-2 text-sm cursor-pointer"
                  >
                    {preset.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              {showCustomDate && (
                <div className="space-y-2">
                  <Label className="text-sm">Select End Date</Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDate && "text-muted-foreground",
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {customDate ? format(customDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDate}
                        onSelect={setCustomDate}
                        disabled={(date) => date <= new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  {customDate && customDate <= new Date() && (
                    <p className="text-sm text-red-600">Please select a future date</p>
                  )}
                </div>
              )}

              {/* UPDATED: Preview logic now uses the getPreviewDate helper */}
              {getPreviewDate() && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  <strong>Preview:</strong> Project will be featured until{" "}
                  <strong>{format(getPreviewDate()!, "PPP 'at' p")}</strong>
                  <span className="block mt-1">
                    (
                    {Math.ceil(
                      (getPreviewDate()!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                    )}{" "}
                    days from now)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={confirmFeature}
            disabled={!isFormValid()}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Star className="w-4 h-4 mr-2" />
            Feature Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
