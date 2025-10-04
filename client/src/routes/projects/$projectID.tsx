import { createFileRoute, notFound } from "@tanstack/react-router";
import type { Flow, Project } from "@/api/projects";
import { API } from "@/services/api";
import { FlowEditor } from "@/components/node-flow/FlowEditor";
import { Toaster } from "@/components/ui/sonner";
import { requireAuth } from "@/lib/utils";
import { Role } from "@/lib/authStore";

export const Route = createFileRoute("/projects/$projectID")({
  // beforeLoad: requireAuth(Role.User),
  component: Project,
  loader: async ({ params }) => {
    const { projectID } = params;
    const project = await fetchProjectById(projectID);

    return project;
  },
  pendingComponent: () => <div>Loading Project...</div>,
  errorComponent: ({ error }) => {
    if (error.name === "NotFound") {
      return <div>Project not found!</div>;
    }
    return <div>An error occurred while fetching the project.</div>;
  },
});

const fetchProjectById = async (projectId: string) => {
  const result = await API.get(`/projects/${projectId}`);

  if (result.success) {
    const proj = result.data.project;

    try {
      const flowData: Flow = JSON.parse(proj.data);
      proj.data = flowData;

      if (!proj.data.nodes) {
        proj.data.nodes = [];
      }
      if (!proj.data.edges) {
        proj.data.nodes = [];
      }
      if (!proj.data.viewport) {
        proj.data.viewport = { x: 0, y: 0, zoom: 1 };
      }
      if (!proj.data.nodeCount) {
        proj.data.nodeCount = 0;
      }
    } catch (e) {
      proj.data = {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        nodeCount: 0,
      };
    }
    return proj;
  } else {
    throw notFound();
  }
};

function Project() {
  const project = Route.useLoaderData();

  return (
    <div>
      <FlowEditor project={project} />
    </div>
  );
}
