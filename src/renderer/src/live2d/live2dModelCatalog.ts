/**
 * Live2D model catalog for bundled desktop-pet assets.
 *
 * Responsibility: maps shared pet model ids to renderer asset paths and
 * user-facing status text. It does not load PixiJS, create canvases, or play
 * motions.
 *
 * Side effects: none.
 * Key dependencies and constraints: paths must stay relative to Vite's public
 * asset base and match files under `public/live2d/`.
 */
import type { PetModelId } from '../../../shared/petModel';
import { buildRendererAssetUrl } from '../pet/assetUrl';

export interface Live2DModelDefinition {
  readonly id: PetModelId;
  readonly displayName: string;
  readonly modelPath: string;
  readonly readyStatus: string;
}

const LIVE2D_MODEL_DEFINITIONS: Readonly<Record<PetModelId, Live2DModelDefinition>> = {
  tororo: {
    id: 'tororo',
    displayName: '白猫 Tororo',
    modelPath: 'live2d/tororo/tororo.model3.json',
    readyStatus: '白猫已就绪'
  },
  hijiki: {
    id: 'hijiki',
    displayName: '黑猫 Hijiki',
    modelPath: 'live2d/hijiki/hijiki.model3.json',
    readyStatus: '黑猫已就绪'
  }
};

/**
 * Reads renderer metadata for a bundled Live2D model.
 *
 * Inputs: validated shared model id.
 * Returns: immutable metadata used by the Live2D renderer.
 * Errors: does not throw for known ids.
 * Side effects: none.
 */
export function getLive2DModelDefinition(modelId: PetModelId): Live2DModelDefinition {
  return LIVE2D_MODEL_DEFINITIONS[modelId];
}

/**
 * Builds a browser-loadable URL for a bundled Live2D model.
 *
 * Inputs: Vite base URL and validated shared model id.
 * Returns: renderer-relative URL for the model3 JSON file.
 * Errors: does not throw for known ids.
 * Side effects: none.
 */
export function buildLive2DModelUrl(baseUrl: string, modelId: PetModelId): string {
  return buildRendererAssetUrl(baseUrl, getLive2DModelDefinition(modelId).modelPath);
}
