import ImageNodeRF from './ImageNodeRF';
import PromptNodeRF from './PromptNodeRF';
import VideoNodeRF from './VideoNodeRF';
import ContainerNodeRF from './ContainerNodeRF';
import RatioNodeRF from './RatioNodeRF';
import SceneNodeRF from './SceneNodeRF';
import ExtensionNodeRF from './ExtensionNodeRF';
import CharacterNodeRF from './CharacterNodeRF';
import ProductNodeRF from './ProductNodeRF';
import SettingNodeRF from './SettingNodeRF';

export const nodeTypes = {
  image: ImageNodeRF,
  prompt: PromptNodeRF,
  video: VideoNodeRF,
  container: ContainerNodeRF,
  ratio: RatioNodeRF,
  scene: SceneNodeRF,
  extension: ExtensionNodeRF,
  character: CharacterNodeRF,
  product: ProductNodeRF,
  setting: SettingNodeRF,
};
