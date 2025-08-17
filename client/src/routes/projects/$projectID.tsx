import { createFileRoute, notFound } from '@tanstack/react-router'
import { API } from '@/services/api';
import { FlowEditor } from '@/components/node-flow/FlowEditor';

export const Route = createFileRoute('/projects/$projectID')({
  component: Project,
  loader: async ({ params }) => {
    const { projectID } = params;
    const project = await fetchProjectById(projectID);

    return { project };
  },
  pendingComponent: ()=><div>Loading Project...</div>,
  errorComponent: ({ error }) => {
    if (error.name === 'NotFound') {
      return <div>Project not found!</div>;
    }
    return <div>An error occurred while fetching the project.</div>;
  },
})

const fetchProjectById = async (projectId: string) => {
  const result = await API.get(`/projects/${projectId}`)

  if(result.success)
  {
    console.log(result)
    return result.data
  }
  else{
    throw notFound()
  }
}


function Project() {

  const {project} = Route.useLoaderData()

  return <div>
    {JSON.stringify(project)}
    <FlowEditor project={project}/>
    </div>
}
