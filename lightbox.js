/* Bare lightbox: open a thumbnail, close it. No navigation by design.
   The full-size image starts loading as soon as a thumbnail is pointed at,
   touched or focused, and the lightbox opens on the thumbnail already on
   screen, swapping in the full size once it has decoded. Browsers that read
   AVIF get the .avif that sits beside each full-size JPEG. */
(function () {
  var box     = document.getElementById("lightbox");
  var img     = document.getElementById("lightbox-img");
  var cap     = document.getElementById("lightbox-cap");
  var closeEl = box && box.querySelector(".lightbox-close");
  if (!box) return;

  var opener = null;   // thumbnail that opened it, so focus can go back
  var avif = false;
  var probe = new Image();
  probe.onload = function () { avif = probe.width > 0; };
  probe.src = "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAPBtZXRhAAAAAAAAAChoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAbGliYXZpZgAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAEUAAAAFgAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABoaXBycAAAAElpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAOcGl4aQAAAAABCAAAAAxhdjFDgQAcAAAAABNjb2xybmNseAABAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB5tZGF0EgAKBxgABhgIEDUyCRsAaaEAAiEb2g==";

  function full(shot) {
    var f = shot.dataset.full;
    return avif && /\.jpg$/.test(f) ? f.replace(/\.jpg$/, ".avif") : f;
  }

  var warm = {};       // full-size images already requested (the browser keeps them)
  function preload(shot) {
    var f = full(shot);
    if (!warm[f]) { warm[f] = true; new Image().src = f; }
  }

  function open(shot) {
    var thumb = shot.querySelector("img");
    var pre = new Image();
    pre.src = full(shot);
    opener  = shot;
    img.alt = thumb ? thumb.alt : "";
    cap.textContent = shot.dataset.caption || "";
    if (pre.complete && pre.naturalWidth) {
      img.src = pre.src;
    } else {
      if (thumb && !thumb.classList.contains("is-held")) img.src = thumb.currentSrc || thumb.src;
      pre.addEventListener("load", function () {
        if (opener === shot) img.src = pre.src;
      }, { once: true });
    }
    box.hidden = false;
    document.body.classList.add("is-locked");
    closeEl.focus();
  }

  function close() {
    if (box.hidden) return;
    box.hidden = true;
    document.body.classList.remove("is-locked");
    img.removeAttribute("src");   // don't hold the full-size image in memory
    cap.textContent = "";
    if (opener) { opener.focus(); opener = null; }
  }

  var SHOT = ".int-shot";

  // one listener for every gallery on the page
  document.addEventListener("click", function (e) {
    var shot = e.target.closest(SHOT);
    if (shot) open(shot);
  });

  // start fetching on the first sign of intent
  ["mouseover", "focusin", "touchstart"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      var shot = e.target.closest && e.target.closest(SHOT);
      if (shot) preload(shot);
    }, { passive: true });
  });

  // bare behaviour: a click anywhere in the overlay dismisses it
  box.addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
