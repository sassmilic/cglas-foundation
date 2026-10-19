/* Project sections: an "expand all" switch just above the first section, and
   links to #research, #process or #reflection open that section and scroll
   to it. */
(function () {
  var sections = [].slice.call(document.querySelectorAll("details.project-section"));
  if (!sections.length) return;

  var button = document.createElement("button");
  button.type = "button";
  button.className = "expand-all";

  function allOpen() {
    return sections.every(function (d) { return d.open; });
  }
  function label() {
    button.textContent = allOpen() ? "collapse all" : "expand all";
  }

  button.addEventListener("click", function () {
    var open = !allOpen();
    sections.forEach(function (d) { d.open = open; });
    label();
  });
  sections.forEach(function (d) { d.addEventListener("toggle", label); });

  var bar = document.createElement("p");
  bar.className = "expand-bar";
  bar.appendChild(button);
  (sections[0].closest("section") || sections[0]).before(bar);
  label();

  function openFromHash() {
    var target = location.hash && document.getElementById(location.hash.slice(1));
    var details = target && target.querySelector("details.project-section");
    if (!details) return;
    details.open = true;
    target.scrollIntoView();
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();
