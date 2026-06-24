/* Shared site behaviour: theme toggle, copy buttons, active nav, syntax highlight */
(function () {
  "use strict";

  /* ---------- Theme ---------- */
  var stored = null;
  try { stored = localStorage.getItem("ajsont-theme"); } catch (e) {}
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ajsont-theme", next); } catch (e) {}
  }

  /* ---------- Syntax highlight (tiny, dependency-free) ---------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightJSON(src) {
    // tokenize on strings, then classify
    var out = "";
    var re = /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])|(\/\/[^\n]*)/g;
    var last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1] !== undefined) {
        var isKey = m[2] !== undefined;
        var isOp = isKey && /^"\$/.test(m[1]); // $-prefixed operator keys
        var cls = isKey ? (isOp ? "tok-op" : "tok-key") : "tok-str";
        out += '<span class="' + cls + '">' + esc(m[1]) + "</span>";
        if (isKey) out += '<span class="tok-punc">' + esc(m[2]) + "</span>";
      } else if (m[3] !== undefined) {
        out += '<span class="tok-bool">' + esc(m[3]) + "</span>";
      } else if (m[4] !== undefined) {
        out += '<span class="tok-num">' + esc(m[4]) + "</span>";
      } else if (m[5] !== undefined) {
        out += '<span class="tok-punc">' + esc(m[5]) + "</span>";
      } else if (m[6] !== undefined) {
        out += '<span class="tok-com">' + esc(m[6]) + "</span>";
      }
      last = re.lastIndex;
    }
    out += esc(src.slice(last));
    return out;
  }

  var TS_KW = /\b(import|from|export|const|let|var|function|return|if|else|try|catch|throw|new|typeof|instanceof|interface|type|as|async|await|for|of|in)\b/g;

  function highlightTS(src) {
    var out = "";
    var re = /(\/\/[^\n]*)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)/g;
    var last = 0, m;
    function plain(s) {
      var e = esc(s);
      e = e.replace(TS_KW, '<span class="tok-kw">$1</span>');
      e = e.replace(/\b([A-Za-z_$][\w$]*)(\s*\()/g, '<span class="tok-fn">$1</span>$2');
      e = e.replace(/(\$\.[\w.$\[\]'"*@()?:\-]+)/g, '<span class="tok-str">$1</span>');
      return e;
    }
    while ((m = re.exec(src))) {
      out += plain(src.slice(last, m.index));
      if (m[1] !== undefined) out += '<span class="tok-com">' + esc(m[1]) + "</span>";
      else if (m[2] !== undefined) out += '<span class="tok-str">' + esc(m[2]) + "</span>";
      else if (m[3] !== undefined) out += '<span class="tok-num">' + esc(m[3]) + "</span>";
      last = re.lastIndex;
    }
    out += plain(src.slice(last));
    return out;
  }

  function highlightBash(src) {
    var e = esc(src);
    e = e.replace(/^(\s*)(npm|npx|pnpm|yarn|bun)\b/gm, '$1<span class="tok-fn">$2</span>');
    e = e.replace(/(\s)(install|add|run|i)\b/g, '$1<span class="tok-kw">$2</span>');
    e = e.replace(/(@[\w\/-]+)/g, '<span class="tok-str">$1</span>');
    return e;
  }

  function highlightAll() {
    var blocks = document.querySelectorAll("code[data-lang]");
    blocks.forEach(function (el) {
      if (el.dataset.hl) return;
      var lang = el.getAttribute("data-lang");
      var src = el.textContent;
      var html;
      if (lang === "json") html = highlightJSON(src);
      else if (lang === "bash") html = highlightBash(src);
      else html = highlightTS(src);
      el.innerHTML = html;
      el.dataset.hl = "1";
    });
  }
  window.ajsontHighlight = highlightAll;

  /* ---------- Copy buttons ---------- */
  function copyText(text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.getAttribute("data-label");
      btn.classList.add("copied");
      var labelEl = btn.querySelector(".copy-label");
      if (labelEl) { labelEl.textContent = "Copied!"; }
      setTimeout(function () {
        btn.classList.remove("copied");
        if (labelEl && old !== null) labelEl.textContent = old;
      }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function wireCopy() {
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sel = btn.getAttribute("data-copy-target");
        var text = btn.getAttribute("data-copy");
        if (sel) {
          var t = document.querySelector(sel);
          if (t) text = t.textContent;
        }
        copyText(text, btn);
      });
    });
    // codeblock copy buttons: copy sibling <pre>
    document.querySelectorAll(".copy-code").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var block = btn.closest(".codeblock");
        var pre = block && block.querySelector("pre");
        if (pre) copyText(pre.textContent, btn);
      });
    });
  }

  /* ---------- Active nav + scrollspy ---------- */
  function markActiveNav() {
    var path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a.navlink").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === path || (path === "" && href === "index.html")) a.classList.add("active");
    });
  }

  function scrollSpy() {
    var links = document.querySelectorAll(".docs-sidebar a[href^='#']");
    if (!links.length) return;
    var map = {};
    links.forEach(function (l) {
      var id = l.getAttribute("href").slice(1);
      var t = document.getElementById(id);
      if (t) map[id] = l;
    });
    var ids = Object.keys(map);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          ids.forEach(function (id) { map[id].classList.remove("active"); });
          if (map[en.target.id]) map[en.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });
    ids.forEach(function (id) { obs.observe(document.getElementById(id)); });
  }

  /* ---------- Init ---------- */
  function init() {
    var tt = document.querySelector(".theme-toggle");
    if (tt) tt.addEventListener("click", toggleTheme);
    highlightAll();
    wireCopy();
    markActiveNav();
    scrollSpy();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
