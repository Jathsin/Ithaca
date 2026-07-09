---
title: "WebGL-01: Film Grain Filter"
slug: "film-grain-filter"
parent: "projects"
description: "A WebGL shader-based film grain effect exploring GPU rendering and procedural noise."
order: 1
headers: "Introduction, What is WebGL, Rendering Pipeline, Shader Implementation, Noise Generation, Applications"
seo_title: "WebGL Film Grain Filter — grafiquer"
seo_meta_description: "Learn how to build a film grain shader using WebGL and GLSL, exploring GPU rendering and procedural noise."
seo_meta_property_title: "WebGL Film Grain Filter"
seo_meta_property_description: "A technical exploration of GPU-generated film grain using WebGL shaders."
seo_meta_og_url: "https://grafiquer.com/projects/film-grain-filter"
---

# WebGL-01: Film Grain Filter

20 year old me became fascinated by the vintage texture of _Them&I´s_ album covers — subtle grain, imperfect noise, a feeling that digital images often lack —. That led to a question:

> Can I recreate film grain using my GPU?

This curiosity pushed me beyond vanilla JavaScript and into **WebGL 1.0**, where rather than barely displaying images you program how they are _computed_.

Follow this project to learn how to build your own film grain filter.

<div class="w-full h-[550px] md:h-[750px] py-5">
    <iframe
        class="block w-full h-full border-0"
        src="/projects/film-grain-filter/canvas.html"
        loading="eager"
        title="Interactive film grain demo"
    ></iframe>
</div>

## Tooling: what is WebGL?

**WebGL (Web Graphics Library)</span>** is a JavaScript API that allows direct access to the GPU for rendering graphics in the browser.
It is built on top of **<span class="tooltip" data-tooltip="A low-level graphics API designed for embedded systems and mobile devices">OpenGL ES</span>**, which acts as the bridge between your JavaScript code and the graphics hardware. Notice that WebGL exposes the rasterization-based
pipeline of the GPU, not the complete engine. That means we can only render via rasterization (not the same as ray tracing).

- **Ray Tracing</span>**
  Simulates how light rays interact with objects to produce realistic images. It is physically accurate but computationally expensive.

- **Rasterization**
  Vertices define geometries (ie. triangles) that are later processed into pixels.

Where **<span class="tooltip" data-tooltip="A C-like language used to write programs that run directly on the GPU">GLSL (OpenGL Shading Language)</span>** is used to write programs for the GPU. They are called _shaders_. Check the following schema to understand how everything is intertwined:

<div class="py-12 flex flex-col gap-6 items-center justify-center">
      <div class="diagram-scroll">
      <div class="diagram-row flex flex-row items-center justify-center gap-3">
        <div class="diagram-box">JavaScript</div>
        <div class="arrow-line"></div>
        <div class="diagram-box">WebGL</div>
        <div class="arrow-line"></div>
        <div class="diagram-box">OpenGL ES</div>
        <div class="arrow-line"></div>
        <div class="diagram-box">GPU Driver</div>
        <div class="arrow-line"></div>
        <div class="diagram-box">GPU Hardware</div>
      </div>
      </div>
      <div class="desc">Data flow</div>
   </div>

## Core Concept: Shaders

A WebGL program is built around two shaders:

- **Vertex Shader**: runs once per vertex and determines its position in clip space (explained later), that is, defines _geometry_.

- **Fragment Shader**: runs once per fragment (potential pixel) and determines its color/texture.

- To understand the difference between a vertex (point in space) and a fragment (_potential pixel_), imagine we want to render an apple hidden behind a wall. The apple vertices exist, as well as its fragments, but not its pixels for they are not rendered.

## Coordinate Systems (Critical Insight)

WebGL works in **clip space**, a normalized coordinate system where x and y range from -1 to 1 (the cartesian coordinates you know). However, it is often more convenient to describe a full-screen quad using **UV coordinates**, where both axes range from [0, 1].

You can think of this as defining the geometry inside the first quadrant. To convert these coordinates into WebGL’s clip space ([-1,1]), we apply:

$$
x_{clip} = 2 \cdot x_{uv} - 1
$$

