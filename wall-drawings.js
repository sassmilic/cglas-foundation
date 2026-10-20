/* Sol LeWitt's instructions for wall drawings, run as code (Drawing Week
   research). Each wallDrawingNN function is shown on the page beside its
   drawing, via its own toString(), so the code you read is the code that is
   drawing; they are kept close to the instructions, and everything about
   canvases, colours and timers lives in the "paper" below them. They also run
   on research.html, whose sections arrive later (stages.js fires
   "stages:ready"). */
function wallDrawing26(paper) {
  // A one-inch grid covering a 36 inch square.
  var n = 36;
  paper.grid(n);

  // Within each one-inch square, there is a line
  // in one of the four directions.
  var directions = ["vertical", "horizontal",
                    "diagonal right", "diagonal left"];
  for (var row = 0; row < n; row++) {
    for (var col = 0; col < n; col++) {
      paper.line(row, col, pick(directions));
    }
  }

  // Every 1 to 5 seconds, a new drawing.
  paper.again(between(1, 5));
}

function wallDrawing118(paper) {
  // Place fifty points at random. The points should be
  // evenly distributed over the area of the wall.
  // (Mitchell's best-candidate: of ten random spots,
  // keep the one furthest from the points already placed.)
  var points = [];
  while (points.length < 50) {
    var spots = [];
    for (var k = 0; k < 10; k++) spots.push(paper.randomPoint());
    points.push(furthest(spots, points));
  }

  // All of the points should be connected by straight lines.
  for (var i = 0; i < points.length; i++) {
    for (var j = i + 1; j < points.length; j++) {
      paper.line(points[i], points[j]);
    }
  }

  // Every 1 to 5 seconds, a new drawing.
  paper.again(between(1, 5));
}

async function wallDrawing797(paper) {
  // The first drafter has a black marker and makes an
  // irregular horizontal line near the top of the wall.
  var line = paper.irregularLine(0.05);
  await paper.draw(line, "black");

  // Then the second drafter tries to copy it (without touching it)
  // using a red marker; the third, yellow; the fourth, blue;
  // and so on, copying the last line drawn, to the bottom of the wall.
  var markers = ["red", "yellow", "blue"];
  var gap = 1 / 20;
  for (var i = 0; lowest(line) + gap < 0.97; i++) {
    var errors = mistakes(line.length);
    line = line.map(function (y, k) {
      // lower, a little off, never touching
      return Math.max(y + gap + errors[k], y + gap / 2);
    });
    await paper.draw(line, markers[i % 3]);
  }

  // A fresh wall in 1 to 5 seconds.
  paper.again(between(1, 5));
}

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function between(a, b) { return a + Math.random() * (b - a); }

// of the spots, the one whose nearest placed point is furthest away
function furthest(spots, points) {
  function gap(s) {
    return points.reduce(function (m, q) { return Math.min(m, Math.hypot(s.x - q.x, s.y - q.y)); }, Infinity);
  }
  return spots.reduce(function (best, s) { return gap(s) > gap(best) ? s : best; });
}

// a copying hand's mistakes along a line: small, and smooth rather than
// spiky, since each one carries on a little into the next
function mistakes(n) {
  var e = 0, out = [];
  for (var k = 0; k < n; k++) {
    e = e * 0.97 + (Math.random() - 0.5) * 0.003;
    out.push(e);
  }
  return out;
}

function lowest(line) { return Math.max.apply(null, line); }

