(function () {
  "use strict";

  var cachePage = document.documentElement.hasAttribute("manifest");
  var isConsole = /PlayStation 4[ /]([\d.]+)/i.test(navigator.userAgent);
  var msgs = document.getElementById("msgs");
  var progress = document.getElementById("progress");
  var percent = document.getElementById("progress-value");
  var launch = document.getElementById("launch");
  var back = document.getElementById("back-to-host");
  var target = document.getElementById("target");
  var log = document.getElementById("host-log");

  function setProgress(value) {
    var running = value === null;
    progress.firstElementChild.style.width = running ? "35%" : value + "%";
    percent.textContent = running ? "Running" : value + "%";
    if (running) {
      progress.removeAttribute("aria-valuenow");
    } else {
      progress.setAttribute("aria-valuenow", value);
    }
  }

  function renderStatus() {
    var message = msgs.textContent;
    if (cachePage) {
      var current = message.match(/(\d+)%/);
      if (/cache installed successfully|close and re-open/i.test(message)) {
        setProgress(100);
        back.hidden = false;
      } else {
        setProgress(current ? Number(current[1]) : 0);
      }
    } else if (/GoldHEN.*loaded/i.test(message)) {
      setProgress(100);
      launch.textContent = "GoldHEN Loaded";
    } else if (/failed|not found|no offsets/i.test(message)) {
      setProgress(0);
      launch.textContent = "Jailbreak Stopped";
    }
  }

  function highlightChain() {
    var option = target.options[target.selectedIndex];
    var chain = option && option.parentNode.getAttribute("data-chain");
    var options = document.querySelectorAll("#chains [data-chain]");
    for (var i = 0; i < options.length; i++) {
      options[i].className = options[i].getAttribute("data-chain") === (chain || "auto") ? "selected" : "";
    }
  }

  if (!isConsole) {
    // The animated artwork and favicon are desktop-only assets.
    var banner = document.querySelector("[data-animated]");
    banner.src = banner.getAttribute("data-animated");
    var icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = "icon0.png";
    document.head.appendChild(icon);
    if (cachePage) {
      msgs.textContent = "Offline cache is available in the PS4 browser.";
      back.hidden = false;
    } else {
      target.addEventListener("change", highlightChain);
    }
  } else {
    if (!cachePage) {
      for (var i = 0; i < target.options.length; i++) {
        if (target.options[i].value === window.fwVersion) {
          target.selectedIndex = i;
          break;
        }
      }
      highlightChain();
      target.disabled = true;
      document.getElementById("auto-launch").checked = true;

      if (window.script) {
        launch.textContent = "Running Jailbreak…";
        setProgress(null);
      } else if (window.applicationCache && window.applicationCache.status !== 0) {
        msgs.textContent = "Unsupported PS4 firmware: " + window.fwVersion + ".";
      }
    }

    renderStatus();
    if (window.MutationObserver) {
      new MutationObserver(renderStatus).observe(msgs, { childList: true, characterData: true, subtree: true });
    }
  }

  if (log) {
    log.parentNode.addEventListener("toggle", function () {
      if (!this.open) {
        return;
      }
      var lines = ["console", "out", "state"].map(function (id) {
        var source = document.getElementById(id);
        return source && source.textContent.trim();
      }).filter(Boolean);
      log.textContent = lines.join("\n\n") || "Jailbreak logs will appear here.";
      log.scrollTop = log.scrollHeight;
    });
  }
}());
