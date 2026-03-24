---
title: "WegGL-01: film grain filter"
slug: "film-grain-filter"
parent: "projects"
description: "Exploring film grain and noise generation using WebGL shaders."
order: 1
headers: "Introduction, GPU vs CPU, WebGL Pipeline, Types of Noise"
seo_title: "Film Grain Filter"
seo_meta_description: "Exploring film grain and procedural noise using WebGL shaders."
seo_meta_property_title: "Noise Filter"
seo_meta_property_description: "A study of GPU-generated film grain and noise in WebGL."
seo_meta_og_url: "https://grafiquer.com/projects/film-grain-filter"
---

# WebGL-0: Film Grain Filter

1. 20 year old me had been listening to Them&I for a while (if you like downtempo/chill electronic vibes you should give it a try) and realised how aesthetic and vintage the front pages of his songs were. Soon, driven by my obession with old cameras and willing to replicate that effect in my pictures, I left vanilla java script for the first time and dove head first into: **WebGL 1.0**.

<div class="w-full h-[550px] md:h-[750px] py-5">
    <iframe class="block w-full h-full border-0"
        src="/projects/film-grain-filter/canvas.html"
    ></iframe>
</div>

## Brief intro to WebGL

2. WebGL stands for Web Graphics Library, it is simply an API that allows web pages to access your GPU to render graphics using rasterization. That is, in computer graphics there are two main rendering approaches:

- Ray tracing: simulates rays that hit objects in the scene, making them visible.
- Rasterization: draw vertices -> build triangles -> color them -> image

3. In other words, WebGL just exposes the rasterization pipeline of your GPU to the browser.
   Both WebGl 1.0 and 2.0 call OpenGL ES functions through JS. This means we can write programms for the GPU (shaders), and this API (OpenGL) will send it. The language in which these programms are written OpenGL Shading Language (GLSL).

4. Notice to Mariners: I started with WebGL 1.0 because I thought it would help me appreciate and understand better 2.0, no other particular reason
   The 2.0 version provides built-ins for matters that require extensions in 1.0.

JavaScript
↓
WebGL API
↓
OpenGL ES API
↓
GPU driver
↓
GPU hardware

JavaScript
↓
WebGL API
↓
OpenGL ES
↓
GLSL shaders
↓
GPU execution

5. If rather than believing in your GPU you prefer to understand it (like me), I encourage you to check the official manual: <https://webglfundamentals.org/>, since this is not a tutorial per se. For the TLRD:

## How the shader works

6. The API is already built on the browser, so no need to download or embed a library. Actually, you could paste this code into ,<a href="https://jsfiddle.net/greggman/8djzyjL3/">Greggman´s </a> and play with it by yourself. In the following, how to develop a noise filter shader in a nutshell:

7. First, you need a html canvas to start talking in WebGL.

<div class="code-block bg-[var(--code-block)] rounded-[0.7rem]">
   <div class="-mt-px w-full flex justify-end rounded-t-[0.7rem]">
      <button class="copy-btn p-2 cursor-pointer opacity-85 hover:opacity-100 transition-opacity duration-200 ease-in-out">
         <svg class="size-4.5" xmlns="http://www.w3.org/2000/svg" fill="var(--secondary)" viewBox="0 0 48 48" id="Copy--Streamline-Ionic-Filled">
            <desc>
               Copy Streamline Icon: https://streamlinehq.com
            </desc>
            <path d="M39.959 47.52H16.4397c-2.005 0 -3.9278 -0.7965 -5.3456 -2.2142 -1.4177 -1.4178 -2.2142 -3.3406 -2.2142 -5.3457V16.4407c0 -2.005 0.7965 -3.9277 2.2142 -5.3455 1.4178 -1.4177 3.3406 -2.2142 5.3456 -2.2142H39.959c2.0051 0 3.9279 0.7965 5.3457 2.2142 1.4177 1.4178 2.2142 3.3405 2.2142 5.3455v23.5194c0 2.0051 -0.7965 3.9279 -2.2142 5.3457 -1.4178 1.4177 -3.3406 2.2142 -5.3457 2.2142Z" stroke-width="1"></path>
            <path d="M13.9207 5.5199h24.7668c-0.5227 -1.4729 -1.4884 -2.748 -2.7644 -3.6503C34.647 0.9673 33.1232 0.4819 31.5602 0.48H8.0409c-2.005 0 -3.9279 0.7965 -5.3456 2.2142S0.4811 6.0348 0.4811 8.0398v23.5194C0.483 33.122 0.9684 34.646 1.8707 35.922c0.9023 1.276 2.1774 2.2418 3.6502 2.7643V13.9197c0 -2.2278 0.885 -4.3644 2.4602 -5.9396 1.5753 -1.5753 3.7119 -2.4602 5.9396 -2.4602Z" stroke-width="1"></path>
         </svg>
      </button>
   </div>

