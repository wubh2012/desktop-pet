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
import { ShaderSystem } from '@pixi/core';
import { install as installPixiUnsafeEval } from '@pixi/unsafe-eval';
import * as PIXI from 'pixi.js';
import type {
  Live2DModel,
  MotionPriority as Live2DMotionPriority
} from 'pixi-live2d-display/cubism4';

import type { PetActionMode, PetOneShotAction } from '../../../shared/petActionMode';
import { buildRendererAssetUrl } from '../pet/assetUrl';
import {
  resolveLive2DActionSequence,
  type Live2DProceduralEffect
} from './live2dActionSequence';
import { calculateLive2DLayout } from './live2dLayout';
import { resolveLive2DMotion } from './live2dMotionMap';
import { resolveLive2DViewportSize } from './live2dViewport';

const MODEL_URL = buildRendererAssetUrl(import.meta.env.BASE_URL, 'live2d/tororo/tororo.model3.json');

installPixiUnsafeEval({ ShaderSystem });

/**
 * Construction options for the Live2D desktop-pet renderer.
 *
 * Inputs: supplied by the renderer entry point after DOM creation.
 * Returns: not applicable; this interface describes constructor data.
 * Errors: invalid DOM nodes surface when PixiJS appends or resizes the canvas.
 * Side effects: none by itself; the constructor consumes these values to create
 * WebGL resources and native-menu callbacks.
 */
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
  private motionPriority: typeof Live2DMotionPriority | null = null;
  private lookAtMouseEnabled = false;
  private actionRunId = 0;
  private effectAnimationFrame: number | null = null;

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
   * Side effects: reads local assets, mutates Pixi stage, registers DOM
   * listeners on the Pixi canvas, and reports concise status to the tray menu.
   */
  async initialize(): Promise<void> {
    try {
      exposePixiGlobal();
      const { Live2DModel, MotionPriority } = await import('pixi-live2d-display/cubism4');
      const model = await Live2DModel.from(MODEL_URL, {
        autoInteract: false,
        idleMotionGroup: 'Idle'
      });

      this.motionPriority = MotionPriority;
      this.model = model;
      this.app.stage.addChild(model);
      this.layoutModel();
      this.registerPointerHandlers();
      await this.playIdle();

      this.statusElement.textContent = `Live2D 已加载 | Tororo | model=${Math.round(model.width)}x${Math.round(model.height)} | API=http://127.0.0.1:17321`;
      this.statusElement.hidden = true;
      window.desktopPet?.reportRendererStatus('白猫已就绪');
      requestAnimationFrame(() => {
        this.resize();
      });
    } catch (error) {
      console.error('Failed to load Live2D pet model.', error);
      this.statusElement.textContent = 'Live2D 模型加载失败';
      this.statusElement.hidden = false;
      window.desktopPet?.reportRendererStatus('Live2D 模型加载失败');
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
    const { width, height } = resolveLive2DViewportSize(
      { width: this.host.clientWidth, height: this.host.clientHeight },
      { width: window.innerWidth, height: window.innerHeight }
    );

    this.app.renderer.resize(width, height);
    this.layoutModel();
  }

  /**
   * Applies a persistent action mode to the Live2D cat.
   *
   * Inputs: `idle` plays idle; `active` maps to a short Tororo movement because
   * this sample cat has no real walking cycle.
   * Returns: nothing.
   * Errors: missing model is ignored.
   * Side effects: may start a Live2D motion.
   */
  setMode(mode: PetActionMode): void {
    if (mode === 'active') {
      void this.playMotionByName('active');
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
    void this.playActionSequence(action);
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

    return this.model.motion(motion.group, motion.index, this.getMotionPriority('FORCE'));
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
    this.cancelProceduralEffect();
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

    return this.model.motion('Idle', 0, this.getMotionPriority('IDLE'));
  }

  /**
   * Reads a Live2D motion priority after the plugin has loaded.
   *
   * Inputs: priority key supported by pixi-live2d-display.
   * Returns: numeric priority value; falls back to documented enum values when
   * called before dynamic import completes.
   * Errors: does not throw.
   * Side effects: none.
   */
  private getMotionPriority(priority: 'IDLE' | 'FORCE'): number {
    if (this.motionPriority) {
      return this.motionPriority[priority];
    }

    return priority === 'IDLE' ? 1 : 3;
  }

  /**
   * Plays a semantic one-shot interaction sequence.
   *
   * Inputs: semantic action id selected from menu or API.
   * Returns: promise resolving after accepted motions and procedural effect are
   * scheduled or completed.
   * Errors: missing model is ignored; unknown motion names are skipped by
   * `playMotionByName`.
   * Side effects: may interrupt an in-progress combined action and mutate model
   * position/scale temporarily.
   */
  private async playActionSequence(action: PetOneShotAction): Promise<void> {
    if (!this.model) {
      return;
    }

    const runId = this.startNewActionRun();
    const sequence = resolveLive2DActionSequence(action);
    const effectPromise = sequence.effect
      ? this.playProceduralEffect(sequence.effect, runId)
      : Promise.resolve();

    for (const motionName of sequence.motions) {
      if (runId !== this.actionRunId) {
        return;
      }

      await this.playMotionByName(motionName);

      if (sequence.motions.length > 1) {
        await waitMilliseconds(300);
      }
    }

    await effectPromise;

    if (runId === this.actionRunId) {
      this.layoutModel();
    }
  }

  /**
   * Starts a new one-shot action generation and resets any temporary transform.
   *
   * Inputs: none.
   * Returns: monotonically increasing action generation id.
   * Errors: does not throw.
   * Side effects: cancels pending effect animation and reapplies base layout.
   */
  private startNewActionRun(): number {
    this.actionRunId += 1;
    this.cancelProceduralEffect();
    this.layoutModel();

    return this.actionRunId;
  }

  /**
   * Plays a lightweight procedural transform layered over a Live2D motion.
   *
   * Inputs: effect name and action generation id that owns the effect.
   * Returns: promise resolving after the effect duration or interruption.
   * Errors: missing model resolves immediately.
   * Side effects: temporarily mutates model position and scale.
   */
  private playProceduralEffect(effect: Live2DProceduralEffect, runId: number): Promise<void> {
    if (!this.model) {
      return Promise.resolve();
    }

    const model = this.model;
    const base = {
      x: model.x,
      y: model.y,
      scaleX: model.scale.x,
      scaleY: model.scale.y
    };
    const duration = effect === 'hop' ? 760 : effect === 'wiggle' ? 820 : 520;
    const width = this.app.renderer.width;
    const height = this.app.renderer.height;
    const startedAt = performance.now();

    return new Promise((resolve) => {
      const step = (now: number): void => {
        if (runId !== this.actionRunId || !this.model) {
          resolve();
          return;
        }

        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = Math.sin(progress * Math.PI);

        if (effect === 'pop') {
          const scale = 1 + eased * 0.08;
          model.position.set(base.x, base.y);
          model.scale.set(base.scaleX * scale, base.scaleY * scale);
        } else if (effect === 'hop') {
          const yOffset = -eased * height * 0.1;
          const scale = 1 + eased * 0.05;
          model.position.set(base.x, base.y + yOffset);
          model.scale.set(base.scaleX * scale, base.scaleY * scale);
        } else {
          const xOffset = Math.sin(progress * Math.PI * 4) * width * 0.04 * (1 - progress);
          model.position.set(base.x + xOffset, base.y);
          model.scale.set(base.scaleX, base.scaleY);
        }

        if (progress >= 1) {
          model.position.set(base.x, base.y);
          model.scale.set(base.scaleX, base.scaleY);
          this.effectAnimationFrame = null;
          resolve();
          return;
        }

        this.effectAnimationFrame = requestAnimationFrame(step);
      };

      this.effectAnimationFrame = requestAnimationFrame(step);
    });
  }

  /**
   * Cancels the current procedural animation frame if one is pending.
   *
   * Inputs: none.
   * Returns: nothing.
   * Errors: does not throw.
   * Side effects: cancels one browser animation frame.
   */
  private cancelProceduralEffect(): void {
    if (this.effectAnimationFrame !== null) {
      cancelAnimationFrame(this.effectAnimationFrame);
      this.effectAnimationFrame = null;
    }
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
    this.model.anchor.set(0, 0);

    const localBounds = this.model.getLocalBounds();
    const layout = calculateLive2DLayout({
      viewport: { width, height },
      localBounds: {
        x: localBounds.x,
        y: localBounds.y,
        width: localBounds.width,
        height: localBounds.height
      }
    });

    this.model.scale.set(layout.scale);
    this.model.position.set(layout.x, layout.y);
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

/**
 * Waits for a short fixed delay between combined Live2D motions.
 *
 * Inputs: duration in milliseconds.
 * Returns: promise resolving after the timer fires.
 * Errors: does not throw.
 * Side effects: schedules one browser timer.
 */
function waitMilliseconds(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
