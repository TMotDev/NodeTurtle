import { toast } from "sonner";
import { Calendar, Heart, Star, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
    if (project.creator_id === user.id) {
      toast.error("Can't like the projects you own");
      return;
    }
    isLiked ? onUnlike(project) : onLike(project);
  };

  return (
    <Link
      href={`/projects/${project.id}`}
      to={"/projects/$projectID"}
      params={{ projectID: project.id }}
      // Fixed height (h-96 / 24rem) ensures the card has a defined frame for the slide effect
      className="group relative block w-64 h-84 rounded-lg border bg-white hover:shadow-lg transition-all duration-300 hover:border-blue-300 overflow-hidden"
    >
      {/* 1. Image Section: Pinned to top, fixed height */}
      <div className="relative h-64 w-full bg-gray-100">
        <img
          src={generateThumbnail(project.id)}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Like Button */}
        <div className="absolute top-3 right-3 z-10">
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

        {/* Featured Badge */}
        {project.featured_until && new Date(project.featured_until) > new Date() && (
          <div className="absolute top-3 left-3 bg-yellow-400/90 text-yellow-900 flex gap-2 p-1 rounded-sm items-center z-10">
            <Star className="h-4 w-4 fill-yellow-900/20" />
          </div>
        )}
      </div>

      {/* 2. Sliding Content Drawer */}
      {/* - absolute bottom-0: Anchors to bottom
         - translate-y-[calc(100%-5.5rem)]: Pushes it down so only the top header (approx 5.5rem) is visible initially
         - group-hover:translate-y-0: Slides up to reveal description
      */}
      <div className="absolute bottom-0 w-full bg-white transition-transform duration-300 ease-out transform translate-y-[calc(100%-5.5rem)] group-hover:translate-y-0 z-20 flex flex-col max-h-[85%] border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">

        {/* Header Part (Always Visible) - Height approx 5.5rem (88px) */}
        <div className="p-4 h-[5.5rem] shrink-0 flex flex-col justify-center">
          <h3 className="text-lg font-semibold line-clamp-1 mb-1" title={project.title}>
            {project.title}
          </h3>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate" onClick={(e) => e.stopPropagation()}>
              by{" "}
              <Link
                className="hover:underline"
                to={`/projects/user/$userID`}
                params={{ userID: project.creator_id }}
              >
                {project.creator_username}
              </Link>
            </span>
          </div>
        </div>

        {/* Description Part (Visible on Hover) */}
        <div className="px-4 pb-4 overflow-hidden flex flex-col">
          <p className="text-sm text-gray-600 line-clamp-5 leading-relaxed">
            {project.description || (
              <span className="italic text-gray-400">No description provided.</span>
            )}
          </p>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>Updated {getTimeSince(project.last_edited_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}