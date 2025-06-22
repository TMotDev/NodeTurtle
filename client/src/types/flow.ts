export interface SavedFlow {
  id: string;
  title: string;
  nodes: Array<any>;
  edges: Array<any>;
  viewport: any;
  createdAt: string;
  lastModified: string;
  nodeCount: number;
}