```javascript
var canvas = document.querySelector("canvas");
var gl = canvas.getContext("webgl");
if (!gl) {
   throw new Error("could not initialise WebGL context");
```

</div>

8. Then,
9. WebGL shaders are constituted by two scripts:

- Vertex shader: specify where in the screen you will render vertices (not the same as pixels).
- Fragment shader: properties of the fragments derived from those vertices.

It is fine if you don´t understand the syntax, variable declaration, data types... You can check the manual and come back here afterwards.

### How to load an image using WebGL

### The real magic: Noise

8. What this script is doing is basically changing how we reference coordinates
   and telling where to render a vertex by asigning the coordinates of our texture
   to gl_Position.

<div class="code-block bg-[var(--code-block)] rounded-[0.7rem]">

```javascript
<script id="vertex_shader" type="x-shader/x-vertex">
  // Which part of the image goes on which part of the triangle?
  // That is why we define texCoord attribute
  attribute vec2 a_position;
  attribute vec2 a_tex_coord;
  uniform vec2 u_resolution;
  varying vec2 v_tex_coord;

  void main() {
     // convert coordinates to clip-space
     vec2 zero_to_one = a_position / u_resolution;
     vec2 zero_to_two = zero_to_one * 2.0;
     vec2 clip_space = zero_to_two - 1.0;
     gl_Position = vec4(clip_space*vec2(1,-1), 0, 1); // flip y-axis

     // pass the texCoord to the fragment shader
     // The GPU will interpolate this value between points.
     v_tex_coord = a_tex_coord;
  }
</script>
```

</div>

<div class="code-block bg-[var(--code-block)] rounded-[0.7rem]">

```javascript
   <script id="fragment_shader" type="x-shader/x-fragment">
     precision highp float;

     uniform sampler2D u_image;
     uniform vec2 u_resolution;
     varying vec2 v_tex_coord;
     uniform float blend_val;
     uniform float grainsize;

     float rand(vec2 co){
       return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
     }

     // Brightness
     vec4 grain(vec4 fragColor){
       vec4 color = fragColor;

       vec2 cell = floor(gl_FragCoord.xy / grainsize);
       float diff = rand(cell) - 0.5;

       color.rgb += diff;
       return color;
     }

     void main() {
         vec2 uv = gl_FragCoord.xy / u_resolution;
         vec4 color = texture2D(u_image, v_tex_coord);
         vec4 grain_val = grain(color);
         gl_FragColor = mix(color, grain_val, blend_val);

     }

   </script>
```

</div>

- Vertex shader
- Fragment shader (what is fragment)

9. Check the full js code <a href="https://github.com/Jathsin/grafiquer/tree/main/projects/film-grain-filter">here</a>.

- GPU as a state machine (buffers, etc.)
  example with buffer

- `gl.*` constants

5. There is a library not to build your own functions and methods

### Different kinds of noise

4. I just discovered — GPT told me — that there are programs that talk directly to the GPU, whereas JavaScript normally talks to the CPU. These programs accelerate the rendering of pixels on screen. One of them is **WebGL**, which I intend to learn over time.

   Check this resource: https://webglfundamentals.org/

   Things to review:
   - GPU as a state machine (buffers, etc.)
   - `gl.*` constants
   - The rendering pipeline

5. Film grain reference:
   https://maximmcnair.com/p/webgl-film-grain

## Applications

I might write a tutorial further on.

Resources

Learn more:
https://bruno-simon.com/

https://glslsandbox.com/
https://observablehq.com/@observable81?tab=recents

https://maximmcnair.com/p/webgl-film-grain
