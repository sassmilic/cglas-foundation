/* Images load in reading order. The browser's own lazy loading starts every
   image within a screen or two at once, so when a section opens, a dozen
   downloads race and the one being looked at waits behind ones far below.
   Instead, each content image (it carries data-ph, a tiny blurred preview)
   is held on its placeholder, then released in document order, two at a
   time: whatever is on screen first, then on down the page, up to a couple
   of screens ahead of the reader. Without this script the page's own src,
   srcset and loading="lazy" work as before.
   Also plays the looping videos only while they are on screen. */
(function () {
  var AT_ONCE = 2;   // downloads in flight
  var AHEAD = 2;     // screens below the fold to load ahead

  var queue = [];    // held <img>s, in document order
  var busy = 0;

  function hold(img) {
    if (!img.dataset.ph || "src" in img.dataset) return;
    var pic = img.parentNode.nodeName === "PICTURE" ? img.parentNode : null;
    if (pic) [].forEach.call(pic.querySelectorAll("source"), function (s) {
      s.dataset.srcset = s.getAttribute("srcset");
      s.removeAttribute("srcset");
    });
    if (img.hasAttribute("srcset")) {
      img.dataset.srcset = img.getAttribute("srcset");
      img.removeAttribute("srcset");
    }
    img.dataset.src = img.getAttribute("src");
    img.src = img.dataset.ph;
    img.classList.add("is-held");
    queue.push(img);
  }

  function release(img, onScreen) {
    busy++;
    img.fetchPriority = onScreen ? "high" : "low";
    img.loading = "eager";
    var pic = img.parentNode.nodeName === "PICTURE" ? img.parentNode : null;
    if (pic) [].forEach.call(pic.querySelectorAll("source"), function (s) {
      if (s.dataset.srcset) s.setAttribute("srcset", s.dataset.srcset);
    });
    function done() {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      img.classList.remove("is-held");
      busy--;
      pump();
    }
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    if (img.dataset.srcset) img.setAttribute("srcset", img.dataset.srcset);
    img.src = img.dataset.src;
  }

  // the next image to fetch: one on screen if any, else the first below it
  function next() {
    var h = innerHeight, below = null;
    for (var i = 0; i < queue.length; i++) {
      var r = queue[i].getBoundingClientRect();
      if (!r.width && !r.height) continue;            // in a closed section
      if (r.bottom > 0 && r.top < h) return [i, true];
      if (below === null && r.top >= h && r.top < h * (1 + AHEAD)) below = i;
    }
    return below === null ? null : [below, false];
  }

  function pump() {
    while (busy < AT_ONCE) {
      var n = next();
      if (!n) return;
      release(queue.splice(n[0], 1)[0], n[1]);
    }
  }

  var queued = false;
  function soon() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; pump(); });
  }

  function holdAll(root) {
    [].forEach.call(root.querySelectorAll("img[data-ph]"), hold);
    soon();
  }

  holdAll(document);
  window.addEventListener("scroll", soon, { passive: true });
  window.addEventListener("resize", soon);
  // toggle doesn't bubble, so listen while capturing
  document.addEventListener("toggle", soon, true);
  // and once the stage pages have put their copied sections in place
  document.addEventListener("stages:ready", soon);

  // the stage pages (stages.js) hand over the sections they copy in
  window.mediaOrder = { hold: holdAll };

  // looping videos: fetch and play only while on screen
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var videos = document.querySelectorAll("video[data-loop-on-view]");
  if (!videos.length) return;
  if (still || !("IntersectionObserver" in window)) {
    [].forEach.call(videos, function (v) { v.controls = true; });
    return;
  }
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        v.preload = "auto";
        var p = v.play();
        if (p) p.catch(function () {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.25 });
  [].forEach.call(videos, function (v) { seen.observe(v); });
})();
