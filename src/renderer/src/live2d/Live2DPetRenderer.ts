/**
 * PixiJS + Live2D renderer for the Tororo white-cat desktop pet.
 *
 * Responsibility: owns Live2D canvas creation, model loading, layout, pointer
 * hit testing, and motion playback for the Tororo sample model. It does not
 * create Electron windows, start HTTP servers, or validate external commands.
 *
 * Side effects: creates a PixiJS WebGL canvas, reads local Live2D assets from
 * `public/live2d/tororo/`, registers DOM pointer listeners, and starts Pixi's
 * ticker while alive.
 *
 * Key dependencies and constraints: requires `live2dcubismcore.min.js` to be
 * loaded before this module initializes the model. The motion map is specific
 * to Tororo's official sample `model3.json`.
 */
import * as PIXI from 'pixi.js';
import { Live2DModel, MotionPriority } from 'pixi-live2d-display/cubism4';

import type { PetActionMode, PetOneShotAction } from '../../../shared/petActionMode';
import { buildRendererAssetUrl } from '../pet/assetUrl';
import { resolveLive2DMotion } from './live2dMotionMap';

const MODEL_URL = buildRendererAssetUrl(import.meta.env.BASE_URL, 'live2d/tororo/tororo.model3.json');

export interface Live2DPetRendererOptions {
  readonly host: HTMLElement;
  readonly statusElement: HTMLElement;
  readonly openActionMenu: () => Promise<void> | void;
}

export class Live2DPetRenderer {
  private readonly host: HTMLElement;
  private readonly statusElement: HTMLElement;
  private readonly openActionMenu: () => Promise<void> | void;
  private readonly app: PIXI.Application;
  private model: Live2DModel | null = null;
  private lookAtMouseEnabled = false;

  /**
   * Creates a Live2D renderer instance without loading model assets yet.
   *
   * Inputs: DOM host, status element, and context-menu callback.
   * Returns: constructed renderer.
   * Errors: PixiJS may throw if WebGL cannot initialize.
   * Side effects: creates and appends a PixiJS canvas.
   */
  constructor(options: Live2DPetRendererOptions) {
    this.host = options.host;
    this.statusElement = options.statusElement;
    this.openActionMenu = options.openActionMenu;
    this.app = new PIXI.Application({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio, 2)
    });

