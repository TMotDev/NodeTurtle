import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { Project } from "@/api/projects";
import Header from "@/components/Header";
import { API } from "@/services/api";
import useAuthStore from "@/lib/authStore";
import { requireAuth } from "@/lib/utils";
import { ExploreProjectCard } from "@/components/ExploreProjectCard";
import { useLikedProjects } from "@/hooks/UseLikedProjects";

interface UserProjects {
  projects: Array<Project>;
  meta: {
    username: string;
  };
}

export const Route = createFileRoute("/projects/user/$userID")({
  beforeLoad: requireAuth(),
  component: UserPage,
  loader: async ({ params }) => {
    const { userID } = params;
    const result = await API.get(`/users/${userID}/projects`);

    if (result.success) {
      return result.data as UserProjects;
    } else {
      throw redirect({ to: "/projects" });
    }
  },
  head: () => ({
    meta: [
      {
        title: "Turtle Graphics",
      },
    ],
  }),
  pendingComponent: () => <div>Loading data...</div>,
  errorComponent: () => <div>An error occurred while fetching the user data.</div>,
});

function UserPage() {
  const contextUser = useAuthStore((state) => state.user);
  const data = Route.useLoaderData();
  const navigate = useNavigate();

  const { userID } = Route.useParams();

  const {
    likeProject: hookLikeProject,
    unlikeProject: hookUnlikeProject,
    isProjectLiked,
  } = useLikedProjects();

  useEffect(() => {
    if (contextUser?.id === userID) {
      navigate({ to: "/projects", replace: true });
    }
  }, [contextUser?.id, navigate, userID]);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <h1 className="w-full text-3xl italic px-16 py-8 pb-6 pattern text-center tracking-wide">
        Projects by <span className="font-bold"> {data.meta.username}</span>
      </h1>
      <main className="w-full lg:w-3/4 self-center flex-grow">
        <div className="space-y-6 px-6">
          <div className="flex flex-row flex-wrap gap-4 pt-4 py-6">
            {data.projects.map((project) => (
              <ExploreProjectCard
                key={project.id}
                project={project}
                onLike={() => hookLikeProject(project.id)}
                onUnlike={() => hookUnlikeProject(project.id)}
                isLiked={isProjectLiked(project.id)}
              />
            ))}
          </div>
        </div>
      </main>
      <footer className="pattern h-[10vh]"></footer>
    </div>
  );
}
