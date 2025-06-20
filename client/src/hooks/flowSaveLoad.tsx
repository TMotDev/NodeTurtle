import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export const useSaveLoad = () => {

    const { getNodes, getEdges, setNodes, setEdges, setViewport, getViewport } = useReactFlow();

     // Save and restore
      const save = useCallback(() => {
        const flow = {
          nodes: getNodes(),
          edges: getEdges(),
          viewport: getViewport(),
        };
        localStorage.setItem("localFlow", JSON.stringify(flow));
        alert("Flow saved!");
      }, [getNodes, getEdges, getViewport]);

      const load = useCallback(() => {
        const saved = localStorage.getItem("localFlow");
        if (saved) {
          const flow = JSON.parse(saved);
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
          setViewport(flow.viewport);
        }
      }, [setNodes, setEdges, setViewport]);

      return {save, load}
}