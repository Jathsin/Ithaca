---
title: "p5-01: Bezier Flight"
slug: "bezier-flight"
parent: "projects"
description: "A procedural flight animation built from cubic Bezier curves, trailing particles, and simple depth cues."
order: 2
headers: "Introduction, Tooling, Cubic Bezier Curves, Chaining the Path, Tail and Depth, Reset Logic, What I Learned"
seo_title: "Bezier Flight — grafiquer"
seo_meta_description: "A procedural animation built with cubic Bezier curves, tail memory, and depth cues using p5.js."
seo_meta_property_title: "Bezier Flight"
seo_meta_property_description: "A study of procedural motion using cubic Bezier curves and simple atmospheric rendering."
seo_meta_og_url: "https://grafiquer.com/projects/bezier-flight"
---

# p5-01: Bezier Flight

Some projects begin with a technical question. This one began with a visual one:

> How the hell can a Chinese Dragon be procedurally programmed?

The result is a small animation in which a point glides through chained **cubic Bezier curves**, while its recent positions remain on screen as a tail. The piece is simple in ingredients, but expressive in effect: a sky gradient, a moving body, a shadow, a highlight, and a glow that together suggest a tiny object flying through atmosphere.

This project is not about simulation in the physical sense. It is about using a geometric object, the Bezier curve, as a scaffold for controlled motion.

<div class="mx-auto my-5 w-full max-w-[920px] overflow-hidden rounded-[12px] aspect-[4/3] max-h-[420px] sm:max-h-[520px] md:max-h-[640px]">
    <iframe
        class="block w-full h-full border-0"
        loading="eager"
        title="Interactive Bezier Flight demo"
        src="https://editor.p5js.org/Jathsin/full/CPtKO1-tH"
    ></iframe>
</div>

Click <a href="https://editor.p5js.org/Jathsin/sketches/CPtKO1-tH">here</a> to play with the code in your browser and see by yourself where you can take it. Everything, from the tool used to the mathematical foundations are explained in the following sections:

## Tooling: a brief note on p5

This animation is written in **p5.js**, a JavaScript library oriented toward creative coding. In practice, p5 gives me a compact environment for:

- Creating a canvas.
- Drawing shapes frame by frame.
- Working with color.
- Handling randomness and animation loops.

That is enough for this project. I will write about **p5** and **Processing** more carefully in a separate article, so here I only treat it as the medium, not the subject. Just modify _bezier_flight.js_ and press the play button at the upper left corner to see your changes.

## The geometric core: cubic Bezier curves

The whole motion is driven by one function: evaluating a cubic Bezier curve.

**What is a Bezier Curve**

To understand Bezier curves, it is useful to introduce the notion of a **barycenter** (or weighted average of points).

Given points \(P\*1, \dots, P_m\) with associated weights \(\alpha^1, \dots, \alpha^m\) such that

$$
\alpha^1 + \cdots + \alpha^m \neq 0,
$$

their barycenter \(B\) is defined by

$$
\overrightarrow{PB}
= \frac{\alpha^1 \overrightarrow{PP_1} + \cdots + \alpha^m \overrightarrow{PP_m}}{\alpha^1 + \cdots + \alpha^m}
= \frac{\sum*{k=1}^{m} \alpha^k \overrightarrow{PP*k}}{\sum*{k=1}^{m} \alpha^k},
$$

for any reference point \(P\).

A key property is that this definition does **not depend on the choice of \(P\)**. You may skip the proof, I provide it for the curious.

Proof:

If we choose another point \(Q\), we obtain the same barycenter:

$$
\overrightarrow{QB}
= \frac{\sum*{k=1}^{m} \alpha^k \overrightarrow{QP_k}}{\sum*{k=1}^{m} \alpha^k}.
$$

This allows a more compact affine expression when the weights sum to one:

$$
B = \alpha^1 P*1 + \cdots + \alpha^m P_m, \quad \text{with} \quad \sum*{k=1}^m \alpha^k = 1.
$$

