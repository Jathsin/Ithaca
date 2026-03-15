// Generate perlin background noise

// VECTOR CLASS
class Vector2D {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  mod() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  toString() {
    return `${this.x},${this.y}`;
  }
}

/* 
PARAMETRIZED VALUES
w, h := respective screen width and height
d := grids size
s := minimum space between dots (s >= r).
r := radius.
*/

let w = window.innerWidth,
  h = window.innerHeight,
  n = 100,
  s = 2,
  r = 1.1;
const eps = 1e-6; // Small epsilon used across functions to avoid division by zero
let d = Math.floor(w / n);

// ---- Animation loop state (prevents double RAF loops on history restore) ----
let rafId = null;
let running = false;
let lastFrameT = 0;

function startLoop() {
  if (running) return;
  running = true;
  lastFrameT = 0;
  rafId = requestAnimationFrame(step);
}

function stopLoop() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// --- Interactive points state (built once, then animated) ---
const points = [];
// Mouse is only "active" (i.e., applying gravity) while pressed
const mouse = { x: 0, y: 0, down: false };

/*
The noise map is constituted by key value pairs of coordinates and their
associated gradient vector.
*/
const noise_map = new Map();
function build_noise_map() {
  noise_map.clear();
  // Use <= so we also generate gradients on the last lattice line at x=w and y=h
  for (let x = 0; x <= w; x += d) {
    for (let y = 0; y <= h; y += d) {
      // Obtain random unitary vector
      const angle = Math.random() * 2 * Math.PI;
      const gradient = new Vector2D(Math.cos(angle), Math.sin(angle));

      noise_map.set(`${x},${y}`, gradient);
    }
  }
}

/*
Build perlin noise with my tweak, where the perlin surface defines a probability field. 
That is, defines areas with different densities of points. It is another way of drawing texture.
Let´s use a logistic distribution (sigmoid) and tune desntity with a threshold.

Input range = [-1,1]
t := threshold, usually ~ 0.5
*/

let center = new Vector2D(w / 2, h / 2);

function plot_perlin() {
  points.length = 0; // rebuild points for the current canvas

  for (let i = 0; i < w; i += s) {
    for (let j = 0; j < h; j += s) {
      // current point and its lattice cell (multiples of d)
      const coord = new Vector2D(i, j);
      const x0 = Math.floor(i / d) * d;
      const y0 = Math.floor(j / d) * d;

      // access gradients associated to a given point in the grid
      const top_left = new Vector2D(x0, y0);
      const top_right = new Vector2D(x0 + d, y0);
      const bottom_left = new Vector2D(x0, y0 + d);
      const bottom_right = new Vector2D(x0 + d, y0 + d);

      // string enables keys to be properly compared by the map
      const top_left_grad = noise_map.get(top_left.toString());
      const top_right_grad = noise_map.get(top_right.toString());
      const bottom_left_grad = noise_map.get(bottom_left.toString());
      const bottom_right_grad = noise_map.get(bottom_right.toString());

      if (
        !top_left_grad ||
        !top_right_grad ||
        !bottom_left_grad ||
        !bottom_right_grad
      ) {
        continue;
      }

      // Correct dot products: use the displacement from each lattice corner to coord
      const dot_top_left_grad = dot_gradient(coord, top_left, top_left_grad);
      const dot_top_right_grad = dot_gradient(coord, top_right, top_right_grad);
      const dot_bottom_left_grad = dot_gradient(
        coord,
        bottom_left,
        bottom_left_grad,
      );
      const dot_bottom_right_grad = dot_gradient(
        coord,
        bottom_right,
        bottom_right_grad,
      );

      const sx = (i - x0) / d;
      const sy = (j - y0) / d;
      // original interpolating function t*t*(3 - 2*t)
      // better continuity properties t * t * t * (t * (t * 6 - 15) + 10);
      const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
      const u = fade(sx),
        v = fade(sy);

      const top_interpolation = Lerp(u, dot_top_left_grad, dot_top_right_grad);
      const bottom_interpolation = Lerp(
        u,
        dot_bottom_left_grad,
        dot_bottom_right_grad,
      );
      const noise = Lerp(v, top_interpolation, bottom_interpolation);

      // Map Perlin-like value -> probability and sample
      const nn = noise / d; // normalization, approx in [-1, 1]
      const p = logistic_dist(nn, {
        inputRange: [-1, 1],
        threshold: 0.3,
        contrast: 3,
      });

      const to_center = new Vector2D(i / center.x - 1, j / center.y - 1);
      const d_to_center = to_center.mod();

      if (Math.random() < p * (1 - d_to_center)) {
        points.push({
          x: i,
          y: j,
          ox: i,
          oy: j,
          vx: 0,
          vy: 0,
          color: `rgba(${Math.floor(255 * (1 - d_to_center))}, 50, ${Math.floor(255 * d_to_center)}, ${0.4 * (1 - d_to_center) + 0.3})`,
          R: r / (d_to_center + 1),
        });
      }
    }
  }
}

