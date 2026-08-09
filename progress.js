/* ---------------------------------------------------------------------------
 * Tutorial progress tracker.
 *
 * Counts how many exercises on the page have been run and produced output
 * without an error, shows a small live counter, and reveals the week's summary
 * once every exercise has been run.
 *
 * What this evidences, and what it does not:
 *   - It shows that each exercise was executed in THIS browser session and did
 *     not error. That is a reasonable proxy for "worked through the sheet".
 *   - It does NOT check that answers are correct. There are no grading checks
 *     on these exercises, and for the plotting ones correctness is not
 *     mechanically checkable anyway.
 *   - It resets on reload, because the R session does.
 * The tutor looking at the screen sees the outputs too, which is the real check.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  var STORE_PREFIX = "lsda-progress:";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var panel = document.getElementById("week-complete");
    var cells = Array.prototype.slice.call(
      document.querySelectorAll(".exercise-cell")
    ).filter(function (c) {
      // Setup and display-only cells have no editor, so they are not exercises.
      return c.querySelector(".exercise-editor, .cm-editor");
    });

    if (!cells.length || !panel) return;

    var key = STORE_PREFIX + (document.body.dataset.week || location.pathname);
    var doneSet = new Set();

    try {
      var saved = window.sessionStorage.getItem(key);
      if (saved) JSON.parse(saved).forEach(function (i) { doneSet.add(i); });
    } catch (e) { /* sessionStorage unavailable: carry on without it */ }

    // ---- the counter chip -------------------------------------------------
    var chip = document.createElement("div");
    chip.className = "lsda-progress-chip";
    chip.setAttribute("role", "status");
    chip.setAttribute("aria-live", "polite");
    document.body.appendChild(chip);

    function render() {
      var n = doneSet.size, total = cells.length;
      chip.textContent = n + " / " + total + " exercises run";
      chip.classList.toggle("is-complete", n >= total);
      if (n >= total) {
        panel.hidden = false;
        panel.classList.add("is-revealed");
        var stamp = panel.querySelector(".lsda-stamp");
        if (stamp && !stamp.textContent) {
          stamp.textContent =
            "All " + total + " exercises run — " +
            new Date().toLocaleString(undefined, {
              dateStyle: "medium", timeStyle: "short"
            });
        }
      }
      try {
        window.sessionStorage.setItem(key, JSON.stringify(Array.from(doneSet)));
      } catch (e) { /* ignore */ }
    }

    // ---- watch each exercise for successful output ------------------------
    function hasOutput(cell) {
      // Any rendered output: printed values, a plot, or a grading alert.
      return !!cell.querySelector(
        ".cell-output, .exercise-grade, canvas, img, pre:not(.sourceCode)"
      );
    }
    function hasError(cell) {
      return !!cell.querySelector(".alert-danger, .alert-warning");
    }

    cells.forEach(function (cell, i) {
      var mark = function () {
        if (hasOutput(cell) && !hasError(cell)) {
          if (!doneSet.has(i)) { doneSet.add(i); render(); }
        } else if (hasError(cell) && doneSet.has(i)) {
          // An error after a success un-marks it, so the counter stays honest.
          doneSet.delete(i); render();
        }
      };
      new MutationObserver(mark).observe(cell, {
        childList: true, subtree: true
      });
      mark();
    });

    render();
  });
})();
