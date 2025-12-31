import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { API } from "@/services/api";
import useAuthStore from "@/lib/authStore";
import { useLikedProjects } from "@/hooks/UseLikedProjects";
import Header from "@/components/Header";
import {ExploreProjectCard} from "@/components/ExploreProjectCard";

// Mock types based on your project structure
interface Project {
  id: string;
  title: string;
  description: string;
  data?: any;
  creator_id: string;
  creator_username: string;
  likes_count: number;
  featured_until?: string;
  created_at: string;
  last_edited_at: string;
  is_public: boolean;
}

export const Route = createFileRoute("/")({
  component: Homepage,
  head: () => ({
    meta: [
      {
        title: "Turtle Graphics - Home",
      },
    ],
  }),
});

function Homepage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [featuredProjects, setFeaturedProjects] = useState<Array<Project>>([]);
  const [visibleRows, setVisibleRows] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const { likedProjectIds, likeProject, unlikeProject, isProjectLiked } = useLikedProjects();

  const itemsPerRow = 6;
  const totalRows = Math.ceil(featuredProjects.length / itemsPerRow);
  const visibleProjects = featuredProjects.slice(0, visibleRows * itemsPerRow);
  const hasMore = visibleRows < totalRows;

  useEffect(() => {
    const fetchFeaturedProjects = async () => {
      setIsLoading(true);
      try {
        const response = await API.get("/projects/featured");

        if (response.success) {
          const featured: Array<Project> = response.data.projects;
          setFeaturedProjects(featured);
        } else {
          console.error("Failed to fetch featured projects:", response.error);
          setFeaturedProjects([]);
        }
      } catch (error) {
        console.error("Failed to fetch featured projects:", error);
        setFeaturedProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProjects();
  }, []);

  const loadMore = () => {
    setVisibleRows((prev) => prev + 1);
  };

  const handleLike = async (project: Project) => {
    const success = await likeProject(project.id);
    if (success) {
      setFeaturedProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, likes_count: p.likes_count + 1 } : p)),
      );
    }
  };

  const handleUnlike = async (project: Project) => {
    const success = await unlikeProject(project.id);
    if (success) {
      setFeaturedProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p,
        ),
      );
    }
  };

  const handleCreateProject = () => {
    navigate({ to: "/projects/create" });
  };

  const handleCreateAccount = () => {
    navigate({ to: "/register" });
  };

  const handleGoToProjects = () => {
    navigate({ to: "/projects" });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="pattern p-16 pb-24 flex flex-col">
          <div className="mb-8 px-16 self-center">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Node Turtle Graphics
            </h1>
            <p className="leading-7 text-xl [&:not(:first-child)]:mt-6">
              Create beautiful patterns and designs with node-based programming.
            </p>
          </div>
          <div className="mb-8 text-center">
            <div className="flex justify-center gap-4 mb-4">
              {user ? (
                // Show buttons for logged in users
                <>
                  <button
                    onClick={handleCreateProject}
                    className="hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 font-medium"
                  >
                    Create a Project
                  </button>
                  <button
                    onClick={handleGoToProjects}
                    className="hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-100 font-medium bg-gray-50"
                  >
                    My Projects
                  </button>
                </>
              ) : (
                // Show buttons for non-logged in users
                <>
                  <button
                    onClick={handleCreateProject}
                    className="hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 font-medium"
                  >
                    Create a Project
                  </button>
                  <button
                    onClick={handleCreateAccount}
                    className="hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-100 font-medium bg-gray-50"
                  >
                    Create an Account
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {!user &&
                "Creating an account allows registered users to save multiple projects instead of just one locally saved project."}
            </p>
          </div>
        </div>

        {featuredProjects.length > 0 && (
          <div className="mb-8 flex flex-col items-center content-center">
            <div className="mb-6">
              <h2 className="scroll-m-20 pb-2 tracking-wider text-3xl font-bold first:mt-0 -translate-y-4 bg-white px-12 py-3 rounded-t-lg">
                Featured Projects
              </h2>
            </div>

            <div className="flex flex-wrap items-center content-center gap-6 mb-6 px-6">
              {visibleProjects.map((project) => (
                <ExploreProjectCard
                  key={project.id}
                  project={project}
                  onLike={handleLike}
                  onUnlike={handleUnlike}
                  isLiked={isProjectLiked(project.id)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}

        {/* Show a message when no featured projects are available */}
        {featuredProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-lg font-semibold mb-2">No Featured Projects</h3>
            <p className="text-gray-600 mb-4">
              Check back later for featured community projects, or explore all projects.
            </p>
            <button
              onClick={() => navigate({ to: "/projects/explore" })}
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Explore All Projects
            </button>
          </div>
        )}
      </main>
      <footer className="pattern h-[10vh]"></footer>
    </div>
  );
}

export default Homepage;
