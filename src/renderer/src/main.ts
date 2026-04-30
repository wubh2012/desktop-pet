/**
 * Three.js renderer entry for the desktop pet.
 *
 * Responsibility: owns the browser-side WebGL scene, local GLB loading, model
 * normalization, pointer hit testing, and frame loop that applies procedural
 * pet transforms. It does not create Electron windows or expose Node.js APIs.
 *
 * Side effects: creates a WebGL canvas in the document, reads the bundled local
 * `pet.glb` asset through the browser loader, registers resize and pointer
 * listeners, and starts a requestAnimationFrame loop.
 *
 * Key dependencies and constraints: runs in Electron's isolated renderer
 * process. The current GLB is static, so animation is applied to the whole
 * loaded scene instead of bones or morph targets.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import './styles.css';
import {
  isPetActionMode,
  isPetOneShotAction,
  type PetActionMode,
  type PetOneShotAction
} from '../../shared/petActionMode';
import { buildRendererAssetUrl } from './pet/assetUrl';
import { showModelLoadFailure, showModelLoadSuccess } from './pet/loadStatus';
import { calculateModelLayout } from './pet/modelLayout';
import { hasDebugModelYawOverride, resolveModelYaw } from './pet/modelOrientation';
import { repairMissingMaterials } from './pet/materialRepair';
import { PetController, type PetTransform } from './pet/PetController';
import { detectModelCapabilities } from './pet/modelCapabilities';

declare global {
  interface Window {
    readonly desktopPet?: {
      readonly platform: string;
      onActionModeChanged(callback: (mode: PetActionMode) => void): () => void;
      onOneShotAction(callback: (action: PetOneShotAction) => void): () => void;
      onLookAtMouseChanged(callback: (enabled: boolean) => void): () => void;
      onModelYawChanged(callback: (yawRadians: number) => void): () => void;
      openPetActionMenu(): Promise<void>;
    };
  }
}

const MODEL_URL = buildRendererAssetUrl(import.meta.env.BASE_URL, 'assets/pet.glb');
const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Renderer root #app was not found.');
}

const statusElement = createStatusElement();
const canvasHost = createCanvasHost();
const dragHandle = createDragHandle();
root.append(canvasHost, dragHandle, statusElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0.85, 5.8);
camera.lookAt(0, 0.1, 0);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasHost.append(renderer.domElement);

const petController = new PetController({ walkRange: 0.26, walkSpeed: 0.16 });
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let petRoot: THREE.Object3D | null = null;
let normalizedModel: THREE.Object3D | null = null;
let lookAtMouseEnabled = false;
let pointerLookX = 0;
let modelYawRadians = resolveModelYaw(window.location.search, import.meta.env.DEV);

setupLights(scene);
resizeRenderer();
window.addEventListener('resize', resizeRenderer);
renderer.domElement.addEventListener('pointerdown', handlePointerDown);
renderer.domElement.addEventListener('pointermove', handlePointerMove);
renderer.domElement.addEventListener('contextmenu', handleContextMenu);
window.desktopPet?.onActionModeChanged((mode) => {
  if (isPetActionMode(mode)) {
    petController.setMode(mode);
  }
});
window.desktopPet?.onOneShotAction((action) => {
  if (isPetOneShotAction(action)) {
    petController.triggerOneShot(action);
  }
});
window.desktopPet?.onLookAtMouseChanged((enabled) => {
  lookAtMouseEnabled = enabled;

  if (!enabled) {
    pointerLookX = 0;
  }
});
window.desktopPet?.onModelYawChanged((yawRadians) => {
  if (!hasDebugModelYawOverride(window.location.search, import.meta.env.DEV)) {
    applyModelYaw(yawRadians);
  }
});

void loadPetModel();
requestAnimationFrame(animate);

/**
 * Creates the transparent canvas host element.
 *
 * Inputs: none.
 * Returns: an element that fills the Electron renderer surface.
 * Errors: does not throw.
 * Side effects: none until the caller appends the element to the DOM.
 */
function createCanvasHost(): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'canvas-host';
  return element;
}

/**
 * Creates the compact development status element.
 *
 * Inputs: none.
 * Returns: a status element hidden in production builds.
 * Errors: does not throw.
 * Side effects: none until the caller appends the element to the DOM.
 */
function createStatusElement(): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'status';
  element.textContent = '加载中...';
  element.hidden = !import.meta.env.DEV;
  return element;
}

/**
 * Creates an invisible native drag region.
 *
 * Inputs: none.
 * Returns: a fixed-position element that Electron treats as draggable window
 * chrome.
 * Errors: does not throw.
 * Side effects: none until the caller appends the element to the DOM.
 */
function createDragHandle(): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'drag-handle';
  element.setAttribute('aria-hidden', 'true');
  return element;
}

/**
 * Adds MVP lighting to the scene.
 *
 * Inputs: the Three.js scene receiving ambient and directional lights.
 * Returns: nothing.
 * Errors: does not throw for a valid scene instance.
 * Side effects: mutates the scene by adding light objects.
 */
function setupLights(targetScene: THREE.Scene): void {
  const ambient = new THREE.HemisphereLight(0xffffff, 0x6b7280, 2.3);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  const fill = new THREE.DirectionalLight(0xb7d7ff, 0.9);

  key.position.set(3.4, 4.2, 5.6);
  fill.position.set(-4, 2.2, 2.6);

  targetScene.add(ambient, key, fill);
}

/**
 * Loads the local pet GLB and attaches it to the scene.
 *
 * Inputs: none; uses the fixed local `MODEL_URL`.
 * Returns: a promise that resolves after the model is added or an error is
 * rendered to the status element.
 * Errors: loader failures are caught and converted to a safe UI message.
 * Side effects: reads a local static asset, mutates the scene, and updates the
 * development status element.
 */
