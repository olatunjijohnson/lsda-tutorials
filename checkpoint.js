/* ---------------------------------------------------------------------------
 * Post-tutorial checkpoint: a small self-marking quiz.
 *
 * Formative and unrecorded. Nothing is sent anywhere; marking happens in the
 * page. Answers are base64-encoded in the markup, which keeps them out of
 * casual view but is NOT secrecy — anyone who opens the developer console can
 * read them. That is an acceptable trade for a concept check with no marks
 * attached; it would not be acceptable for anything summative.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  function decode(s) {
    try { return atob(s); } catch (e) { return ""; }
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    document.querySelectorAll(".lsda-checkpoint").forEach(function (quiz) {
      var questions = Array.prototype.slice.call(
        quiz.querySelectorAll(".lsda-q")
      );
      if (!questions.length) return;

      var bar = document.createElement("div");
      bar.className = "lsda-cp-actions";

      var submit = document.createElement("button");
      submit.type = "button";
      submit.className = "btn btn-primary btn-sm";
      submit.textContent = "Check my answers";

      var retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn btn-outline-secondary btn-sm";
      retry.textContent = "Try again";
      retry.hidden = true;

      var score = document.createElement("span");
      score.className = "lsda-cp-score";

      bar.appendChild(submit);
      bar.appendChild(retry);
      bar.appendChild(score);
      quiz.appendChild(bar);

      function reset() {
        questions.forEach(function (q) {
          q.classList.remove("is-right", "is-wrong");
          var fb = q.querySelector(".lsda-fb");
          if (fb) fb.hidden = true;
          q.querySelectorAll("input[type=radio]").forEach(function (r) {
            r.checked = false; r.disabled = false;
            r.closest("label").classList.remove("is-right", "is-wrong");
          });
        });
        score.textContent = "";
        submit.hidden = false;
        retry.hidden = true;
      }

      submit.addEventListener("click", function () {
        var right = 0, answered = 0;

        questions.forEach(function (q) {
          var want = decode(q.dataset.a || "");
          var picked = q.querySelector("input[type=radio]:checked");
          var fb = q.querySelector(".lsda-fb");

          if (picked) answered++;
          q.querySelectorAll("input[type=radio]").forEach(function (r) {
            r.disabled = true;
            var lab = r.closest("label");
            if (r.value === want) lab.classList.add("is-right");
            else if (r.checked) lab.classList.add("is-wrong");
          });

          var ok = picked && picked.value === want;
          if (ok) right++;
          q.classList.add(ok ? "is-right" : "is-wrong");
          if (fb) fb.hidden = false;
        });

        if (answered < questions.length) {
          score.textContent =
            right + " / " + questions.length + " correct  (" +
            (questions.length - answered) + " unanswered)";
        } else {
          score.textContent = right + " / " + questions.length + " correct";
        }
        score.classList.toggle("is-full", right === questions.length);
        submit.hidden = true;
        retry.hidden = false;
      });

      retry.addEventListener("click", reset);
    });
  });
})();