<div class="pt-2 mx-auto flex w-full max-w-[656px] flex-col gap-6 items-center justify-center md:flex-row">
<div class="flex flex-col gap-6 items-center ml-9 md:ml-0">
    <svg class="block shrink" style="width: min(100%, 320px); height: auto;" viewBox="0 0 1518 1572" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="19" y="138" width="1321" height="1321" fill="var(--secondary)"/>
    <path d="M19 138C19 914.793 19 1251 19 1459" stroke="var(--text_2)" stroke-width="16"/>
    <path d="M1340 1459C563.207 1459 219.003 1459 11 1459" stroke="var(--text_2)" stroke-width="16"/>
    <path d="M95 1412.95C89.8636 1412.95 85.4886 1411.56 81.875 1408.76C78.2614 1405.94 75.5 1401.86 73.5909 1396.52C71.6818 1391.16 70.7273 1384.68 70.7273 1377.09C70.7273 1369.55 71.6818 1363.1 73.5909 1357.76C75.5227 1352.4 78.2955 1348.31 81.9091 1345.49C85.5455 1342.65 89.9091 1341.23 95 1341.23C100.091 1341.23 104.443 1342.65 108.057 1345.49C111.693 1348.31 114.466 1352.4 116.375 1357.76C118.307 1363.1 119.273 1369.55 119.273 1377.09C119.273 1384.68 118.318 1391.16 116.409 1396.52C114.5 1401.86 111.739 1405.94 108.125 1408.76C104.511 1411.56 100.136 1412.95 95 1412.95ZM95 1405.45C100.091 1405.45 104.045 1403 106.864 1398.09C109.682 1393.18 111.091 1386.18 111.091 1377.09C111.091 1371.05 110.443 1365.9 109.148 1361.65C107.875 1357.4 106.034 1354.16 103.625 1351.93C101.239 1349.7 98.3636 1348.59 95 1348.59C89.9545 1348.59 86.0114 1351.08 83.1705 1356.06C80.3295 1361.01 78.9091 1368.02 78.9091 1377.09C78.9091 1383.14 79.5455 1388.27 80.8182 1392.5C82.0909 1396.73 83.9205 1399.94 86.3068 1402.15C88.7159 1404.35 91.6136 1405.45 95 1405.45Z" fill="var(--text_2)"/>
    <path d="M31.7727 23.1818V93H23.3182V32.0455H22.9091L5.86364 43.3636V34.7727L23.3182 23.1818H31.7727Z" fill="var(--text_2)"/>
    <path d="M1417.77 1387.18V1457H1409.32V1396.05H1408.91L1391.86 1407.36V1398.77L1409.32 1387.18H1417.77Z" fill="var(--text_2)"/>
    </svg>
    <div class="desc mr-9 md:mr-9">UV space</div>
  </div>
  <div class="flex flex-col gap-6 items-center">
    <svg class="block shrink" style="width: min(100%, 320px); height: auto;" viewBox="0 0 1518 1572" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="126" y="137" width="1321" height="1321" fill="var(--secondary)"/>
    <path d="M786 137C786 916.152 786 1249.37 786 1458" stroke="var(--text_2)"  stroke-width="16"/>
    <path d="M127 799C905.562 799 1238.52 799 1447 799" stroke="var(--text_2)"  stroke-width="16"/>
    <path d="M37.3636 782.341V789.841H6.81818V782.341H37.3636ZM75.929 751.182V821H67.4744V760.045H67.0653L50.0199 771.364V762.773L67.4744 751.182H75.929Z" fill="var(--text_2)"/>
    <path d="M1512.77 749.182V819H1504.32V758.045H1503.91L1486.86 769.364V760.773L1504.32 749.182H1512.77Z" fill="var(--text_2)"/>
    <path d="M796.773 23.1818V93H788.318V32.0455H787.909L770.864 43.3636V34.7727L788.318 23.1818H796.773Z" fill="var(--text_2)"/>
    <path d="M750.364 1531.34V1538.84H719.818V1531.34H750.364ZM788.929 1500.18V1570H780.474V1509.05H780.065L763.02 1520.36V1511.77L780.474 1500.18H788.929Z" fill="var(--text_2)"/>
    </svg>
    <div class="desc">Clip space</div>
  </div>
</div>

## Vertex Shader (Boilerplate)