async function loadPetModel(): Promise<void> {
  try {
    const gltf = await loader.loadAsync(MODEL_URL);
    await repairMissingMaterials(gltf);
    const wrapper = normalizeModel(gltf);

    petRoot = wrapper;
    normalizedModel = gltf.scene;
    scene.add(wrapper);

    const capabilities = detectModelCapabilities(gltf);
    showModelLoadSuccess(statusElement, {
      animationCount: capabilities.animationNames.length,
      platform: window.desktopPet?.platform ?? 'browser'
    });
  } catch (error) {
    console.error('Failed to load local pet model.', error);
    showModelLoadFailure(statusElement);
  }
}

/**
 * Normalizes a loaded GLTF scene into a stable desktop-pet wrapper.
 *
 * Inputs: `gltf` from Three.js `GLTFLoader`, expected to contain a scene.
 * Returns: a wrapper object centered near the bottom of the renderer viewport.
 * Errors: does not throw for an empty scene; bounding boxes may be empty and
 * then fall back to a scale of one.
 * Side effects: mutates the loaded scene's position and scale.
 */
function normalizeModel(gltf: GLTF): THREE.Object3D {
  const wrapper = new THREE.Group();
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const layout = calculateModelLayout({
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    max: { x: box.max.x, y: box.max.y, z: box.max.z },
    targetSize: 2.55
  });

  model.position.set(layout.position.x, layout.position.y, layout.position.z);
  model.scale.setScalar(layout.scale);
  model.rotation.y = modelYawRadians;
  wrapper.add(model);

  return wrapper;
}

/**
 * Applies a persisted or menu-selected base yaw to the loaded GLB scene.
 *
 * Inputs: `yawRadians` is a finite Y-axis rotation in radians.
 * Returns: nothing.
 * Errors: invalid yaw values are ignored.
 * Side effects: updates in-memory renderer orientation state and mutates the
 * loaded model scene if it has already been attached.
 */
function applyModelYaw(yawRadians: number): void {
  if (!Number.isFinite(yawRadians)) {
    return;
  }

  modelYawRadians = yawRadians;

  if (normalizedModel) {
    normalizedModel.rotation.y = yawRadians;
  }
}

/**
 * Advances animation and renders one frame.
 *
 * Inputs: requestAnimationFrame timestamp, unused because a Three.js clock
 * provides frame deltas.
 * Returns: nothing.
 * Errors: render errors are not swallowed; WebGL failures should be visible in
 * development tooling.
 * Side effects: schedules the next frame, updates pet transforms, and renders.
 */
function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (petRoot) {
    applyTransform(
      petRoot,
      petController.update(delta, { lookAtX: lookAtMouseEnabled ? pointerLookX : 0 })
    );
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

/**
 * Applies a controller transform to the loaded pet wrapper.
 *
 * Inputs: `target` is the wrapper object; `transform` contains normalized
 * position, rotation, scale, and state data from `PetController`.
 * Returns: nothing.
 * Errors: does not throw for a valid Three.js object.
 * Side effects: mutates the target object's transform fields.
 */
function applyTransform(target: THREE.Object3D, transform: PetTransform): void {
  target.position.set(transform.position.x, -0.08 + transform.position.y, transform.position.z);
  target.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  target.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

/**
 * Handles pointer clicks on the WebGL canvas.
 *
 * Inputs: browser pointer event in client coordinates.
 * Returns: nothing.
 * Errors: does not throw; missing model data results in no action.
 * Side effects: may trigger the pet controller's click reaction.
 */
function handlePointerDown(event: PointerEvent): void {
  if (isPointerOverPet(event)) {
    petController.click();
  }
}

/**
 * Handles right-click context menu requests on the WebGL canvas.
 *
 * Inputs: browser mouse event in client coordinates.
 * Returns: nothing.
 * Errors: IPC failures are intentionally not thrown into the event loop.
 * Side effects: suppresses the browser context menu and may ask Electron main
 * process to show the native pet action menu when the model is hit.
 */
function handleContextMenu(event: MouseEvent): void {
  event.preventDefault();

  if (isPointerOverPet(event)) {
    void window.desktopPet?.openPetActionMenu();
  }
}

/**
 * Checks whether a pointer-like event intersects the loaded pet model.
 *
 * Inputs: event with client coordinates relative to the browser viewport.
 * Returns: true when raycasting hits the current pet wrapper or descendants.
 * Errors: does not throw; missing model or zero-sized canvas returns false.
 * Side effects: updates reusable raycaster and pointer vectors.
 */
function isPointerOverPet(event: MouseEvent | PointerEvent): boolean {
  if (!normalizedModel || !petRoot) {
    return false;
  }

  const rect = renderer.domElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  raycaster.setFromCamera(pointer, camera);

  return raycaster.intersectObject(petRoot, true).length > 0;
}

/**
 * Tracks mouse horizontal offset for look-at-mouse mode.
 *
 * Inputs: browser pointer event in client coordinates.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: updates the normalized pointer yaw input used during animation.
 */
function handlePointerMove(event: PointerEvent): void {
  if (!lookAtMouseEnabled) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointerLookX = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
}

/**
 * Resizes the WebGL renderer to the current transparent window bounds.
 *
 * Inputs: none; reads canvas host dimensions from layout.
 * Returns: nothing.
 * Errors: does not throw.
 * Side effects: mutates renderer size and camera projection.
 */
function resizeRenderer(): void {
  const width = Math.max(canvasHost.clientWidth, 1);
  const height = Math.max(canvasHost.clientHeight, 1);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
