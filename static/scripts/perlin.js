// Generate perlin background noise

// VECTOR CLASS
class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;

    } // Close plot_perlin function

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
sw, hw := respective screen width and height
d := distance between points

We will not traverse all pixels either. Let s be the minimum space between
to "dots" and r their radius.

s := minimum space between dots (s >= r , actual space is s'=s-r).
r := radius.
*/

let w = 1000, h = 1000, n = 50, s = 4, r = 1.5;

/*
The noise map is constituted by key value pairs of coordinates and their
associated gradient vector. We will keep its state in order to rotate
these vectors later, bringing about the air-like movement.
*/

const noise_map = new Map()
let d = Math.floor(w / n);

function built_noise_map() {
    noise_map.clear();
    for (let x = 0; x < w; x += d) {
        // Keeps order of entry
        for (let y = 0; y < h; y += d) {
            // Get random unitary vector
            const angle = Math.random() * 2 * Math.PI;
            const gradient = new Vector2D(Math.cos(angle), Math.sin(angle));

            noise_map.set(`${x},${y}`, gradient);
        }
    }
}


/*
Build perlin noise with my tweak:
In my effect the perlish surface defines a probability field. That is, defines
areas with different densities of points. It is another way of drawing texture.

Let´s use a logistic distribution (sigmoid) and tune desntity with a threshold.
input range: [-1,1]
t := threshold, usually ~ 0.5
*/

function plot_perlin() {
    for (let i = 0; i <= w; i += s) {
        for (let j = 0; j <= h; j += s) {

            // current point and its lattice cell (multiples of d)
            const coord = new Vector2D(i, j);
            const x0 = Math.floor(i / d) * d;
            const y0 = Math.floor(j / d) * d;

            const top_left = new Vector2D(x0, y0);
            const top_right = new Vector2D(x0 + d, y0);
            const bottom_left = new Vector2D(x0, y0 + d);
            const bottom_right = new Vector2D(x0 + d, y0 + d);

            // string enables keys to be properly compared by the map
            const top_left_grad = noise_map.get(top_left.toString());
            const top_right_grad = noise_map.get(top_right.toString());
            const bottom_left_grad = noise_map.get(bottom_left.toString());
            const bottom_right_grad = noise_map.get(bottom_right.toString());

            if (!top_left_grad || !top_right_grad || !bottom_left_grad || !bottom_right_grad) {
                console.log("missing data");
                continue;
            }

            const dot_top_left_grad = dot_gradient(coord, top_left_grad);
            const dot_top_right_grad = dot_gradient(coord, top_right_grad);
            const dot_bottom_left_grad = dot_gradient(coord, bottom_left_grad);
            const dot_bottom_right_grad = dot_gradient(coord, bottom_right_grad);



            // then use u,v in Lerp instead of sx,sy
            const sx = (i - x0) / d;
            const sy = (j - y0) / d;
            const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
            const u = fade(sx), v = fade(sy);

            const top_interpolation = Lerp(u, dot_top_left_grad, dot_top_right_grad);
            const bottom_interpolation = Lerp(u, dot_bottom_left_grad, dot_bottom_right_grad);
            const noise = Lerp(v, top_interpolation, bottom_interpolation);

            // Map Perlin-like value -> probability and sample
            const n = noise / d; // approx in [-1, 1]
            const p = logistic_dist(n, { inputRange: [-1, 1], threshold: 0.5, contrast: 0.3 });
            if (Math.random() < p) {
                ctx.beginPath();
                ctx.arc(i, j, r, 0, Math.PI * 2); // r is your radius
                ctx.fillStyle = "black";          // or any color you like
                ctx.fill();
            }
        }
    }
}

// function update_noise_map() {
//     noise_map.forEach(gradient => {
//         gradient = gradient.random_rotation();
//     });
// }

let canvas, ctx;
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById("perlinCanvas");
    if (!canvas) {
        console.error("Canvas element with id 'perlinCanvas' not found.");
        return;
    }
    ctx = canvas.getContext("2d");

    // If the HTML sets width/height attributes, use them; otherwise keep defaults
    // w = canvas.width || w;
    // h = canvas.height || h;

    // Recompute lattice spacing from desired number of cells n
    d = Math.floor(w / n);

    // Rebuild the noise map to match current w,h,d
    built_noise_map();

    // Clear before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set a default fill style once (faster than per-dot)
    ctx.fillStyle = "black";

    // Draw the field
    plot_perlin();
});



/* UTILS ----------------------------------------------------------------------
    
-----------------------------------------------------------------------------*/

function dot_gradient(coord, v) {
    return (coord.x - v.x) * v.x + (coord.y - v.y) * v.y;
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
function logistic_dist(noiseValue, { inputRange = [-1, 1], threshold = 0.5, contrast = 6, invert = false } = {}) {
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