This shader maps positions to clip space and passes texture coordinates forward:

```glsl
attribute vec2 a_position;   // Vertex position in pixel coordinates
attribute vec2 a_tex_coord;  // Texture (UV) coordinates

uniform vec2 u_resolution;   // Canvas resolution in pixels

varying vec2 v_tex_coord;    // Passed to the fragment shader

void main() {
   // Convert pixel coordinates -> normalized [0,1] -> clip space [-1,1]
   vec2 clip_space = (a_position / u_resolution) * 2.0 - 1.0;

   // Flip the Y axis because WebGL clip space has +Y pointing upward.
   gl_Position = vec4(clip_space * vec2(1, -1), 0.0, 1.0);

   // Forward the UV coordinates to the fragment shader.
   v_tex_coord = a_tex_coord;
}
```

## Fragment Shader: Film Grain

This is where the actual effect happens.

We simulate film grain by adding **<span class="tooltip" data-tooltip="Deterministic randomness computed mathematically, not truly random">pseudo-random noise</span>**
to each pixel. For that we create a function:

```glsl
float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
```

This produces a repeatable noise pattern based on pixel coordinates.

How do our two sliders (density and size) manipulate this pattern? First, notice in the next code block, that noise is applied by adding this random value to our color vector. Therefore, it all goes on computing `diff`.

```glsl
vec4 grain(vec4 fragColor){
  vec4 color = fragColor;

  vec2 cell = floor(gl_FragCoord.xy / grain_size);
  float diff = rand(cell) - 0.5;

  color.rgb += diff;
  return color;
}
```

**Density**

We interpolate between the original color and the noisy color (`color.rgb += diff`) using `mix()`, a WebGL built-in for lerp. The third parameter, `blend_val`, does the role of t in the following formula. It measures how far the final color will lie from eache extreme.

$$
c_{final} = t * c_{noisy} + (1 - t) * c_{original} \mid t \in [0,1]
$$

So:

- `blend_val = 0` → original image
- `blend_val = 1` → full noise

Notice that what we call noisy color, is actually named `grain_val` in our code.

```glsl
gl_FragColor = mix(color, grain_val, blend_val);
```

**Size**

See that **<span class="tooltip" data-tooltip="Built-in variable containing the pixel's screen coordinates">gl_FragCoord</span>** changes per pixel.

To give the impression of an increase in size, pixels that are near each other to hold similar color values, that is, to apply a similar `diff` to each of them.

This is accomplished by dividing `gl_FragCoord.xy` by a constant, that is what we name `grain_size`. As the parameter increases, `cell` gets nearer 0 for every pixel, implying that similar values will be pased to `rand()`. Ar our random function is deterministic, similar diffs will be applied to the color of those pixels.

This is the full fragment shader:

```glsl
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_resolution;
varying vec2 v_tex_coord;
uniform float blend_val;
uniform float grain_size;

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 grain(vec4 fragColor){
  vec4 color = fragColor;

  vec2 cell = floor(gl_FragCoord.xy / grain_size);
  float diff = rand(cell) - 0.5;

  color.rgb += diff;
  return color;
}

void main() {
    vec4 color = texture2D(u_image, v_tex_coord);
    vec4 grain_val = grain(color);
    gl_FragColor = mix(color, grain_val, blend_val);
}
```

## What I Learned

- **GPU as a state machine**  
  The GPU pipeline can be understood as a sequence of explicit states and commands. For example, when using a buffer:
  - Allocate memory on the GPU and bind it to a target
  - Configure how that memory will be read (attributes, pointers, layout)
  - Upload data into that memory and issue draw calls that consume it

- **Principles of noise generation**  
  Learned how to build deterministic pseudo-random functions on the GPU and how to control their visual appearance (intensity and scale) through parameters like `blend_val` and `grain_size`.

- **Embedding projects with iframes**  
  Used `<iframe>` to isolate and load interactive WebGL content within the page, keeping the main layout clean while enabling reusable, self-contained demos.

---

## Resources

- https://webglfundamentals.org/
- https://glslsandbox.com/
- https://bruno-simon.com/

<iframe class="mt-10 mx-auto" data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/track/1iBZ54hEvr2EYk44MgfD7X?utm_source=generator" width="70%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
