(function () {
  "use strict";

  // Keep the existing G2All entry points. The scripts read the real PS4
  // user agent, so the target menu can preview a route but cannot override it.
  var routes = [
    { name: "Afterglow", chain: "afterglow", cache: "slopkit", src: "slopkit/jb2.js", module: true,
      versions: ["14.00"] },
    { name: "Poops / RTHDR", chain: "rthdr", cache: "slopkit", src: "slopkit/jb.js?v=19", module: true,
      versions: ["13.52", "13.50", "13.04", "13.02"] },
    { name: "Poops", chain: "poops", cache: "slopkit", src: "slopkit/chain_poops.js", module: true,
      versions: ["13.00", "12.52", "12.50"] },
    { name: "Lapse", chain: "lapse", cache: "slopkit", src: "slopkit/chain_lapse.js", module: true,
      versions: ["12.02", "12.00", "11.52", "11.50"] },
    { name: "Lapse", chain: "lapse", cache: "css", src: "css/main.js",
      versions: ["11.02", "11.00", "10.71", "10.70", "10.50", "10.01", "10.00"] },
    { name: "PSFree", chain: "psfree", cache: "900", src: "900/alert.js", module: true,
      versions: ["9.60", "9.51", "9.50", "9.04", "9.03", "9.00"] },
    { name: "PSFree", chain: "psfree", cache: "700", src: "700/alert.js", module: true,
      versions: ["8.52", "8.50", "8.03", "8.01", "8.00", "7.55", "7.51", "7.50", "7.02", "7.01", "7.00"] },
    { name: "5.05 Exploit", chain: "legacy", cache: "505", src: "505/exploit.js",
      versions: ["5.07", "5.05"] }
  ];

  var match = navigator.userAgent.match(/PlayStation\s+4[ /](\d{1,2}\.\d{2})(?![\d.])/i);
  var firmware = match ? match[1] : "";
  var target = document.getElementById("target");
  var available = {};

  routes.forEach(function (route) {
    var group = document.createElement("optgroup");
    var first = route.versions[route.versions.length - 1];
    var last = route.versions[0];
    group.label = route.name + " · " + (first === last ? first : first + "–" + last);
    route.versions.forEach(function (version) {
      available[version] = route;
      var option = document.createElement("option");
      option.value = version;
      option.textContent = "FW " + version;
      group.appendChild(option);
    });
    target.appendChild(group);
  });

  var route = available[firmware];
  var cache = window.applicationCache;
  var cacheLink = document.getElementById("install-cache");
  var chains = document.querySelectorAll("#chains [data-chain]");
  var autoLaunch = document.getElementById("auto-launch");
  var launch = document.getElementById("launch");
  var cancel = document.getElementById("cancel-auto");
  var countdown = document.getElementById("countdown");
  var msgs = document.getElementById("msgs");
  var progress = document.getElementById("progress");
  var progressValue = document.getElementById("progress-value");
  var log = document.getElementById("host-log");
  var logSources = ["console", "out", "state"].map(function (id) {
    return document.getElementById(id);
  });
  var drawer = log.parentNode;
  var preference = "g2all-auto:" + location.pathname.replace(/index\.html$/, "");
  var timer;
  var started = false;
  var cacheReady = false;
  var afterglowDone = false;

  if (route && route.chain === "afterglow") {
    try {
      afterglowDone = sessionStorage.getItem("jb2.goldhen_done") === "1";
    } catch (error) {
      // Afterglow checks the same key before it runs.
    }
  }

  function renderTarget() {
    var preview = target.value && available[target.value];
    var selected = preview || route;
    for (var i = 0; i < chains.length; i++) {
      var active = chains[i].getAttribute("data-chain") === (selected ? selected.chain : "auto");
      chains[i].className = active ? "selected" : "";
    }

    var canLaunch = route && (!target.value || target.value === firmware);
    launch.disabled = !canLaunch || started || afterglowDone;
    autoLaunch.disabled = launch.disabled || !cache;
    cacheLink.hidden = !canLaunch || !cache || cacheReady || started;

    if (!firmware) {
      msgs.textContent = "Open this page in the PS4 browser to start the jailbreak.";
    } else if (!route) {
      msgs.textContent = "Unsupported PS4 firmware: " + firmware + ".";
    } else if (!canLaunch) {
      msgs.textContent = "Select Auto Detect or FW " + firmware + " to launch on this PS4.";
    } else if (afterglowDone) {
      msgs.textContent = "Afterglow already ran in this session. Restart the PS4 before trying again.";
    } else {
      msgs.textContent = "PS4 FW " + firmware + " detected. Ready to start.";
    }
  }

  function updateCache() {
    // 1 is IDLE and 4 is UPDATEREADY. Both have a usable cache.
    cacheReady = !!cache && (cache.status === 1 || cache.status === 4);
    if (!started) {
      renderTarget();
      scheduleAutoLaunch();
    }
  }

  function stopCountdown() {
    clearInterval(timer);
    timer = null;
    countdown.hidden = true;
    cancel.hidden = true;
  }

  function scheduleAutoLaunch() {
    stopCountdown();
    if (!autoLaunch.checked || autoLaunch.disabled) {
      return;
    }
    if (!cacheReady) {
      msgs.textContent = "Install the offline cache to use Auto Exploit.";
      return;
    }

    var seconds = 5;
    countdown.textContent = "(" + seconds + "s)";
    countdown.hidden = false;
    cancel.hidden = false;
    timer = setInterval(function () {
      seconds -= 1;
      countdown.textContent = "(" + seconds + "s)";
      if (seconds === 0) {
        startJailbreak();
      }
    }, 1000);
  }

  function saveAutoLaunch() {
    try {
      localStorage.setItem(preference, autoLaunch.checked ? "1" : "0");
    } catch (error) {
      // The toggle still works for this visit when storage is blocked.
    }
    renderTarget();
    scheduleAutoLaunch();
  }

  function setProgress(value) {
    var running = value === null;
    progress.className = running ? "progress-track running" : "progress-track";
    progress.firstElementChild.style.width = running ? "" : value + "%";
    progressValue.textContent = running ? "Running" : value + "%";
    if (running) {
      progress.removeAttribute("aria-valuenow");
    } else {
      progress.setAttribute("aria-valuenow", value);
    }
  }

  function startJailbreak() {
    stopCountdown();
    if (launch.disabled || started) {
      return;
    }

    started = true;
    launch.disabled = true;
    launch.textContent = "Running Jailbreak…";
    target.disabled = true;
    autoLaunch.disabled = true;
    cacheLink.hidden = true;
    msgs.textContent = "Loading GoldHEN v2.4b18.13…";
    setProgress(null);

    var script = document.createElement("script");
    script.src = route.src;
    if (route.module) {
      script.type = "module";
    }
    if (route.cache === "css") {
      script.onload = function () {
        setTimeout(function () {
          if (typeof window.doJb !== "function") {
            msgs.textContent = "Failed to load the Lapse chain.";
            return;
          }
          window.doJb("lapse").catch(function () {
            msgs.textContent = "Failed to load the Lapse chain. Reopen the browser and try again.";
          });
        }, 500);
      };
    }
    script.onerror = function () {
      msgs.textContent = "Failed to load the jailbreak files. Check the connection or reinstall the cache.";
    };
    document.head.appendChild(script);
  }

  function renderLog() {
    if (!drawer.open) {
      return;
    }
    var lines = logSources.map(function (source) {
      return source.textContent.trim();
    }).filter(Boolean);
    log.textContent = lines.join("\n\n") || "Jailbreak logs will appear here.";
    log.scrollTop = log.scrollHeight;
  }

  if (window.MutationObserver) {
    var options = { childList: true, characterData: true, subtree: true };
    new MutationObserver(function () {
      if (started && /\b(?:already |2\.4b18\.13 )loaded\b/i.test(msgs.textContent)) {
        setProgress(100);
        launch.textContent = "GoldHEN Loaded";
      } else if (started && /failed|no offsets/i.test(msgs.textContent)) {
        setProgress(0);
        launch.textContent = "Jailbreak Stopped";
      }
    }).observe(msgs, options);

    var logObserver = new MutationObserver(renderLog);
    drawer.addEventListener("toggle", function () {
      logObserver.disconnect();
      if (drawer.open) {
        logSources.forEach(function (source) {
          logObserver.observe(source, options);
        });
        renderLog();
      }
    });
  }

  target.addEventListener("change", function () {
    renderTarget();
    scheduleAutoLaunch();
  });
  launch.addEventListener("click", startJailbreak);
  autoLaunch.addEventListener("change", saveAutoLaunch);
  cancel.addEventListener("click", function () {
    autoLaunch.checked = false;
    saveAutoLaunch();
  });
  window.addEventListener("pagehide", stopCountdown);
  window.addEventListener("pageshow", updateCache);

  if (route) {
    cacheLink.href = "cache" + route.cache + ".html";
    try {
      autoLaunch.checked = localStorage.getItem(preference) === "1";
    } catch (error) {
      autoLaunch.checked = false;
    }
  }
  if (cache) {
    ["cached", "noupdate", "updateready", "obsolete", "error"].forEach(function (event) {
      cache.addEventListener(event, updateCache);
    });
  }
  updateCache();

  // The newer chains request a bounded reload only for recoverable read misses.
  if (route && (route.chain === "rthdr" || route.chain === "afterglow") &&
      history.state === "g2all:retry") {
    history.replaceState(null, "");
    startJailbreak();
  }
}());