function dot_gradient(coord, latticePoint, gradient) {
  const dx = coord.x - latticePoint.x;
  const dy = coord.y - latticePoint.y;
  return dx * gradient.x + dy * gradient.y;
}

function Lerp(t, a, b) {
  return a + t * (b - a);
}

/*
Map Perlin noise values to a probability in [0,1].
Use a logistic (sigmoid) so you can tune density with a threshold and contrast.
- inputRange: range of your noise values, e.g. [-1, 1] or [0, 1]
- threshold: value in [0,1] at which probability is ~0.5 after normalization
- contrast: larger -> steeper transition around threshold
- invert: flip bright/dark regions
*/
function logistic_dist(
  noiseValue,
  { inputRange = [-1, 1], threshold, contrast, invert = false } = {},
) {
  // normalize to [0,1]
  const [a, b] = inputRange;
  let v = (noiseValue - a) / (b - a);
  // clamp
  v = Math.max(0, Math.min(1, v));
  if (invert) v = 1 - v;
  // shift to center at threshold and apply contrast
  const x = contrast * (v - threshold);
  // logistic in (0,1)
  return 1 / (1 + Math.exp(-x));
}

let primary_rgba = "";

// Physics
function step(t) {
  if (!running) return;

  if (!lastFrameT) lastFrameT = t;
  // Clamp large gaps (e.g., when returning from another page) to avoid visible jumps
  const dt = Math.min(t - lastFrameT, 34);
  lastFrameT = t;

  ctx.fillStyle = primary_rgba;
  ctx.fillRect(0, 0, w, h);

  const R = 200; // radius of influence
  const G = 0.5; // gravity strength
  const damping = 0.9; // friction
  const spring = 0.001; // return-to-origin strength (0.001)

  const scale = 0.85; // <—— make figure smaller (0.5–0.8 are good values)

  ctx.save();

  // move origin to center
  ctx.translate(center.x, center.y);

  // scale everything
  ctx.scale(scale, scale);

  // move origin back
  ctx.translate(-center.x, -center.y);

  // Mouse is in screen (post-transform) coordinates. Convert to world coordinates
  // so forces line up with the scaled drawing.
  const mouseWorldX = center.x + (mouse.x - center.x) / scale;
  const mouseWorldY = center.y + (mouse.y - center.y) / scale;

  for (const p of points) {
    // devuelve al origen del punto, v es un vector
    p.vx += (p.ox - p.x) * spring;
    p.vy += (p.oy - p.y) * spring;

    // cursor gravity within radius (only while mouse is pressed)
    if (mouse.down) {
      const dx = mouseWorldX - p.x;
      const dy = mouseWorldY - p.y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < R * R) {
        const dist = Math.sqrt(dist2) + eps; // eps avoids division by 0
        const t = 1 - dist / R; // 1 near cursor, 0 at boundary
        const strength = G * t * t; // smooth falloff
        p.vx += (dx / dist) * strength;
        p.vy += (dy / dist) * strength;
      }
    }

    p.vx *= damping;
    p.vy *= damping;
    p.x += p.vx;
    p.y += p.vy;

    // draw
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.R, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }

  ctx.restore();
  const scrollFactor = scrollY * 0.002;
  // (scrollFactor is currently unused, keep it if you plan to drive the field with scroll)

  rafId = requestAnimationFrame(step);
}

