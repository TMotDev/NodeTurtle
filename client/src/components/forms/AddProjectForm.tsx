import { useState } from "react";
import { z } from "zod";
import { AlertTriangle, Globe, Loader2, Lock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API } from "@/services/api";

const addProjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_public: z.boolean(),
});

interface AddProjectFormProps {
  onSuccess?: () => void;
  onCancel: () => void;
}

export default function AddProjectForm({ onSuccess, onCancel }: AddProjectFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof addProjectSchema>>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
    },
  });

  async function onSubmit(values: z.infer<typeof addProjectSchema>) {
    setIsLoading(true);
    setError(null);

    const projectData = {
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      is_public: values.is_public,
    };

    const result = await API.post("/projects", projectData);

    if (result.success) {
      form.reset();
      onSuccess?.();
    } else {
      setError(result.error || "Failed to create project. Please try again.");
    }

    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter project title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter project description (optional)"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_public"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibility</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={field.value ? "public" : "private"}
                    onValueChange={(value) => field.onChange(value === "public")}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="private" aria-label="Private">
                      <Lock className="h-4 w-4 mr-2" />
                      Private
                    </ToggleGroupItem>
                    <ToggleGroupItem value="public" aria-label="Public">
                      <Globe className="h-4 w-4 mr-2" />
                      Public
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
              onClick={()=>onCancel()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
