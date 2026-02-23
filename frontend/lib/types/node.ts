// Node editor types

export type NodeType = 'image' | 'prompt' | 'video' | 'container' | 'ratio' | 'scene' | 'extension' | 'character' | 'product' | 'setting' | 'stitch';
export type NodeStatus = 'idle' | 'processing' | 'completed' | 'failed';

export interface Node {
  id: string;
  project_id: string;
  type: NodeType;
  position_x: number;
  position_y: number;
  data: Record<string, any>;
  status: NodeStatus;
  character_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle?: string;
  target_handle?: string;
  created_at: string;
}

export interface NodeHandle {
  id: string;
  type: 'input' | 'output';
  position: { x: number; y: number };
}
