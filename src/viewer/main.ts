import * as THREE from 'three';
import { PALETTE } from '../core/Palette';
import { buildAssetCatalog, type ViewerModel } from './catalog';
import { loadGltf } from '../world/GltfModels';
import { el } from '../ui/Widgets';
import './viewer.css';

/**
 * Standalone Asset Viewer. Renders every procedural model in its own stage
 * with orbit controls + an inspector. No external assets - the same geometry
 * library the game uses.
 */
function mount(): void {
  const root = document.getElementById('viewer-app');
  if (!root) return;
  const boot = document.getElementById('viewer-boot');

  const catalog = buildAssetCatalog();
  let current: ViewerModel | null = null;

  // ---- Stage ----
  const canvas = el('canvas', 'viewer-canvas') as HTMLCanvasElement;
  root.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.slateDark);
  scene.fog = new THREE.Fog(PALETTE.slateDark, 9, 26);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(3.4, 2.4, 4.6);

  const key = new THREE.DirectionalLight(0xfff1da, 1.15);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(PALETTE.slate, PALETTE.peatDark, 0.55));
  const rim = new THREE.PointLight(PALETTE.rustBright, 0.7, 30);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 48),
    new THREE.MeshStandardMaterial({ color: PALETTE.slateDark, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const pivot = new THREE.Group();
  scene.add(pivot);

  // ---- Orbit (drag) ----
  let theta = Math.PI * 0.25;
  let phi = Math.PI * 0.34;
  let radius = 5.5;
  let dragging = false;
  let lx = 0;
  let ly = 0;

  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    theta -= (e.clientX - lx) * 0.01;
    phi = Math.max(0.18, Math.min(1.45, phi - (e.clientY - ly) * 0.01));
    lx = e.clientX; ly = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    radius = Math.max(2.2, Math.min(16, radius + e.deltaY * 0.002));
  }, { passive: false });

  function placeCamera(): void {
    camera.position.set(
      pivot.position.x + radius * Math.sin(phi) * Math.cos(theta),
      pivot.position.y + radius * Math.cos(phi),
      pivot.position.z + radius * Math.sin(phi) * Math.sin(theta),
    );
    camera.lookAt(pivot.position);
  }

  async function show(model: ViewerModel): Promise<void> {
    current = model;
    pivot.clear();
    let obj: THREE.Object3D;
    if (model.gltfId) {
      const loaded = await loadGltf(model.gltfId);
      if (loaded) {
        obj = loaded.object;
        // Play first animation if present (e.g. Fox run cycle).
        if (loaded.anims.length > 0) {
          const mixer = new THREE.AnimationMixer(obj);
          mixer.clipAction(loaded.anims[0]).play();
          (pivot as unknown as { __mixer?: THREE.AnimationMixer }).__mixer = mixer;
        }
      } else {
        obj = model.build();
      }
    } else {
      obj = model.build();
    }
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    pivot.add(obj);
    // Frame it.
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    pivot.position.set(0, -center.y, 0);
    radius = Math.max(size.x, size.y, size.z) * 2.4 + 1.6;
    const tris = countTris(obj);
    const verts = countVerts(obj);
    infoName.textContent = model.name;
    infoCat.textContent = model.category;
    infoNote.textContent = model.note;
    infoStats.textContent = `${tris.toLocaleString()} tris · ${verts.toLocaleString()} verts · ${model.id}`;
  }

  function countTris(o: THREE.Object3D): number {
    let n = 0;
    o.traverse((c) => {
      if (c instanceof THREE.Mesh && c.geometry.index) n += c.geometry.index.count / 3;
      else if (c instanceof THREE.Mesh) n += c.geometry.attributes.position.count / 3;
    });
    return Math.round(n);
  }
  function countVerts(o: THREE.Object3D): number {
    let n = 0;
    o.traverse((c) => { if (c instanceof THREE.Mesh) n += c.geometry.attributes.position.count; });
    return n;
  }

  // ---- UI panels ----
  const sidebar = el('aside', 'viewer-side');
  const main = el('div', 'viewer-main');
  root.appendChild(sidebar);
  root.appendChild(main);

  const title = el('div', 'viewer-head');
  title.innerHTML = '<div class="vh-game">ASHENREACH</div><div class="vh-sub">Asset Viewer · all geometry procedural</div>';
  sidebar.appendChild(title);

  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Filter assets…';
  search.className = 'viewer-search';
  sidebar.appendChild(search);

  const list = el('div', 'viewer-list');
  sidebar.appendChild(list);

  const info = el('div', 'viewer-info');
  main.appendChild(info);
  const infoName = el('div', 'vi-name', '—');
  const infoCat = el('div', 'vi-cat', '');
  const infoNote = el('div', 'vi-note', '');
  const infoStats = el('div', 'vi-stats', '');
  info.append(infoName, infoCat, infoNote, infoStats);

  const cats = ['character', 'enemy', 'weapon', 'prop', 'environment'];
  const catLabel: Record<string, string> = {
    character: 'Characters', enemy: 'Enemies', weapon: 'Weapons', prop: 'Props', environment: 'Environment',
  };

  function renderList(filter = ''): void {
    list.innerHTML = '';
    for (const c of cats) {
      const items = catalog.filter((m) => m.category === c && m.name.toLowerCase().includes(filter.toLowerCase()));
      if (items.length === 0) continue;
      const head = el('div', 'vl-cat', catLabel[c]);
      list.appendChild(head);
      for (const m of items) {
        const b = el('button', 'vl-item', m.name);
        if (current?.id === m.id) b.classList.add('active');
        b.addEventListener('click', () => { void show(m); renderList(search.value); });
        list.appendChild(b);
      }
    }
  }
  search.addEventListener('input', () => renderList(search.value));

  // ---- Resize ----
  function resize(): void {
    const w = main.clientWidth;
    const h = main.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // ---- Loop ----
  let spin = 0;
  let last = performance.now();
  function frame(): void {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (!dragging) spin += dt * 0.25;
    pivot.rotation.y = spin;
    const mixer = (pivot as unknown as { __mixer?: THREE.AnimationMixer }).__mixer;
    if (mixer) mixer.update(dt);
    placeCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  renderList();
  void show(catalog[0]);
  resize();
  requestAnimationFrame(frame);
  if (boot) { boot.classList.add('gone'); window.setTimeout(() => boot.remove(), 500); }
  // expose for debugging / automated tests
  (window as unknown as { __viewer: unknown }).__viewer = { catalog, show, renderer, scene };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
