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
    // The runtime emits cell-output-container / cell-output-display /
    // cell-output-stdout, never a bare "cell-output". A ".cell-output"
    // selector matches the exact class token only, so it never fired -- which
    // is why nothing was being detected. Match any class containing it.
    function hasOutput(cell) {
      return !!cell.querySelector(
        '[class*="cell-output"], .exercise-grade, canvas, img'
      );
    }
    function hasError(cell) {
      // A runtime error is rendered as cell-output-stderr; a failed grading
      // check as an alert-danger.
      return !!cell.querySelector('.cell-output-stderr, .alert-danger');
    }

    // Explanations sit hidden next to their exercise until it has produced
    // output. Reading "what this shows" before running anything teaches
    // nothing; reading it while looking at your own result teaches a lot.
    //
    // Pair them exactly rather than by document order: the page opens with
    // several non-editable setup cells, so "the Nth explanation belongs to the
    // Nth cell" is wrong. Each cell's payload carries its exercise label, so
    // decode that and match it against data-for.
    function exerciseIdOf(cell) {
      var id = cell.id;                       // e.g. "webr-7"
      if (!id) return null;
      var sc = document.querySelector('script[type="' + id + '-contents"]');
      if (!sc) return null;
      try {
        var payload = JSON.parse(atob(sc.textContent.trim()));
        return (payload.attr && payload.attr.exercise) || null;
      } catch (e) { return null; }
    }

    function explainFor(cell) {
      var ex = exerciseIdOf(cell);
      if (!ex) return null;
      return document.querySelector('.lsda-explain[data-for="' + ex + '"]');
    }

    cells.forEach(function (cell, i) {
      var ex = explainFor(cell);
      var mark = function () {
        if (hasOutput(cell) && !hasError(cell)) {
          if (ex && ex.hidden) { ex.hidden = false; ex.classList.add("is-revealed"); }
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
