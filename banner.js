/* Banner resolve: the banner opens as one coarse mosaic of the page's inline
   32px placeholder (--lqip), so it needs no network. Once the real image has
   decoded, the mosaic blends into the same mosaic of the real image, then the
   squares halve at a steady rate, each size cross-fading into the next, until
   the image is sharp, a second later. Without WebGL2, or with reduced
   motion, the CSS placeholder simply gives way to the image. */
(function () {
  var fig = document.querySelector(".banner");
  var img = fig && fig.querySelector("img");
  if (!img || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  var gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (!gl) return;

  var DPR   = Math.min(window.devicePixelRatio || 1, 2);
  var CELL0 = 128 * DPR;               // coarsest square, in device pixels
  var END   = Math.log2(CELL0) - 0.5;  // hand off to the real image at ~1.4px squares
  // the page fades in from 100 to 700 ms (.reveal--content); start refining
  // once it is half visible, or the resolve plays behind a transparent page
  var DELAY = 400, DURATION = 1000, MIX = 150, FADE = 200;  // ms

  // one full-screen triangle; every fragment shows the average colour of its
  // square (read from the mip level that covers it), cross-faded with the
  // average of its half-size square, for both images
  var vs = "#version 300 es\n" +
    "void main() {\n" +
    "  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);\n" +
    "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n" +
    "}";
  var fs = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform sampler2D u_lqip, u_img;\n" +
    "uniform vec2 u_res, u_lqip_size, u_img_size;\n" +
    "uniform float u_cell, u_level, u_mix;\n" +
    "out vec4 color;\n" +
    // average colour of the square of side s holding q (centred device px)
    "vec3 square(sampler2D tex, vec2 size, vec2 q, float s) {\n" +
    "  float ca = u_res.x / u_res.y, ia = size.x / size.y;\n" +   // object-fit: cover
    "  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);\n" +
    "  vec2 c = (floor(q / s) + 0.5) * s;\n" +
    "  vec2 v = (c + 0.5 * u_res) / u_res;\n" +
    "  vec2 uv = 0.5 + (vec2(v.x, 1.0 - v.y) - 0.5) * scale;\n" +
    "  return textureLod(tex, uv, log2(max(s * size.x * scale.x / u_res.x, 1.0))).rgb;\n" +
    "}\n" +
    "vec3 mosaic(sampler2D tex, vec2 size, vec2 q) {\n" +
    "  float s = u_cell * exp2(-floor(u_level));\n" +
    "  return mix(square(tex, size, q, s), square(tex, size, q, 0.5 * s), fract(u_level));\n" +
    "}\n" +
    "void main() {\n" +
    "  vec2 q = gl_FragCoord.xy - 0.5 * u_res;\n" +
    "  color = vec4(mix(mosaic(u_lqip, u_lqip_size, q), mosaic(u_img, u_img_size, q), u_mix), 1.0);\n" +
    "}";

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  var u = {};
  ["u_lqip", "u_img", "u_res", "u_lqip_size", "u_img_size", "u_cell", "u_level", "u_mix"].forEach(function (n) {
    u[n] = gl.getUniformLocation(prog, n);
  });
  gl.uniform1i(u.u_lqip, 0);
  gl.uniform1i(u.u_img, 1);
  gl.uniform1f(u.u_cell, CELL0);

  // texture unit 0 holds the placeholder, unit 1 the real image
  function upload(unit, source) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform2f(unit ? u.u_img_size : u.u_lqip_size, source.naturalWidth, source.naturalHeight);
  }

  function fit() {
    canvas.width  = Math.round(img.clientWidth  * DPR);
    canvas.height = Math.round(img.clientHeight * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(level, mix) {
    gl.uniform2f(u.u_res, canvas.width, canvas.height);
    gl.uniform1f(u.u_level, level);
    gl.uniform1f(u.u_mix, mix);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // fade into the real image underneath, then tidy up
  var fading = false, resize = new ResizeObserver(fit);
  function finish() {
    if (fading) return;
    fading = true;
    canvas.style.transition = "opacity " + FADE + "ms ease-out";
    canvas.style.opacity = "0";
    setTimeout(function () {
      resize.disconnect();
      canvas.remove();
      var lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }, FADE + 30);
  }
  canvas.addEventListener("webglcontextlost", finish);

  var placeholder = new Image();
  placeholder.src = (getComputedStyle(fig).getPropertyValue("--lqip").match(/url\(["']?(.*?)["']?\)/) || [])[1] || "";

  placeholder.decode().then(function () {
    upload(0, placeholder);
    upload(1, placeholder);              // stands in until the real image decodes
    fit();
    draw(0, 0);
    fig.appendChild(canvas);
    resize.observe(img);

    var full = false;
    img.decode().then(function () { if (!fading) { upload(1, img); full = true; } }, finish);

    // the clock only runs once the real image is in and the page is half
    // visible, and skips time spent in a background tab, so the resolve is seen
    var clock = 0, last = performance.now();
    requestAnimationFrame(function frame(now) {
      if (!canvas.isConnected) return;
      if (full && now >= DELAY) clock += Math.min(now - last, 100);
      last = now;
      if (clock >= DURATION) finish();
      draw(END * Math.min(clock / DURATION, 1), Math.min(clock / MIX, 1));
      requestAnimationFrame(frame);
    });
  }, function () {});
})();
