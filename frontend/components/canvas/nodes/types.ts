// Shared types for React Flow node components

export interface NodeData {
  data?: Record<string, any>;
  status?: string;
  error_message?: string;
  onUpdate?: (data: Record<string, any>) => void;
  onDelete?: () => void;
  onGenerate?: () => void;
  onExtend?: () => void;
  onStitch?: () => void;
  onExport?: () => void;
  onGenerateScene?: () => void;
  onOpenSceneGallery?: () => void;
  onOpenHookLibrary?: () => void;
  onBranch?: () => void;
  connectedPrompt?: string;
  connectedImageUrl?: string;
  connectedVideoUrl?: string;
  connectedVideo?: Record<string, any> | null;
  connectedCharacter?: { character_id: string; wardrobe_preset_id?: string } | null;
  connectedProduct?: Record<string, any> | null;
  connectedSetting?: Record<string, any> | null;
  connectedVideos?: Array<{ source_node_id: string; handle: string; video_url: string }> | null;
}

export interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}
