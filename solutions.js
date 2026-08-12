/* ---------------------------------------------------------------------------
 * Make the worked solution reachable in one click.
 *
 * quarto-live chains the two buttons: an exercise with a hint shows only
 * "Show Hint", and the "Show Solution" button appears in its place once the
 * hints are exhausted. So on a page whose whole purpose is showing the answers,
 * a student looking for one sees a button offering a hint and no sign that a
 * solution exists at all -- which reads, reasonably, as "this week has no
 * solutions".
 *
 * This adds a second button beside the first. It does not interfere with the
 * chain: both end up removing d-none from the same blocks, and whichever is
 * used second finds the work already done.
 *
 * Ships on the public build too, where it is inert: show-solutions:false omits
 * the solution blocks from the HTML entirely, so there is nothing to match.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function makeButton(label, onClick) {
    var a = document.createElement("a");
    var span = document.createElement("span");
    a.className = "d-flex align-items-center gap-1 btn btn-exercise-editor " +
                  "btn-exercise-solution btn-outline-dark btn-sm text-nowrap lsda-solution-btn";
    a.setAttribute("role", "button");
    a.setAttribute("tabindex", "0");
    a.setAttribute("aria-label", label);
    span.className = "btn-label-exercise-editor";
    span.textContent = label;
    a.appendChild(span);
    a.onclick = onClick;
    a.onkeydown = function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
    };
    return a;
  }

  function addFor(id) {
    var blocks = document.querySelectorAll(
      '.exercise-solution[data-exercise="' + id + '"]');
    if (!blocks.length) return false;

    // the editor for this exercise, which is where the button group lives
    var cell = Array.prototype.slice
      .call(document.querySelectorAll('.cell[data-exercise="' + id + '"]'))
      .filter(function (c) { return c.querySelector(".exercise-editor"); })[0];
    if (!cell) return false;

    // An exercise with no hint already gets quarto-live's own solution button
    // straight away -- there is no chain to be buried behind. Adding a second
    // one there would just give the student two identical buttons. This also
    // stops us adding ours twice.
    var group = cell.querySelector(".btn-group-exercise-editor");
    if (!group || group.querySelector(".btn-exercise-solution")) return false;

    var btn = makeButton("Show Solution", function () {
      Array.prototype.forEach.call(blocks, function (b) {
        b.classList.remove("d-none");
      });
      btn.remove();
    });
    group.appendChild(btn);
    return true;
  }

  ready(function () {
    var ids = Array.prototype.slice
      .call(document.querySelectorAll(".exercise-solution[data-exercise]"))
      .map(function (el) { return el.getAttribute("data-exercise"); });
    if (!ids.length) return;                       // public build: nothing to do
    ids = ids.filter(function (v, i, a) { return a.indexOf(v) === i; });

    // The editors are built by OJS after webR boots, so the button group does
    // not exist yet at DOMContentLoaded. Keep trying as the page fills in.
    var pending = ids.slice();
    var stop = new MutationObserver(function () {
      pending = pending.filter(function (id) { return !addFor(id); });
      if (!pending.length) stop.disconnect();
    });
    stop.observe(document.body, { childList: true, subtree: true });
    pending = pending.filter(function (id) { return !addFor(id); });
  });
})();
