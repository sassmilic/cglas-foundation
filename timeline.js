/* Timeline (Research Week): rows placed at true distance in years. Each row
   carries data-from (and data-to for a span) as a signed year, 55 BC = -54
   since there is no year 0. Years-to-pixels is the smallest scale at which
   no row, with its notes closed, runs into the next; an open note pushes the
   rows below it down. Without this script the list stays a plain list and
   the map stays hidden. */
(function () {
  var list = document.querySelector(".int-timeline");
  if (!list) return;
  var rows = [].slice.call(list.children);
  var from = rows.map(function (li) { return parseFloat(li.dataset.from); });
  var to = rows.map(function (li, i) { return parseFloat(li.dataset.to) || from[i]; });

  // a row's height as if its notes were closed
  function closedHeight(li) {
    var h = li.offsetHeight;
    var more = li.querySelector(".int-timeline-more");
    if (more && more.open) {
      var note = more.querySelector(".int-timeline-note");
      h -= note.offsetHeight + parseFloat(getComputedStyle(note).marginTop);
    }
    return h;
  }

  function layout() {
    if (!list.offsetParent) return; // its section is closed
    list.classList.add("is-scaled");
    var gap = parseFloat(getComputedStyle(list).fontSize) * 1.2;
    var heights = rows.map(function (li) { return li.offsetHeight; });

    var scale = 0;
    for (var i = 0; i < rows.length - 1; i++) {
      scale = Math.max(scale, (closedHeight(rows[i]) + gap) / (from[i + 1] - from[i]));
    }

    var top = 0, bottom = 0;
    rows.forEach(function (li, i) {
      top = i ? Math.max(scale * (from[i] - from[0]), bottom + gap) : 0;
      li.style.setProperty("--top", top + "px");
      li.style.setProperty("--span", scale * (to[i] - from[i]) + "px");
      bottom = top + heights[i];
    });
    list.style.setProperty("--last", top + "px");
    list.style.height = bottom + "px";
  }

  var queued = false;
  function relayout() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; layout(); });
  }

  [].forEach.call(document.querySelectorAll("details"), function (d) {
    if (d.contains(list) || list.contains(d)) d.addEventListener("toggle", relayout);
  });
  window.addEventListener("resize", relayout);
  if (document.fonts) document.fonts.ready.then(relayout);
  relayout();

  /* The map beside it: the row whose date has reached the top 15% of the
     screen picks the stage, the Roman part of Britain as a frontier line,
     approximate. */
  var map = document.querySelector(".int-timeline-map");
  if (!map) return;
  var STAGES = { 43: "se", 60: "fosse", 77: "agricola", 122: "hadrian", 142: "antonine",
                 197: "hadrian", 306: "hadrian", 367: "hadrian" };
  var stages = [].slice.call(map.querySelectorAll(".map-stage"));
  var walls = [].slice.call(map.querySelectorAll(".map-wall"));
  var caption = map.querySelector(".map-cap-date");
  map.hidden = false;
  map.parentNode.classList.add("has-map");

  var current = null;
  function update() {
    var row = rows[0];
    rows.forEach(function (li) {
      if (li.getBoundingClientRect().top < innerHeight * 0.15) row = li;
    });
    if (row === current) return;
    current = row;
    var year = parseFloat(row.dataset.from);
    var stage = STAGES[year];
    stages.forEach(function (p) { p.classList.toggle("is-on", p.dataset.stage === stage); });
    walls.forEach(function (w) {
      w.classList.toggle("is-on", w.dataset.wall === "hadrian" ? year >= 122 && year < 410 : stage === "antonine");
    });
    caption.textContent = row.querySelector(".int-timeline-date").textContent;
  }

  var pending = false;
  window.addEventListener("scroll", function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; update(); });
  }, { passive: true });
  update();
})();
