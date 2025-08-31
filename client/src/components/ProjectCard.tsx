import { Heart, HeartOff, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import type { Project } from "@/api/projects";
import { getTimeSince } from "@/lib/utils";

export const ProjectCard = ({
  project,
  onEdit,
  onDelete,
  onUnlike,
  isOwned,
}: {
  project: Project;
  onEdit?: (p: Project) => void;
  onDelete?: (p: Project) => void;
  onUnlike?: (p: Project) => void;
  isOwned: boolean;
}) => {
  return (
    <a
      href={`/projects/${project.id}`}
      className={`
        relative w-64 h-32 rounded-sm border-2 p-4 cursor-pointer active:scale-95 transition-all duration-200 flex-shrink-0 bg-blue-50 border-gray-300 hover:border-blue-700
      `}
      title={project.title}
    >
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-white/20 rounded transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwned ? (
              <>
                <DropdownMenuItem onClick={() => onEdit?.(project)}>Edit Project</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(project)}
                  className="text-red-600 focus:text-red-600"
                >
                  Delete Project
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => onUnlike?.(project)}
                className="text-red-600 focus:text-red-600"
              >
                <HeartOff className="h-4 w-4 mr-2" />
                Unlike Project
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pr-16">
        <h3 className="font-semibold text-lg leading-tight overflow-hidden">
          <Badge
            className={`px-1 ${
              project.is_public ? "bg-green-300 text-green-900" : "bg-blue-300 text-blue-900"
            }`}
          >
            {project.is_public ? "public" : "private"}
          </Badge>
          <div className="truncate" title={project.title}>
            {project.title}
          </div>
        </h3>

        <div className={`text-sm mt-1 opacity-80`}>by {project.creator_username}</div>
      </div>

      <div
        className={`absolute bottom-3 left-4 right-4 flex ${project.is_public ? "justify-between" : "justify-end"} items-center text-xs`}
      >
        {project.is_public && (
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            <span>{project.likes_count}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span>Edited {getTimeSince(project.last_edited_at)}</span>
        </div>
      </div>
    </a>
  );
};
