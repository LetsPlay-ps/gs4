(function () {
  "use strict";

  var cache = window.applicationCache;
  var msgs = document.getElementById("msgs");
  var progress = document.getElementById("progress");
  var percentage = document.getElementById("progress-value");

  function update(percent, message) {
    progress.firstElementChild.style.width = percent + "%";
    progress.setAttribute("aria-valuenow", percent);
    percentage.textContent = percent + "%";
    msgs.textContent = message;
  }

  if (!cache) {
    update(0, "Offline cache is available in the PS4 browser.");
    return;
  }

  function ready() {
    update(100, "Offline cache ready. Return to the host or reopen your PS4 browser.");
  }

  cache.addEventListener("progress", function (event) {
    var percent = event.total ? Math.round(100 * event.loaded / event.total) : 0;
    update(percent, "Installing offline cache…");
  });
  cache.addEventListener("cached", ready);
  cache.addEventListener("noupdate", ready);
  cache.addEventListener("updateready", ready);
  cache.addEventListener("error", function () {
    update(0, "Offline cache failed. Check the connection and retry.");
  });

  if (cache.status === 1 || cache.status === 4) {
    ready();
  }
}());
