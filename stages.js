/* Read across projects: gathers one section (Research, Process or Reflection)
   from every project page, in the order of the index menu, so the writing
   lives only on the project pages. The stage comes from <main data-stage>. */
(function () {
  var main = document.querySelector("main[data-stage]");
  var out = document.getElementById("stage");
  if (!main || !out) return;
  var stage = main.dataset.stage;            // "research", "process" or "reflection"

  function page(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ": " + r.status);
      return r.text();
    }).then(function (html) {
      return new DOMParser().parseFromString(html, "text/html");
    });
  }

  function block(url, doc) {
    var section = document.createElement("section");
    section.className = "stage-project";

    var h2 = document.createElement("h2");
    var a = document.createElement("a");
    a.href = url + "#" + stage;
    var name = document.createElement("span");
    name.textContent = (doc.querySelector(".doc-head .eyebrow") || {}).textContent || url;
    var unit = document.createElement("span");
    unit.className = "stage-unit";
    unit.textContent = (doc.querySelector(".doc-head h1") || {}).textContent || "";
    a.append(name, unit);
    h2.appendChild(a);
    section.appendChild(h2);

    // the section whose heading starts with the stage name ("Reflection + Evaluation")
    var grid = null;
    doc.querySelectorAll("details.project-section").forEach(function (d) {
      var h = d.querySelector(".project-section-heading");
      if (h && h.textContent.trim().toLowerCase().indexOf(stage) === 0) grid = d.querySelector(".int-grid");
    });

    if (grid && grid.children.length) {
      var copy = document.importNode(grid, true);
      if (window.mediaOrder) window.mediaOrder.hold(copy);
      section.appendChild(copy);
    } else {
      var empty = document.createElement("p");
      empty.className = "stage-empty";
      empty.textContent = "Not written up yet";
      section.appendChild(empty);
    }
    return section;
  }

  page("index.html").then(function (index) {
    var urls = [].map.call(index.querySelectorAll(".projects--by-project a.project"), function (a) {
      return a.getAttribute("href");
    });
    return Promise.all(urls.map(function (url) {
      return page(url).then(function (doc) { return block(url, doc); });
    }));
  }).then(function (blocks) {
    out.replaceChildren.apply(out, blocks);
    document.dispatchEvent(new Event("stages:ready"));   // e.g. wall-drawings.js starts its canvas
  }).catch(function () {
    out.querySelector(".stage-empty").textContent =
      "Couldn’t load the projects. Open them from the index instead.";
  });
})();
