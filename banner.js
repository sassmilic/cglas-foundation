/* Banner resolve: the banner opens as big square pixels and refines, block by
   block, into the real image. The coarse stages are drawn from the page's
   inline 32px placeholder (--lqip), so they need no network; the fine stages
   wait for the real image to decode. Without WebGL2, or with reduced motion,
   the CSS placeholder simply gives way to the image. */
(function () {
  var fig = document.querySelector(".banner");
  var img = fig && fig.querySelector("img");
  if (!img || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  var gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (!gl) return;

  var DPR   = Math.min(window.devicePixelRatio || 1, 2);
  var CELL0 = 128 * DPR;               // coarsest square, in device pixels
  var END   = Math.log2(CELL0);        // level at which a square is one pixel
  var HOLD  = 2;                       // finest level the placeholder can carry (32px)
  // the page fades in from 100 to 700 ms (.reveal--content); start refining
  // once it is half visible, or the mosaic plays behind a transparent page
  var DELAY = 400, DURATION = 1700, FADE = 400;  // ms
  var HANDOFF = END - 0.75;            // fade to the real image at ~1.5px squares
  var DETAIL = 0.6;                    // 0: squares split in random order, 1: busiest first
  var BLEND  = 0.15;                   // share of a level a split takes to ease in

  // one full-screen triangle; every fragment snaps to the centre of its square
  // and reads the texture at the mip level that averages that whole square.
  // Each square splits into four once its threshold is passed: squares hiding
  // more detail (children far from the parent's colour) split sooner, with
  // noise so it never reads as a sweep, and the new colours ease in briefly.
  var vs = "#version 300 es\n" +
    "void main() {\n" +
    "  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);\n" +
    "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n" +
    "}";
  var fs = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform sampler2D u_tex;\n" +
    "uniform vec2 u_res, u_size;\n" +
    "uniform float u_cell, u_level, u_detail, u_blend;\n" +
    "out vec4 color;\n" +
    "vec2 scale;\n" +
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n" +
    // average colour of the square of side s centred at c (centred device px)
    "vec3 square(vec2 c, float s) {\n" +
    "  vec2 v = (c + 0.5 * u_res) / u_res;\n" +
    "  vec2 uv = 0.5 + (vec2(v.x, 1.0 - v.y) - 0.5) * scale;\n" +
    "  return textureLod(u_tex, uv, log2(max(s * u_size.x * scale.x / u_res.x, 1.0))).rgb;\n" +
    "}\n" +
    "void main() {\n" +
    "  float ca = u_res.x / u_res.y, ia = u_size.x / u_size.y;\n" +   // object-fit: cover
    "  scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);\n" +
    "  vec2 q = gl_FragCoord.xy - 0.5 * u_res;\n" +
    "  float s = u_cell * exp2(-floor(u_level)), h = 0.25 * s;\n" +
    "  vec2 id = floor(q / s), c = (id + 0.5) * s;\n" +
    "  vec3 parent = square(c, s);\n" +
    "  vec3 a = square(c + vec2(-h, -h), 2.0 * h), b = square(c + vec2(h, -h), 2.0 * h);\n" +
    "  vec3 d = square(c + vec2(-h,  h), 2.0 * h), e = square(c + vec2(h,  h), 2.0 * h);\n" +
    "  float detail = clamp(2.0 * (distance(a, parent) + distance(b, parent) +\n" +
    "                              distance(d, parent) + distance(e, parent)), 0.0, 1.0);\n" +
    "  vec2 side = step(c, q);\n" +
    "  vec3 child = mix(mix(a, b, side.x), mix(d, e, side.x), side.y);\n" +
    "  float t = mix(hash(id), 1.0 - detail, u_detail) * (1.0 - u_blend);\n" +
    "  color = vec4(mix(parent, child, smoothstep(t, t + u_blend, fract(u_level))), 1.0);\n" +
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
  ["u_res", "u_size", "u_cell", "u_level", "u_detail", "u_blend"].forEach(function (n) {
    u[n] = gl.getUniformLocation(prog, n);
  });
  gl.uniform1f(u.u_cell, CELL0);
  gl.uniform1f(u.u_detail, DETAIL);
  gl.uniform1f(u.u_blend, BLEND);

  var tex = gl.createTexture(), size = null;
  function upload(source) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    size = [source.naturalWidth, source.naturalHeight];
  }

  function fit() {
    canvas.width  = Math.round(img.clientWidth  * DPR);
    canvas.height = Math.round(img.clientHeight * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(level) {
    gl.uniform2f(u.u_res, canvas.width, canvas.height);
    gl.uniform2f(u.u_size, size[0], size[1]);
    gl.uniform1f(u.u_level, level);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // fade into the real image underneath (still refining while it fades), then tidy up
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
    upload(placeholder);
    fit();
    draw(0);
    fig.appendChild(canvas);
    resize.observe(img);

    var full = false;
    img.decode().then(function () { if (!fading) { upload(img); full = true; } }, finish);

    // one clock on one curve; it simply stops at HOLD while the image downloads
    var clock = -DELAY, last = performance.now();
    requestAnimationFrame(function frame(now) {
      if (!canvas.isConnected) return;
      var level = END * settle(Math.min(Math.max(clock / DURATION, 0), 1));
      if (!full && level >= HOLD) level = HOLD;   // rest as a mosaic
      else clock += now - last;
      last = now;
      if (level >= HANDOFF) finish();
      draw(level);
      requestAnimationFrame(frame);
    });
  }, function () {});

  // eases in, then a long tail: the last fine levels arrive slowly, like focus settling
  function settle(x) { return 1 - Math.pow(1 - Math.pow(x, 1.5), 3); }
})();
