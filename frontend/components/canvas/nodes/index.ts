import ImageNodeRF from './ImageNodeRF';
import PromptNodeRF from './PromptNodeRF';
import VideoNodeRF from './VideoNodeRF';
import ContainerNodeRF from './ContainerNodeRF';
import RatioNodeRF from './RatioNodeRF';
import SceneNodeRF from './SceneNodeRF';

export const nodeTypes = {
  image: ImageNodeRF,
  prompt: PromptNodeRF,
  video: VideoNodeRF,
  container: ContainerNodeRF,
  ratio: RatioNodeRF,
  scene: SceneNodeRF,
};
