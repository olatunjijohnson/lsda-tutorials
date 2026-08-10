/* ---------------------------------------------------------------------------
 * Tutorial progress tracker.
 *
 * Two jobs:
 *   - reveal each exercise's "What this shows" note once that exercise has
 *     produced output. Reading the explanation before running anything teaches
 *     nothing; reading it beside your own result teaches a lot.
 *   - count how many exercises have been run, show a small live counter, and
 *     reveal the week's summary once every one of them has.
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

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var panel = document.getElementById("week-complete");

    // ---- what counts as an exercise ---------------------------------------
    //
    // quarto-live wraps each one in <div class="cell" data-exercise="qNN">
    // holding an empty <div class="exercise-cell"> for OJS to render into. The
    // same data-exercise value also appears on that exercise's setup, hint and
    // solution blocks, which carry no .exercise-cell -- so this selector picks
    // out exactly the interactive ones.
    //
    // Reading the placeholders rather than the rendered editors matters twice
    // over. The editors are created by OJS, which runs after DOMContentLoaded
    // and after webR has booted, several seconds later: an earlier version of
    // this file collected the list once at load, found it empty, and returned
    // without ever running again -- which is why explanations were never
    // revealed. And because the placeholders are in the static markup, the
    // total is right from the first moment, so the end-of-week panel cannot
    // appear early just because only some editors have rendered so far.
    function exerciseCells() {
      return Array.prototype.slice
        .call(document.querySelectorAll('.cell[data-exercise] > div > .exercise-cell'))
        .map(function (el) { return el.closest(".cell[data-exercise]"); });
    }

    // ---- what counts as having been run -----------------------------------
    //
    // webR renders text results into .cell-output and plots into
    // .cell-output-display. Both must be matched by exact class token: every
    // exercise is given an empty .cell-output-container the moment the page
    // renders, before anything has been run, so a substring match on
    // "cell-output" reports every exercise as finished from the outset.
    //
    // An R error arrives as a Quarto "important" callout, NOT as
    // .cell-output-stderr -- that is where ordinary message() output goes, and
    // treating it as failure would fail every exercise that loads a package.
    function hasOutput(cell) {
      return !!cell.querySelector(".cell-output, .cell-output-display");
    }
    function hasError(cell) {
      return !!cell.querySelector(".callout-important, .alert-danger");
    }
    function busy(cell) {
      return !!cell.querySelector(".exercise-editor-eval-indicator:not(.d-none)");
    }

    // Not every exercise prints something. `library(MASS); data(epil)` in week
    // 4 is a whole cell that produces no output at all, and judging it purely
    // on output would leave that week impossible to finish. So a cell also
    // counts once the student has run it and the run has come back.
    //
    // Attempts are recorded from the event the editor fires on commit, which
    // covers both the Run button and Ctrl-Enter. It is listened for in the
    // capture phase because the editor dispatches it without bubbling, and it
    // is a true record of the student acting: the evaluation the runtime does
    // for itself as the page loads fires no such event.
    var attempted = new Set();

    function ran(cell) {
      if (!cell || hasError(cell)) return false;
      return hasOutput(cell) || (attempted.has(cell.getAttribute("data-exercise")) &&
                                 !busy(cell));
    }

    // ---- the counter chip --------------------------------------------------
    //
    // Progress is read back off the page each time rather than stored: a reload
    // clears the outputs because it restarts the R session, and the count has
    // to say the same thing. Carrying a saved count across a reload would claim
    // work that the session behind it no longer has.
    var chip = null;
    var done = new Set();

    function render(total) {
      if (!total) return;               // nothing rendered yet, nothing to say
      if (!chip) {
        chip = document.createElement("div");
        chip.className = "lsda-progress-chip";
        chip.setAttribute("role", "status");
        chip.setAttribute("aria-live", "polite");
        document.body.appendChild(chip);
      }
      // Only write when something changed. The observer below watches the
      // whole body, and rewriting identical text is still a DOM mutation --
      // it would wake the observer, which would sweep, which would write
      // again, round and round.
      var n = Math.min(done.size, total);
      var text = n + " / " + total + " exercises run";
      if (chip.textContent !== text) chip.textContent = text;
      if (chip.classList.contains("is-complete") !== (n >= total)) {
        chip.classList.toggle("is-complete", n >= total);
      }

      if (panel && n >= total) {
        panel.hidden = false;
        panel.classList.add("is-revealed");
        // Quarto renders the empty ::: {.lsda-stamp} block as a div holding
        // whitespace, so this has to be a trimmed test -- an emptiness check on
        // the raw text is false from the start and the stamp never gets written.
        var stamp = panel.querySelector(".lsda-stamp");
        if (stamp && !stamp.textContent.trim()) {
          stamp.textContent =
            "All " + total + " exercises run — " +
            new Date().toLocaleString(undefined, {
              dateStyle: "medium", timeStyle: "short"
            });
        }
      }
    }

    // ---- one pass over the page -------------------------------------------
    //
    // Everything is matched by id rather than by DOM position. An explanation
    // carries data-for="qNN" and belongs to the cell with data-exercise="qNN",
    // wherever either happens to sit. Position-based matching was fragile
    // because OJS rewrites the nodes as it renders them.
    function sweep() {
      var cells = exerciseCells();
      if (!cells.length) return;

      cells.forEach(function (cell) {
        var id = cell.getAttribute("data-exercise");
        if (ran(cell)) done.add(id); else done.delete(id);
      });

      // Explanations are <details>, so the student can always open one by
      // hand. Opening it for them the moment their exercise produces output is
      // just the better moment to read it -- never the only way in.
      document.querySelectorAll(".lsda-explain").forEach(function (el) {
        if (el.open) return;
        var id = el.getAttribute("data-for");
        if (!id || !done.has(id)) return;
        el.open = true;
        el.classList.add("is-revealed");
      });

      render(cells.length);
    }

    // Coalesce bursts of mutations into one sweep. The timer is deliberately
    // not restarted while one is already armed: re-arming on every mutation
    // would let a steady trickle of them postpone the sweep indefinitely.
    var pending = null;
    function scheduleSweep() {
      if (pending) return;
      pending = window.setTimeout(function () { pending = null; sweep(); }, 100);
    }

    document.addEventListener("input", function (e) {
      if (!e.detail || !e.detail.commit) return;
      var cell = e.target && e.target.closest && e.target.closest(".cell[data-exercise]");
      if (!cell) return;
      attempted.add(cell.getAttribute("data-exercise"));
      // Look again once the run has had a chance to start and to finish. The
      // observer catches most of it; these cover a cell that renders nothing,
      // where the only change is the spinner going out.
      window.setTimeout(sweep, 400);
      window.setTimeout(sweep, 2000);
    }, true);

    // One observer on the whole document: it survives the node replacement
    // that OJS does while rendering, and it also catches the editors arriving
    // in the first place. Class changes matter too -- that is how the
    // evaluation spinner goes on and off.
    new MutationObserver(function () {
      scheduleSweep();
    }).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["class"]
    });

    sweep();
  });
})();