    this.app.view.classList.add('live2d-canvas');
    this.host.append(this.app.view as HTMLCanvasElement);
    this.resize();
  }

  /**
   * Loads the Tororo Live2D model and attaches pointer handlers.
   *
   * Inputs: none; uses the fixed local `MODEL_URL`.
   * Returns: promise resolving after model load succeeds or fails visibly.
   * Errors: loader failures are caught and shown in the development status UI.
   * Side effects: reads local assets, mutates Pixi stage, and registers DOM
   * listeners on the Pixi canvas.
   */
  async initialize(): Promise<void> {
    try {
      exposePixiGlobal();
      const model = await Live2DModel.from(MODEL_URL, {
        autoInteract: false,
        idleMotionGroup: 'Idle'
      });

      this.model = model;
      this.app.stage.addChild(model);
      this.layoutModel();
      this.registerPointerHandlers();
      await this.playIdle();

      this.statusElement.textContent = `Live2D 已加载 | Tororo | API=http://127.0.0.1:17321`;
      this.statusElement.hidden = !import.meta.env.DEV;
    } catch (error) {
      console.error('Failed to load Live2D pet model.', error);
      this.statusElement.textContent = 'Live2D 模型加载失败';
      this.statusElement.hidden = false;
    }
  }

  /**
   * Resizes the Pixi renderer to the current host bounds.
   *
   * Inputs: none; reads host client dimensions.
   * Returns: nothing.
   * Errors: does not throw for a valid Pixi renderer.
   * Side effects: mutates renderer dimensions and model layout.
   */
  resize(): void {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);

    this.app.renderer.resize(width, height);
    this.layoutModel();
  }

  /**
   * Applies a persistent action mode to the Live2D cat.
   *
   * Inputs: `idle` plays idle; `walk` maps to a short Tororo movement because
   * this sample cat has no real walking cycle.
   * Returns: nothing.
   * Errors: missing model is ignored.
   * Side effects: may start a Live2D motion.
   */
  setMode(mode: PetActionMode): void {
    if (mode === 'walk') {
      void this.playMotionByName('05');
      return;
    }

    void this.playIdle();
  }

  /**
   * Triggers a one-shot app action on the Live2D cat.
   *
   * Inputs: supported one-shot action from tray or context menu.
   * Returns: nothing.
   * Errors: unknown mappings are ignored.
   * Side effects: may start a Live2D motion.
   */
  triggerOneShot(action: PetOneShotAction): void {
    void this.playMotionByName(action);
  }

  /**
   * Triggers a named Tororo Live2D motion.
   *
   * Inputs: motion name such as `01` or `08`.
   * Returns: promise resolving after the library accepts or rejects playback.
   * Errors: unknown names and missing model return false without throwing.
   * Side effects: may start a Live2D motion.
   */
  async playMotionByName(name: string): Promise<boolean> {
    const motion = resolveLive2DMotion(name);

    if (!this.model || !motion) {
      return false;
    }

    return this.model.motion(motion.group, motion.index, MotionPriority.FORCE);
  }

  /**
   * Enables or disables mouse-follow focus.
   *
   * Inputs: boolean toggle from tray, context menu, or HTTP API.
   * Returns: nothing.
   * Errors: does not throw.
   * Side effects: may reset model focus to center.
   */
  setLookAtMouseEnabled(enabled: boolean): void {
    this.lookAtMouseEnabled = enabled;

    if (!enabled && this.model) {
      this.model.focus(this.app.renderer.width / 2, this.app.renderer.height / 2, true);
    }
  }

  /**
   * Releases Pixi resources owned by this renderer.
   *
   * Inputs: none.
   * Returns: nothing.
   * Errors: does not throw for repeated cleanup.
   * Side effects: destroys WebGL resources and removes stage children.
   */
  destroy(): void {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  /**
   * Plays Tororo's default idle motion.
   *
   * Inputs: none.
   * Returns: promise resolving to whether playback started.
   * Errors: missing model returns false.
   * Side effects: may start a Live2D idle motion.
   */
  private async playIdle(): Promise<boolean> {
    if (!this.model) {
      return false;
    }

    return this.model.motion('Idle', 0, MotionPriority.IDLE);
  }

  /**
   * Positions and scales the model into the desktop-pet window.
   *
   * Inputs: none; reads current renderer dimensions and loaded model size.
   * Returns: nothing.
   * Errors: missing model is ignored.
   * Side effects: mutates model transform.
   */
  private layoutModel(): void {
    if (!this.model) {
      return;
    }

    const width = this.app.renderer.width;
    const height = this.app.renderer.height;
    const scale = Math.min((width * 0.92) / this.model.width, (height * 0.96) / this.model.height);

    this.model.anchor.set(0.5, 1);
    this.model.scale.set(scale);
    this.model.position.set(width / 2, height * 0.98);
  }

  /**
   * Registers pointer listeners on the Pixi canvas.
   *
   * Inputs: none.
   * Returns: nothing.
   * Errors: does not throw.
   * Side effects: attaches DOM event listeners for right-click menu and focus.
   */
  private registerPointerHandlers(): void {
    const canvas = this.app.view as HTMLCanvasElement;

    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();

      if (this.isPointerOverModel(event)) {
        void this.openActionMenu();
      }
    });

    canvas.addEventListener('pointerdown', (event) => {
      if (this.isPointerOverModel(event)) {
        void this.playMotionByName('03');
      }
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!this.lookAtMouseEnabled || !this.model) {
        return;
      }

      const point = this.toCanvasPoint(event);
      this.model.focus(point.x, point.y);
    });
  }

  /**
   * Checks whether a pointer event falls inside the current model bounds.
   *
   * Inputs: mouse or pointer event in viewport coordinates.
   * Returns: true when the point is within the model's Pixi bounds.
   * Errors: missing model returns false.
   * Side effects: none.
   */
  private isPointerOverModel(event: MouseEvent | PointerEvent): boolean {
    if (!this.model) {
      return false;
    }

    const point = this.toCanvasPoint(event);
    const bounds = this.model.getBounds();

    return bounds.contains(point.x, point.y);
  }

  /**
   * Converts a browser pointer coordinate into Pixi canvas coordinates.
   *
   * Inputs: browser event with client coordinates.
   * Returns: local canvas coordinate in CSS pixels.
   * Errors: does not throw.
   * Side effects: none.
   */
  private toCanvasPoint(event: MouseEvent | PointerEvent): PIXI.Point {
    const rect = (this.app.view as HTMLCanvasElement).getBoundingClientRect();

    return new PIXI.Point(event.clientX - rect.left, event.clientY - rect.top);
  }
}

/**
 * Exposes PixiJS globally for pixi-live2d-display internals.
 *
 * Inputs: none.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: writes `window.PIXI`, which the Live2D plugin expects.
 */
function exposePixiGlobal(): void {
  (window as unknown as { PIXI?: typeof PIXI }).PIXI = PIXI;
}