(function () {
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var drawings = { "26": wallDrawing26, "118": wallDrawing118, "797": wallDrawing797 };

  // Wall Drawing 797's markers; black is the page's ink, so it shows in dark mode
  var markers = { red: "#e0282e", yellow: "#f2c200", blue: "#1f5fd1" };

  // where each direction runs inside a square, as [x1, y1, x2, y2] in 0–1
  var ends = {
    "vertical":       [0.5, 0, 0.5, 1],
    "horizontal":     [0, 0.5, 1, 0.5],
    "diagonal right": [0, 1, 1, 0],
    "diagonal left":  [0, 0, 1, 1]
  };

  // paper(canvas, draw) gives a start() that hands draw a fresh, cleared sheet; starting
  // again (a resize, or the next drawing) leaves any earlier sheet drawing nothing
  function paper(canvas, draw) {
    var ctx = canvas.getContext("2d");
    var timer, current;
    function start() {
      clearTimeout(timer);
      ctx.clearRect(0, 0, canvas.width, canvas.height);   // every drawing starts on a clean sheet
      ctx.beginPath();
      return sheet(current = {});
    }
    return start;

    function sheet(token) {
      var cell = 0;
      function ink() { return getComputedStyle(canvas).color; }
      function stroke(color, width) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
      }
      var self = {
        // Wall Drawing 26: a grid of n squares a side, and a line in one of them
        grid: function (n) {
          cell = canvas.width / n;
          ctx.beginPath();
          for (var i = 0; i <= n; i++) {
            ctx.moveTo(i * cell, 0);
            ctx.lineTo(i * cell, canvas.height);
            ctx.moveTo(0, i * cell);
            ctx.lineTo(canvas.width, i * cell);
          }
          stroke(getComputedStyle(canvas).getPropertyValue("--rule").trim(), cell / 28);
          ctx.beginPath();
        },

        // Wall Drawing 118: a point anywhere, as x and y from 0 to 1
        randomPoint: function () { return { x: Math.random(), y: Math.random() }; },

        // line(row, col, direction) inside a grid square, or line(point, point)
        line: function (a, b, direction) {
          if (direction) {
            var e = ends[direction], x = b * cell, y = a * cell;
            ctx.moveTo(x + e[0] * cell, y + e[1] * cell);
            ctx.lineTo(x + e[2] * cell, y + e[3] * cell);
          } else {
            var s = canvas.width;
            ctx.moveTo(a.x * s, a.y * s);
            ctx.lineTo(b.x * s, b.y * s);
          }
        },

        again: function (seconds) {
          // the lines are gathered into one path and drawn here, all at once
          stroke(ink(), cell ? cell / 14 : canvas.width / 1400);
          ctx.beginPath();
          clearTimeout(timer);
          if (!still && token === current) timer = setTimeout(function () { draw(start()); }, seconds * 1000);
        },

        // Wall Drawing 797: a gentle line of hills across the wall at height y,
        // as one y (0–1) for each of 200 steps from left to right
        irregularLine: function (y) {
          var waves = [1, 2, 3].map(function (f) {
            return { f: f + Math.random(), a: 0.012 / f, p: Math.random() * 7 };
          });
          var out = [];
          for (var k = 0; k < 200; k++) {
            var x = k / 199;
            out.push(waves.reduce(function (v, w) { return v + w.a * Math.sin(w.f * 2 * Math.PI * x + w.p); }, y));
          }
          return out;
        },

        // draw a line left to right in a marker's colour; resolves when it is done
        draw: function (line, marker) {
          var s = canvas.width, n = line.length, done = 0, t0 = null;
          var color = markers[marker] || ink();
          function to(k) {
            ctx.beginPath();
            ctx.moveTo(done / (n - 1) * s, line[done] * s);
            for (var i = done + 1; i <= k; i++) ctx.lineTo(i / (n - 1) * s, line[i] * s);
            ctx.save();
            ctx.lineCap = ctx.lineJoin = "round";
            stroke(color, s / 50);
            ctx.restore();
            ctx.beginPath();
            done = k;
          }
          return new Promise(function (resolve) {
            if (token !== current) return;               // an old sheet: stop here
            if (still) { to(n - 1); resolve(); return; }
            requestAnimationFrame(function frame(t) {
              if (token !== current) return;
              if (t0 === null) t0 = t;
              var k = Math.min(n - 1, Math.floor((t - t0) / 1200 * (n - 1)));
              if (k > done) to(k);
              if (done < n - 1) requestAnimationFrame(frame); else resolve();
            });
          });
        }
      };
      return self;
    }
  }

  function init() {
    document.querySelectorAll("[data-wall-drawing-code]").forEach(function (code) {
      code.textContent = drawings[code.dataset.wallDrawingCode].toString();
    });

    document.querySelectorAll("canvas[data-wall-drawing]:not([data-on])").forEach(function (canvas) {
      canvas.setAttribute("data-on", "");
      var draw = drawings[canvas.dataset.wallDrawing];
      var start = paper(canvas, draw);
      // sharp lines at any size: match the canvas to its box in device pixels
      // (it has no size while its section is closed, so this also starts it)
      new ResizeObserver(function () {
        var px = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
        if (!px || px === canvas.width) return;
        canvas.width = canvas.height = px;
        draw(start());
      }).observe(canvas);
    });
  }

  init();
  document.addEventListener("stages:ready", init);
})();
