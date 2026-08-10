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

    function render(override) {
      var n = (typeof override === "number" && override > doneSet.size) ? override : doneSet.size,
          total = cells.length;
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

    // Explanations sit hidden until the exercise above them has produced
    // output. Reading "what this shows" before running anything teaches
    // nothing; reading it beside your own result teaches a lot.
    //
    // The runtime renders output through OJS, which REPLACES the exercise node
    // rather than filling it in. So observing the original .exercise-cell is
    // useless -- it gets swapped out. Instead watch the whole document and, on
    // each change, ask a positional question: is there any output element
    // between this explanation and the previous one? Re-querying every time
    // means node replacement does not matter.
    var explains = Array.prototype.slice.call(
      document.querySelectorAll(".lsda-explain")
    );

    // For an explanation E, the exercise it belongs to is the nearest
    // exercise cell above it. Reveal E when that cell has produced output.
    //
    // Anchoring to the previous *explanation* instead would misfire on the
    // first one: with no explanation above it, output from the package-install
    // cell at the top of the page would count and reveal it immediately.
    function cellFor(el) {
      var cells = document.querySelectorAll(".exercise-cell");
      var best = null;
      for (var i = 0; i < cells.length; i++) {
        if (el.compareDocumentPosition(cells[i]) & Node.DOCUMENT_POSITION_PRECEDING) {
          best = cells[i];
        }
      }
      return best;
    }

    function producedOutput(cell, el) {
      if (!cell) return false;
      var outs = document.querySelectorAll('[class*="cell-output"], .exercise-grade');
      for (var i = 0; i < outs.length; i++) {
        var o = outs[i];
        if (o.classList.contains("cell-output-stderr") ||
            o.classList.contains("alert-danger")) continue;   // an error is not a result
        var pos = cell.compareDocumentPosition(o);
        var inside = !!(pos & Node.DOCUMENT_POSITION_CONTAINED_BY);
        var between = !!(pos & Node.DOCUMENT_POSITION_FOLLOWING) &&
                      !!(el.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_PRECEDING);
        if (inside || between) return true;
      }
      return false;
    }

    function sweep() {
      var changed = false;
      for (var i = 0; i < explains.length; i++) {
        var el = explains[i];
        if (!el.hidden) continue;
        if (producedOutput(cellFor(el), el)) {
          el.hidden = false;
          el.classList.add("is-revealed");
          changed = true;
        }
      }
      // the completion counter uses the same evidence
      var done = explains.filter(function (e) { return !e.hidden; }).length;
      if (changed) render(done);
    }

    cells.forEach(function (cell, i) {
      var mark = function () {
        if (hasOutput(cell) && !hasError(cell)) {
          if (!doneSet.has(i)) { doneSet.add(i); render(); }
        } else if (hasError(cell) && doneSet.has(i)) {
          doneSet.delete(i); render();
        }
      };
      new MutationObserver(mark).observe(cell, { childList: true, subtree: true });
      mark();
    });

    // One observer on the whole document, which survives node replacement.
    new MutationObserver(function () {
      sweep();
      cells.forEach(function (cell, i) {
        if (hasOutput(cell) && !hasError(cell) && !doneSet.has(i)) {
          doneSet.add(i); render();
        }
      });
    }).observe(document.body, { childList: true, subtree: true });

    sweep();
    render();
  });
})();
