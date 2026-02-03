import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

/* ===== UI ===== */
const btnPlay = document.getElementById("btnPlay");
const btnReset = document.getElementById("btnReset");
const btnAuto = document.getElementById("btnAuto");
const status = document.getElementById("status");

const speed = document.getElementById("speed");
const speedVal = document.getElementById("speedVal");

const light = document.getElementById("light");
const lightVal = document.getElementById("lightVal");

const picker = document.getElementById("picker");

/* ===== ESCENA ===== */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 500);
camera.position.set(0, 1.6, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

/* ===== CONTROLES ===== */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;

/* ===== FONDO CON IMAGEN ===== */
const textureLoader = new THREE.TextureLoader();
textureLoader.load(
  "./assets/fondo.jpg",
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 18),
      new THREE.MeshBasicMaterial({ map: tex })
    );

    // Colocamos el fondo detrás y arriba un poco
    bg.position.set(0, 5, -12);
    scene.add(bg);

    // Un toque de “atmósfera”
    scene.fog = new THREE.Fog(0x05070f, 10, 30);
  },
  undefined,
  (err) => {
    console.warn("No se pudo cargar el fondo. ¿Existe assets/fondo.jpg?", err);
  }
);

/* ===== LUCES ===== */
const ambient = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(4, 6, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
fillLight.position.set(-5, 3, 2);
scene.add(fillLight);

const backLight = new THREE.PointLight(0xffffff, 2.2, 30);
backLight.position.set(0, 3, -4);
scene.add(backLight);

/* ===== SUELO ===== */
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({ color: 0x2a2f45, roughness: 0.9, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* ===== PERSONAJE + ANIMACIÓN ===== */
const FBX_PATH = "./models/personaje.fbx";

const loader = new FBXLoader();
let model = null;
let mixer = null;
let action = null;
let isPlaying = true;
let autoRotate = false;

const meshes = [];

function ponerEstado(t) { status.textContent = t; }

function pausarReanudar() {
  isPlaying = !isPlaying;
  btnPlay.textContent = isPlaying ? "Pausar" : "Reanudar";
  ponerEstado(isPlaying ? "Reproduciendo ✅" : "En pausa ⏸️");
}

loader.load(
  FBX_PATH,
  (obj) => {
    model = obj;

    // Material con color (interactivo)
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;

        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(picker.value),
          roughness: 0.6,
          metalness: 0.05
        });

        meshes.push(child);
      }
    });

    // Centrar + escalar automático
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    model.position.sub(center);
    const scale = 1.7 / Math.max(size.y, 0.0001);
    model.scale.setScalar(scale);

    scene.add(model);

    // Animación
    if (model.animations && model.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      action = mixer.clipAction(model.animations[0]);
      action.play();
      ponerEstado("Reproduciendo ✅");
    } else {
      ponerEstado("Cargado (sin animación) 🧍");
    }
  },
  undefined,
  (err) => {
    console.error("Error cargando FBX:", err);
    ponerEstado("Error cargando el modelo ❌");
  }
);

/* ===== INTERACCIÓN: CLICK EN PERSONAJE ===== */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (!model) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(model, true);

  if (hits.length > 0) pausarReanudar();
});

/* ===== UI ===== */
btnPlay.addEventListener("click", pausarReanudar);

btnReset.addEventListener("click", () => {
  if (!action) return;
  action.reset();
  action.play();
  isPlaying = true;
  btnPlay.textContent = "Pausar";
  ponerEstado("Reiniciado ✅");
});

btnAuto.addEventListener("click", () => {
  autoRotate = !autoRotate;
  btnAuto.textContent = `Auto-rotación: ${autoRotate ? "ACTIVADA" : "DESACTIVADA"}`;
});

/* ===== SLIDERS ===== */
speed.addEventListener("input", () => {
  const v = Number(speed.value);
  speedVal.textContent = `${v.toFixed(2)}x`;
  if (mixer) mixer.timeScale = v;
});

light.addEventListener("input", () => {
  const v = Number(light.value);
  lightVal.textContent = v.toFixed(2);

  ambient.intensity = 0.5 * v;
  keyLight.intensity = 1.6 * v;
  fillLight.intensity = 1.0 * v;
  backLight.intensity = 1.2 * v;
});

picker.addEventListener("input", () => {
  const c = new THREE.Color(picker.value);
  meshes.forEach(m => m.material.color.copy(c));
});

/* Inicializa UI */
speed.dispatchEvent(new Event("input"));
light.dispatchEvent(new Event("input"));

/* ===== LOOP ===== */
const clock = new THREE.Clock();

function animar() {
  requestAnimationFrame(animar);

  const dt = clock.getDelta();
  if (mixer && isPlaying) mixer.update(dt);

  if (autoRotate) controls.rotateLeft(0.006);

  controls.update();
  renderer.render(scene, camera);
}
animar();

/* ===== RESIZE ===== */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
