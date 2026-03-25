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

## Introduction

20 year old me had been listening to _Them&I_, and became fascinated by the vintage texture of their album covers — subtle grain, imperfect noise, a feeling that digital images often lack. That led to a question:

> Can I recreate film grain _procedurally_ using the GPU?

This curiosity pushed me beyond vanilla JavaScript and into **WebGL 1.0**, where images are no longer just displayed — you program how they are _computed_. Follow this project to learn how to build your own film grain filter.

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
It is built on top of **<span class="tooltip" data-tooltip="A low-level graphics API designed for embedded systems and mobile devices">OpenGL ES</span>**,  
which acts as the bridge between your JavaScript code and the graphics hardware. Notice that WebGL exposes the rasterization-based
pipeline of the GPU, not the complete engine. That is, we find two main rendering paradigms:

- **Ray Tracing</span>**
  Simulates how light rays interact with objects to produce realistic images. It is physically accurate but computationally expensive.

- **Rasterization**
  Vertices define geometries (ie. triangles) that are later processed into pixels.

   <div class="py-12 flex flex-col gap-6 items-center justify-center">
      <div class="flex flex-row items-center justify-center gap-3 ">
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
      <div class="desc">Data flow</div>
   </div>

Where **<span class="tooltip" data-tooltip="A C-like language used to write programs that run directly on the GPU">GLSL (OpenGL Shading Language)</span>** is used to write programs for the GPU. They are called _shaders_.

## Core Concept: Shaders

A WebGL program is built around two shaders:

- **Vertex Shader**: runs once per vertex and determines its position in clip space (explained later), that is, defines _geometry_.

- **Fragment Shader**: runs once per fragment (potential pixel) and determines its color/texture.

Important distinction: a vertex is a point in space, while a fragment is a _potential pixel_ (before visibility tests). That is, all information is computed before being displayed. For instance, imagine we want to render an apple hidden behind a wall. The apple vertices exist, as well as its fragments, but not its pixels.

## Coordinate Systems (Critical Insight)

WebGL works in **clip space**, a normalized coordinate system where x and y range from -1 to 1 (the cartesian coordinates you know).

However, input coordinates are typically in `[0, 1]`, also known as **UV coordinates**. To obtain clip space from uv:

$$
x_{clip} = 2 \cdot x_{uv} - 1
$$

## Vertex Shader (Boilerplate)

This shader maps positions to clip space and passes texture coordinates forward:

```glsl
attribute vec2 a_position;
attribute vec2 a_tex_coord;
uniform vec2 u_resolution;
varying vec2 v_tex_coord;

void main() {
   vec2 clip_space = (a_position / u_resolution)*2.0 - 1.0;
   gl_Position = vec4(clip_space*vec2(1,-1), 0, 1);

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
