// Load images
let resized = false;

function main() {
  // Load raw image ------------------------------------------------------------
  const image = new Image(); // has w and h associated

  // absolute path
  image.src = "/projects/film-grain-filter/static/images/gustavo.jpg";
  image.onerror = () => {
    console.error("Failed to load image:", image.src);
  };

  image.onload = function () {
    render(image);
  };

  const gustavo_btn = document.getElementById("gustavo");
  const cat_btn = document.getElementById("cat");

  gustavo_btn.addEventListener("click", () => {
    image.src = "/projects/film-grain-filter/static/images/gustavo.jpg";
    render(image);
  });

  cat_btn.addEventListener("click", () => {
    image.src = "/projects/film-grain-filter/static/images/cat.jpg";
    render(image);
  });
}

// Runs shaders ----------------------------------------------------------------
function render(image) {
  // Get interactive components
  const canvas = document.getElementById("canvas");
  if (!canvas) {
    throw new Error("#canvas not found");
  }
  const gl = canvas.getContext("webgl");
  if (!gl) {
    throw new Error("could not initialise WebGL context");
  }

  const slider_density = document.getElementById("slider-density");
  if (!slider_density) {
    throw new Error("#slider-density not found");
  }
  const slider_grainsize = document.getElementById("slider-grainsize");
  if (!slider_grainsize) {
    throw new Error("#slider-grainsize not found");
  }

  // STEP 2: Supply data to the GPU ------------------------

  const program = webglUtils.createProgramFromScripts(gl, [
    "vertex_shader",
    "fragment_shader",
  ]);

  // Assign space in GPU memory for shader attributes
  const position_attribute_location = gl.getAttribLocation(
    program,
    "a_position",
  );
  const tex_coord_location = gl.getAttribLocation(program, "a_tex_coord");
  const image_location = gl.getUniformLocation(program, "u_image");
  const resolution_location = gl.getUniformLocation(program, "u_resolution");
  const blend_val_location = gl.getUniformLocation(program, "blend_val");
  const grainsize_val_location = gl.getUniformLocation(program, "grainsize");

  // Texture coordinates MUST be in the 0..1 range to sample the full image exactly once.
  const tex_coord_buffer_location = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tex_coord_buffer_location);
  set_rectangle(gl, 0, 0, 1, 1);

  // Create a texture.
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // STEP 3: Render ----------------------------------------
  if (!resized) {
    resize_canvas(window.devicePixelRatio, canvas);
  }
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Fit the image inside the canvas without stretching (like CSS background-size: contain)
  const cw = gl.canvas.width;
  const ch = gl.canvas.height;
  const iw = image.width;
  const ih = image.height;

  const scale = Math.min(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const x = (cw - dw) * 0.5; // centers image
  const y = (ch - dh) * 0.5;

  // Define geometry to place image
  const position_buffer_location = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer_location);
  set_rectangle(gl, x, y, dw, dh);

  // Clear before drawing
  const BG = get_primary_color();
  gl.clearColor(BG[0], BG[1], BG[2], BG[3]);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  // Use texture unit 0 and tell the sampler to read from it
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(image_location, 0);

  // The GPU does not know yet how to read our buffer data
  const size = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  gl.enableVertexAttribArray(position_attribute_location);
  gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer_location);
  gl.vertexAttribPointer(
    position_attribute_location,
    size,
    type,
    normalize,
    stride,
    offset,
  );

  gl.enableVertexAttribArray(tex_coord_location);
  gl.bindBuffer(gl.ARRAY_BUFFER, tex_coord_buffer_location);
  gl.vertexAttribPointer(
    tex_coord_location,
    size,
    type,
    normalize,
    stride,
    offset,
  );

  // Set the resolution
  gl.uniform2f(resolution_location, gl.canvas.width, gl.canvas.height);

  // Redraw when any of the 2 sliders change
  update_slider(gl, program, slider_density, blend_val_location);
  update_slider(gl, program, slider_grainsize, grainsize_val_location);

  // Set initial effect strength from slider and draw once
  const count = 6;
  if (blend_val_location) {
    gl.uniform1f(blend_val_location, get_val_from_slider(slider_density));
  }
  if (grainsize_val_location) {
    gl.uniform1f(grainsize_val_location, get_val_from_slider(slider_grainsize));
  }
  gl.drawArrays(gl.TRIANGLES, 0, count);
}
main();

// -----------------------------------------------------------------------------
// UTILS
// -----------------------------------------------------------------------------

// Adapt canvas size to screen: images are not computed in the same canvas size
// that is shown on screen
function resize_canvas(dpr, canvas) {
  // Size:= stretching, Viewport:= coordinates, Devicepixel ratio:= resolution
  const display_width = Math.round(canvas.clientWidth * dpr);
  const display_height = Math.round(canvas.clientHeight * dpr);

  if (canvas.width != display_width || canvas.height != display_height) {
    canvas.width = display_width;
    canvas.height = display_height;
    resized = true;
  }
}

function set_rectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    gl.STATIC_DRAW,
  );
}

// Sliders
function update_slider(gl, program, slider, value) {
  if (slider && !slider._boundToGL) {
    slider.addEventListener("input", () => {
      gl.useProgram(program);
      if (value) {
        gl.uniform1f(value, get_val_from_slider(slider));
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    slider._boundToGL = true;
  }
}
function get_val_from_slider(slider) {
  return slider ? parseFloat(slider.value) : 0.5;
}

function get_primary_color() {
  const css = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();

  // css = "rgb(248, 246, 222)"
  const nums = css.match(/\d+/g).map(Number);

  return [nums[0] / 255, nums[1] / 255, nums[2] / 255, 1];
}
