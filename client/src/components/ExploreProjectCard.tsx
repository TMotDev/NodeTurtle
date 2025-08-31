import { toast } from "sonner";
import { Badge, Calendar, Heart, User } from "lucide-react";
import type { Project } from "@/api/projects";
import useAuthStore from "@/lib/authStore";
import { getTimeSince } from "@/lib/utils";

export function ExploreProjectCard({
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
}) {
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
        className="block self-center justify-self-center p-4 rounded-lg border bg-white hover:shadow-md transition-all duration-200 hover:border-blue-300"
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
      className="block max-w-sm w-84 rounded-lg border bg-white hover:shadow-lg transition-all duration-200 hover:border-blue-300 overflow-hidden"
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
}
