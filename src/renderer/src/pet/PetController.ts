/**
 * Procedural behavior controller for the MVP desktop pet.
 *
 * Responsibility: converts high-level pet modes into whole-model transforms
 * that can be applied to a static GLB scene. It deliberately does not control
 * bones, morph targets, local mesh parts, Electron windows, DOM nodes, or file
 * loading.
 *
 * Side effects: instances keep animation time and mode state in memory. The
 * module performs no network, filesystem, DOM, or Electron I/O.
 *
 * Key dependencies and constraints: input deltas are seconds from the renderer
 * animation loop. Because the current model is a static mesh, all output is
 * whole-object position, rotation, and scale.
 */

export type PetMode = 'idle' | 'walk';

export type PetState = PetMode | 'clicked';

export interface PetVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PetTransform {
  readonly state: PetState;
  readonly position: PetVector3;
  readonly rotation: PetVector3;
  readonly scale: PetVector3;
}

export interface PetControllerOptions {
  readonly walkRange?: number;
  readonly walkSpeed?: number;
}

const CLICK_DURATION_SECONDS = 0.55;
const IDLE_FLOAT_AMPLITUDE = 0.035;
const WALK_BOB_AMPLITUDE = 0.045;

/**
 * Produces deterministic procedural transforms for a static pet model.
 *
 * Inputs: optional tuning values for horizontal walk range and speed. Values are
 * interpreted in normalized model-space units and units-per-second.
 * Returns: a stateful controller whose `update` method returns the latest
 * transform snapshot.
 * Errors: constructor does not throw; invalid or non-positive tuning values are
 * replaced with conservative defaults.
 * Side effects: stores elapsed animation time and transient click state.
 */
export class PetController {
  private mode: PetState = 'idle';
  private previousMode: PetMode = 'idle';
  private elapsedSeconds = 0;
  private clickElapsedSeconds = 0;
  private xPosition = 0;
  private walkDirection = 1;
  private readonly walkRange: number;
  private readonly walkSpeed: number;

  /**
   * Initializes controller state.
   *
   * Inputs: `options.walkRange` sets the maximum absolute horizontal offset;
   * `options.walkSpeed` sets horizontal movement speed in normalized units per
   * second. Both are optional and must be finite positive numbers to take
   * effect.
   * Returns: a new controller instance.
   * Errors: does not throw; invalid options are ignored.
   * Side effects: initializes in-memory animation state only.
   */
  public constructor(options: PetControllerOptions = {}) {
    this.walkRange = positiveOrDefault(options.walkRange, 0.42);
    this.walkSpeed = positiveOrDefault(options.walkSpeed, 0.22);
  }

  /**
   * Sets the persistent mode used outside transient click reactions.
   *
   * Inputs: `mode` is either `idle` or `walk`.
   * Returns: nothing.
   * Errors: TypeScript constrains valid modes; no runtime exception is thrown.
   * Side effects: updates in-memory mode and the mode restored after clicking.
   */
  public setMode(mode: PetMode): void {
    this.mode = mode;
    this.previousMode = mode;
  }

  /**
   * Starts a short click reaction.
   *
   * Inputs: none.
   * Returns: nothing.
   * Errors: does not throw.
   * Side effects: stores the current persistent mode and enters `clicked` until
   * enough update time has elapsed.
   */
  public click(): void {
    if (this.mode !== 'clicked') {
      this.previousMode = this.mode;
    }

    this.mode = 'clicked';
    this.clickElapsedSeconds = 0;
  }

  /**
   * Advances procedural animation and returns the transform for this frame.
   *
   * Inputs: `deltaSeconds` is elapsed wall-clock time in seconds. Non-finite or
   * negative values are treated as zero to keep output stable.
   * Returns: a transform snapshot with whole-model position, rotation, scale,
   * and logical state.
   * Errors: does not throw.
   * Side effects: mutates elapsed time, walk position, and transient click
   * timers held by this controller instance.
   */
  public update(deltaSeconds: number): PetTransform {
    const delta = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;

    this.elapsedSeconds += delta;

    if (this.mode === 'clicked') {
      this.clickElapsedSeconds += delta;

      if (this.clickElapsedSeconds >= CLICK_DURATION_SECONDS) {
        this.mode = this.previousMode;
        this.clickElapsedSeconds = 0;
      }
    }

    if (this.mode === 'walk') {
      this.advanceWalk(delta);
    }

    return this.createTransform();
  }

  /**
   * Advances horizontal walking while keeping the pet inside bounds.
   *
   * Inputs: `deltaSeconds` is a non-negative finite second value.
   * Returns: nothing.
   * Errors: does not throw.
   * Side effects: mutates horizontal position and direction.
   */
  private advanceWalk(deltaSeconds: number): void {
    this.xPosition += this.walkDirection * this.walkSpeed * deltaSeconds;

    if (this.xPosition > this.walkRange) {
      this.xPosition = this.walkRange;
      this.walkDirection = -1;
    } else if (this.xPosition < -this.walkRange) {
      this.xPosition = -this.walkRange;
      this.walkDirection = 1;
    }
  }

  /**
   * Builds the public transform snapshot from current controller state.
   *
   * Inputs: none; reads internal elapsed timers and current mode.
   * Returns: immutable-by-convention position, rotation, and scale values.
   * Errors: does not throw.
   * Side effects: none.
   */
  private createTransform(): PetTransform {
    if (this.mode === 'clicked') {
      const progress = Math.min(this.clickElapsedSeconds / CLICK_DURATION_SECONDS, 1);
      const bounce = Math.sin(progress * Math.PI);
      const twist = Math.sin(progress * Math.PI * 2) * 0.16;
      const scale = 1 + bounce * 0.16;

      return {
        state: 'clicked',
        position: vector(this.xPosition, IDLE_FLOAT_AMPLITUDE + bounce * 0.16, 0),
        rotation: vector(0, twist, Math.sin(this.elapsedSeconds * 8) * 0.07),
        scale: vector(scale, scale, scale)
      };
    }

    if (this.mode === 'walk') {
      const stride = Math.sin(this.elapsedSeconds * 9);
      const lean = this.walkDirection * 0.16;

      return {
        state: 'walk',
        position: vector(this.xPosition, Math.abs(stride) * WALK_BOB_AMPLITUDE, 0),
        rotation: vector(0, lean, stride * 0.08),
        scale: vector(1, 1, 1)
      };
    }

    const float = Math.sin(this.elapsedSeconds * 2.4);

    return {
      state: 'idle',
      position: vector(this.xPosition, IDLE_FLOAT_AMPLITUDE + float * IDLE_FLOAT_AMPLITUDE, 0),
      rotation: vector(0, Math.sin(this.elapsedSeconds * 1.3) * 0.08, float * 0.035),
      scale: vector(1, 1, 1)
    };
  }
}

/**
 * Creates a plain vector object for model transforms.
 *
 * Inputs: numeric `x`, `y`, and `z` components in normalized model units or
 * radians depending on caller context.
 * Returns: a three-component object compatible with renderer assignment.
 * Errors: does not throw; caller is responsible for passing finite numbers.
 * Side effects: none.
 */
function vector(x: number, y: number, z: number): PetVector3 {
  return { x, y, z };
}

/**
 * Normalizes optional positive numeric configuration.
 *
 * Inputs: a candidate number and the fallback used when the candidate is not a
 * finite positive value.
 * Returns: the candidate when valid, otherwise `fallback`.
 * Errors: does not throw.
 * Side effects: none.
 */
function positiveOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
