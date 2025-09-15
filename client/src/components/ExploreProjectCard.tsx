import { toast } from "sonner";
import { Badge, Calendar, Heart, Star, User } from "lucide-react";
import type { Project } from "@/api/projects";
import useAuthStore from "@/lib/authStore";
import { getTimeSince } from "@/lib/utils";
import { generateThumbnail } from "@/lib/ImageGenerator";

export function ExploreProjectCard({
  project,
  onLike,
  onUnlike,
  isLiked,
}: {
  project: Project;
  onLike: (p: Project) => void;
  onUnlike: (p: Project) => void;
  isLiked: boolean;
}) {
  const user = useAuthStore((state) => state.user);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please log in to like projects");
      return;
    }
    if(project.creator_id === user.id ){
      toast.error("Can't like the projects you own");
      return
    }
    if (isLiked) {
      onUnlike(project);
    } else {
      onLike(project);
    }
  };

  return (
    <a
      href={`/projects/${project.id}`}
      className="block max-w-sm w-64 rounded-lg border bg-white hover:shadow-lg transition-all duration-200 hover:border-blue-300 overflow-hidden"
    >
      {/* Thumbnail Section with Heart Overlay */}
      <div className="relative aspect-square">
        <img
          src={generateThumbnail(project.id)}
          alt={project.title}
          className="w-full h-full object-cover"
        />

        {/* Heart button with backdrop */}
        <div className="absolute top-3 right-3">
          <button
            onClick={handleLikeClick}
            className={`flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm border transition-all ${
              isLiked
                ? "text-red-600 bg-white/90 border-red-200 hover:bg-white shadow-sm"
                : "text-gray-700 bg-white/80 border-white/50 hover:bg-white/90 hover:text-red-600"
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-sm font-medium">{project.likes_count}</span>
          </button>
        </div>

        {/* Featured badge if applicable */}
        {project.featured_until && new Date(project.featured_until) > new Date() && (
          <div className="absolute top-3 left-3 bg-yellow-400/90 text-yellow-900 flex gap-2 p-1 rounded-sm items-center">
            <Star className="border-yellow-500/30 backdrop-blur-sm">
            </Star>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-lg font-semibold line-clamp-2 mb-2" title={project.title}>
          {project.title}
        </h3>

        <p className="text-sm text-gray-600 line-clamp-3 mb-3">{project.description}</p>

        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">by {project.creator_username}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>Updated {getTimeSince(project.last_edited_at)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