A simple example is the barycenter of a triangle: if three points have equal weights, their barycenter is the centroid.

---

**From barycenters to Bezier curves**

Notice than the baycenter is usually the equidistant point from a set of points when all weights are uniformly distributed. However, we may
use a different distribution of weights, and we would get different barycenters.

A Bezier curve can be understood as the line described by the barycenters associated to a fixed set of points, each of which are given by a different weight configuration depending on a parameter \(t \in [0,1]\).

For a cubic Bezier curve defined by control points \(P_0, P_1, P_2, P_3\), the weights are:

$$
(1-t)^3,\quad 3(1-t)^2 t,\quad 3(1-t)t^2,\quad t^3,
$$

which satisfy

$$
(1-t)^3 + 3(1-t)^2 t + 3(1-t)t^2 + t^3 = 1.
$$

Therefore, the point on the curve can be interpreted as the barycenter

$$
B(t) = \sum\_{k=0}^{3} \alpha_k(t)\, P_k,
$$

with Bernstein weights \(\alpha_k(t)\).

This perspective is powerful: instead of thinking of Bezier curves as abstract polynomials, we can see them as **weighted averages of control points whose influence shifts smoothly over time**.

---

**A brief historical note**

Bezier curves were popularized in the 1960s by engineers such as Pierre Bézier and Paul de Casteljau in the context of computer-aided design for the automotive industry. Their importance comes from this exact property: they provide smooth, controllable shapes using only a handful of points and simple affine combinations.

**Code implementation**

Given four control points

$$
P_0,\; P_1,\; P_2,\; P_3 \in \mathbb{R}^2
$$

the curve is

$$
B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t)t^2 P_2 + t^3 P_3,
\quad t \in [0,1].
$$

In coordinates, if each control point is written as \(P_i = (x_i, y_i)\), then

$$
x(t) = (1-t)^3 x_0 + 3(1-t)^2 t x_1 + 3(1-t)t^2 x_2 + t^3 x_3
$$

and

$$
y(t) = (1-t)^3 y_0 + 3(1-t)^2 t y_1 + 3(1-t)t^2 y_2 + t^3 y_3.
$$

That is exactly what the animation computes in `get_bar(points, t)`: the x-coordinate and y-coordinate are blended separately, but with the same Bernstein weights.

```javascript
function get_bar(points, t) {
  let T = 1 - t;

  function blend(p0, p1, p2, p3) {
    return (
      T ** 3 * p0 + 3 * T ** 2 * t * p1 + 3 * T * t ** 2 * p2 + t ** 3 * p3
    );
  }

  return [
    blend(points[0][0], points[1][0], points[2][0], points[3][0]),
    blend(points[0][1], points[1][1], points[2][1], points[3][1]),
  ];
}
```

The important point is conceptual: the animation never asks “where should the particle go next?” in an ad hoc way. It asks the curve.

## Chaining curves without breaking the flight

A single cubic Bezier is not enough for a continuous flight. The interesting part is how one segment hands motion to the next.

Each time the parameter \(t\) gets close to \(1\), the animation resets and creates a new list of four control points. But the new segment does not begin arbitrarily. It starts at the previous endpoint:

$$
P_0^{new} = P_3^{old}
$$

That guarantees positional continuity.

The next detail is more subtle. The first control point of the new curve is reflected from the previous handle:

$$
P_1^{new} = 2P_3^{old} - P_2^{old}.
$$

This is the key spline condition in your code:

```javascript
points_new.push([
  2 * points[3][0] - points[2][0],
  2 * points[3][1] - points[2][1],
]);
```

Why does this matter? Because for a cubic Bezier, the tangent at the end of the curve is proportional to

$$
B'(1) = 3(P_3 - P_2),
$$

while the tangent at the beginning of the next one is

$$
\widetilde{B}'(0) = 3(P_1^{new} - P_0^{new}).
$$

If

$$
P_1^{new} - P_0^{new} = P_3^{old} - P_2^{old},
$$

then the direction of motion is preserved across the junction. That is why the object feels like it is flying through one continuous trajectory instead of teleporting from one arc to another.

