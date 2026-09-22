/* Bare lightbox: open a thumbnail, close it. No navigation by design. */
(function () {
  var box     = document.getElementById("lightbox");
  var img     = document.getElementById("lightbox-img");
  var cap     = document.getElementById("lightbox-cap");
  var closeEl = box && box.querySelector(".lightbox-close");
  var gallery = document.querySelector(".gallery");
  if (!box || !gallery) return;

  var opener = null;   // thumbnail that opened it, so focus can go back

  function open(shot) {
    var thumb = shot.querySelector("img");
    opener  = shot;
    img.src = shot.dataset.full;
    img.alt = thumb ? thumb.alt : "";
    cap.textContent = shot.dataset.caption || "";
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

  gallery.addEventListener("click", function (e) {
    var shot = e.target.closest(".shot");
    if (shot) open(shot);
  });

  // bare behaviour: a click anywhere in the overlay dismisses it
  box.addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