let canvas, ctx;

// TODO: understand all this
function resizeCanvasToDisplaySize() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // Use CSS pixel dimensions for simulation space
  w = Math.round(rect.width);
  h = Math.round(rect.height);

  // Match the internal bitmap to device pixels for sharp rendering
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  // Draw using CSS pixel coordinates
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  center = new Vector2D(w / 2, h / 2);
  d = Math.floor(w / n);
}

function init_perlin() {
  canvas = document.getElementById("perlinCanvas");
  if (!canvas) {
    return;
  }

  // Read CSS variable after styles are loaded
  primary_rgba =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "#ffffff";

  // Guard against double init (htmx history restore / pageshow)
  if (canvas.dataset.perlinInit === "1") {
    // Still ensure correct sizing + running loop
    resizeCanvasToDisplaySize();
    startLoop();
    return;
  }
  canvas.dataset.perlinInit = "1";
  ctx = canvas.getContext("2d");
  resizeCanvasToDisplaySize();

  // Cursor tracking for interactive gravity
  function updateMousePos(e) {
    // mouse position reltive to canvas
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  canvas.addEventListener("mousemove", (e) => {
    updateMousePos(e);
  });

  canvas.addEventListener("mousedown", (e) => {
    updateMousePos(e);
    mouse.down = true;
  });

  // Use window so releasing outside the canvas still stops gravity
  window.addEventListener("mouseup", () => {
    mouse.down = false;
  });

  canvas.addEventListener("mouseleave", () => {
    mouse.down = false;
  });

  // This should only be done once per cycle

  // Rebuild the noise map to match current w,h,d
  build_noise_map();

  // Clear before drawing
  ctx.clearRect(0, 0, w, h);

  // Build the point field once, then animate it
  plot_perlin();
  startLoop();
}

// Initial load
window.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => requestAnimationFrame(fadeInMain));
  init_perlin();
});

// Stop rendering when navigating away (prevents duplicate loops)
window.addEventListener("pagehide", stopLoop);

// Back/forward cache restore
window.addEventListener("pageshow", () => {
  // Allow a clean re-init if the element is restored
  const c = document.getElementById("perlinCanvas");
  if (c) c.dataset.perlinInit = "";
  init_perlin();
});

// htmx lifecycle (swap away / restore)
document.body.addEventListener("htmx:beforeSwap", () => {
  stopLoop();
  const c = document.getElementById("perlinCanvas");
  if (c) c.dataset.perlinInit = "";
});

document.body.addEventListener("htmx:historyRestore", () => {
  const c = document.getElementById("perlinCanvas");
  if (c) c.dataset.perlinInit = "";
  init_perlin();
});

// document.body.addEventListener("htmx:afterSwap", () => {
//     const c = document.getElementById("perlinCanvas");
//     if (c) {
//         c.dataset.perlinInit = "";
//         init_perlin();
//     }
// });

// afterSettle provides time for the browser to compute final layout
document.body.addEventListener("htmx:afterSettle", () => {
  const c = document.getElementById("perlinCanvas");
  if (!c) return;
  c.dataset.perlinInit = ""; // force init path
  init_perlin();
});

// Keep canvas crisp if the viewport changes
window.addEventListener("resize", () => {
  if (!canvas || !ctx) return;
  resizeCanvasToDisplaySize();
  build_noise_map();
  plot_perlin();
});

let scrollY = 0;
window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
});

function fadeInMain() {
  const main = document.getElementById("main");
  if (!main) return;
  main.classList.remove("opacity-0");
  main.classList.add("opacity-100");
}
