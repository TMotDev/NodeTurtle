import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Eye, Icon } from "lucide-react";
import Header from "@/components/Header";

export const Route = createFileRoute("/")({
  component: App,
});

type project = {
  id: number;
  title: string;
  lastEdited: string;
  isPublic: boolean;
  views: number;
};
function App() {
  const [userProjects] = useState([
    {
      id: 1,
      title: "Interactive Data Visualization Dashboard",
      lastEdited: "2 days ago",
      isPublic: true,
      views: 1247,
    },
    {
      id: 2,
      title: "Portfolio Website",
      lastEdited: "1 week ago",
      isPublic: true,
      views: 892,
    },
    {
      id: 3,
      title: "Internal Tool for Team Collaboration",
      lastEdited: "3 weeks ago",
      isPublic: false,
      views: 0,
    },
    {
      id: 9,
      title: "Game Physics Simulator",
      lastEdited: "1 month ago",
      isPublic: true,
      views: 543,
    },
    {
      id: 10,
      title: "Node-based Music Synthesizer",
      lastEdited: "2 months ago",
      isPublic: false,
      views: 0,
    },
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="w-full">
        <div className="space-y-4 px-6">
          <div className={`flex items-center gap-3 text-lg font-bold`}>Your Projects</div>

          {userProjects.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 p-2">
              {userProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              empty
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const ProjectCard = ({ project }: { project: project }) => {
  return (
    <div
      className={`
        relative w-64 h-32 rounded-sm border-2 p-4 cursor-pointer active:scale-95 transition-all duration-200 flex-shrink-0 bg-blue-50 border-primary hover:border-blue-700
      `}
    >
      {/* Views - top right */}
      {project.isPublic && (
        <div className={`absolute top-3 right-3 flex items-center gap-1 text-x`}>
          <Eye className="h-3 w-3" />
          <span>{project.views.toLocaleString()}</span>
        </div>
      )}

      {/* Title - main content */}
      <div className="pr-16">
        <h3 className="font-semibold text-lg leading-tight overflow-hidden">
          <div className="truncate" title={project.title}>
            {project.title}
          </div>
        </h3>

        <div className={`text-sm mt-1 opacity-80`}>by project.author</div>
      </div>

      {/* Time - bottom right */}
      <div className={`absolute bottom-3 right-3 text-xs flex items-center gap-1`}>
        <Clock className="h-3 w-3" />
        <span>{project.lastEdited}</span>
      </div>
    </div>
  );
};