The other two control points are randomized inside an inner window of the canvas:

```javascript
points_new.push([w * 0.2 + random(w * 0.6), h * 0.2 + random(h * 0.6)]);
points_new.push([w * 0.2 + random(w * 0.6), h * 0.2 + random(h * 0.6)]);
```

This keeps the motion free, but not chaotic enough to escape the frame too easily.

## Drawing motion as memory

The animation does not draw only the current position. It stores recent positions in `tail`, and stores associated radii in `sizes`.

At each frame:

1. the current Bezier point \(B(t)\) is computed
2. that point is appended to the tail
3. older positions are removed when the tail exceeds a fixed maximum length

So instead of a single particle, what we actually see is a finite memory of the trajectory:

$$
\{B(t_0), B(t_1), \dots, B(t_n)\}.
$$

This is what gives the piece its atmosphere. The curve controls the head of the motion, but the tail turns that motion into a visible path.

## A simple depth illusion

The tail is not rendered with constant size. You use

$$
\text{depth\_size}(t) = 4 + 10 \sin(\pi t)
$$

which means the radius grows and then shrinks along the segment. Since

$$
\sin(\pi t) = 0 \quad \text{at} \quad t = 0,1
$$

and

$$
\sin(\pi t) = 1 \quad \text{at} \quad t = \tfrac{1}{2},
$$

the moving body feels smaller near the extremes of the path and larger near the middle. It is not perspective in a strict geometric sense, but it is enough to suggest that the object is moving through depth.

You reinforce that with another modulation:

$$
\text{steep}(u, d) = \frac{\log(u)}{d} + 1,
$$

applied to each stored point along the tail. Since the oldest elements correspond to smaller \(u\), the logarithm compresses their apparent size. The tail therefore thins out as it recedes.

This is one of the strengths of the animation: the illusion is not delegated to a 3D engine. It emerges from a few scalar functions layered carefully on top of a 2D drawing.

## Light, shadow, glow

Every tail point is rendered as a small stack of circles:

- a darker disk slightly below, acting as shadow
- a main body disk
- a smaller light disk slightly above
- several transparent larger disks, forming glow

This is a very economical construction. There is no volumetric rendering, no lighting model, no normal vectors. Yet by offsetting circles vertically and using alpha, you obtain a clear sense of body and illumination.

What I like here is that the rendering logic matches the spirit of the project: simple primitives, but carefully combined.

## Reset logic and controlled variation

The parameter advances with a fixed step:

$$
t \leftarrow t + \Delta t
$$

with \(\Delta t = 0.01\). When \(1-t\) falls below a small precision threshold, the segment is replaced.

This threshold matters. It avoids relying on exact floating-point equality, and makes the reset robust:

```javascript
if (1 - t < precision) {
  reset();
}
```

Inside `reset()`, the next segment is generated from the previous endpoint, and a boolean flag changes whether the size history is updated. That means not every cycle behaves identically. The motion preserves its geometric rule, but its surface appearance fluctuates slightly from pass to pass.

This is a good example of procedural work: the system is fixed, but each run remains alive.

## What I learned

- **Bezier curves are not only drawing tools**  
  They are also excellent motion controllers. They let you encode smoothness, direction, and continuity with very little code.

- **Continuity matters more than randomness**  
  Random points alone do not create elegant motion. The reflected control point

  $$
  P_1^{new} = 2P_3^{old} - P_2^{old}
  $$

  is what makes the path feel intentional.

- **Depth can be suggested with almost nothing**  
  Changing radius over time, offsetting highlights and shadows, and using alpha-stacked glow is enough to make a flat circle feel aerial.

- **A trail is a memory structure**  
  Visually it looks atmospheric, but computationally it is just a bounded list of previous positions. Often the poetic effect comes from a very concrete data structure.

---

## Resources

- https://p5js.org/
- https://en.wikipedia.org/wiki/B%C3%A9zier_curve
- https://pomax.github.io/bezierinfo/
