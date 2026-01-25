// Shared types for React Flow node components

export interface NodeData {
  data?: Record<string, any>;
  status?: string;
  error_message?: string;
  onUpdate?: (data: Record<string, any>) => void;
  onDelete?: () => void;
  onGenerate?: () => void;
  onExtend?: () => void;
  connectedPrompt?: string;
  connectedImageUrl?: string;
  connectedVideoUrl?: string;
  connectedVideo?: Record<string, any> | null;
}

export interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}
