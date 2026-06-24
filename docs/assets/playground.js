/* ajsont playground — debounced validation + run transform */
import { transform, validateSpec } from "./ajsont.browser.js";

const els = {
  json: document.getElementById("pg-json"),
  spec: document.getElementById("pg-spec"),
  jsonStatus: document.getElementById("pg-json-status"),
  specStatus: document.getElementById("pg-spec-status"),
  specErrs: document.getElementById("pg-spec-errs"),
  run: document.getElementById("pg-run"),
  output: document.getElementById("pg-output"),
  sample: document.getElementById("pg-sample"),
  copyOut: document.getElementById("pg-copy-out"),
};

const STORAGE_KEY = "ajsont-playground";

/* ---------- Samples ---------- */
const SAMPLES = {
  basic: {
    json: {
      person: { firstName: "Jane", lastName: "Doe" },
      contact: { email: "jane@example.com" },
      metadata: { uid: "u-123" },
      subscription: { plan: "enterprise" },
    },
    spec: {
      user: {
        fullName: { $concat: ["$.person.firstName", " ", "$.person.lastName"] },
        email: { $path: "$.contact.email", $onMissing: "omit" },
        id: { $path: "$.metadata.uid" },
        region: { $path: "$.geo.region", $default: "US" },
        tier: { $if: { exists: "$.subscription" }, then: "premium", else: "free" },
      },
    },
  },
  conditional: {
    json: {
      user: { firstName: "Sam", id: "u-9" },
      flags: { beta: true },
      account: { status: "active" },
    },
    spec: {
      name: { $coalesce: ["$.user.preferredName", "$.user.firstName"], $default: "Anonymous" },
      access: { $if: { eq: ["$.account.status", "active"] }, then: "granted", else: "denied" },
      cohort: { $if: { exists: "$.flags.beta" }, then: "beta", else: "stable" },
      id: { $path: "$.user.id" },
    },
  },
  strings: {
    json: {
      event: { TYPE: "  User.Signed_In  " },
      contact: { Email: "JANE@EXAMPLE.COM" },
    },
    spec: {
      eventType: { $lower: "$.event.TYPE" },
      eventTypeUpper: { $upper: "$.event.TYPE" },
      trimmed: { $trim: "$.event.TYPE" },
      email: { $lower: "$.contact.Email" },
    },
  },
  empty: { json: {}, spec: {} },
};

/* ---------- tiny JSON highlighter for output ---------- */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function highlightJSON(src) {
  let out = "";
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;
  let last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1] !== undefined) {
      const isKey = m[2] !== undefined;
      const isOp = isKey && /^"\$/.test(m[1]);
      out += '<span class="' + (isKey ? (isOp ? "tok-op" : "tok-key") : "tok-str") + '">' + esc(m[1]) + "</span>";
      if (isKey) out += '<span class="tok-punc">' + esc(m[2]) + "</span>";
    } else if (m[3] !== undefined) out += '<span class="tok-bool">' + esc(m[3]) + "</span>";
    else if (m[4] !== undefined) out += '<span class="tok-num">' + esc(m[4]) + "</span>";
    else if (m[5] !== undefined) out += '<span class="tok-punc">' + esc(m[5]) + "</span>";
    last = re.lastIndex;
  }
  out += esc(src.slice(last));
  return out;
}

/* ---------- Status helpers ---------- */
function setStatus(el, state, text) {
  el.className = "pg-status " + state;
  el.querySelector(".txt").textContent = text;
}

/* ---------- Validation ---------- */
let jsonValid = false;
let specValid = false;

function validateJsonPane() {
  const raw = els.json.value.trim();
  if (!raw) {
    jsonValid = false;
    setStatus(els.jsonStatus, "idle", "empty");
    return;
  }
  try {
    JSON.parse(raw);
    jsonValid = true;
    setStatus(els.jsonStatus, "valid", "valid JSON");
  } catch (err) {
    jsonValid = false;
    setStatus(els.jsonStatus, "invalid", "invalid JSON");
  }
}

function validateSpecPane() {
  const raw = els.spec.value.trim();
  els.specErrs.innerHTML = "";
  if (!raw) {
    specValid = false;
    setStatus(els.specStatus, "idle", "empty");
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    specValid = false;
    setStatus(els.specStatus, "invalid", "invalid JSON");
    renderErrors([{ path: "(parse)", message: err.message }]);
    return;
  }
  const errors = validateSpec(parsed);
  if (errors.length === 0) {
    specValid = true;
    setStatus(els.specStatus, "valid", "valid template");
  } else {
    specValid = false;
    setStatus(els.specStatus, "invalid", errors.length + " issue" + (errors.length > 1 ? "s" : ""));
    renderErrors(errors);
  }
}

function renderErrors(errors) {
  els.specErrs.innerHTML = errors
    .map(function (e) {
      return '<div class="pg-err"><span class="epath">' + esc(e.path) + "</span>" + esc(e.message) + "</div>";
    })
    .join("");
}

function updateButton() {
  els.run.disabled = !(jsonValid && specValid);
}

function runValidation() {
  validateJsonPane();
  validateSpecPane();
  updateButton();
  persist();
}

/* ---------- Debounce (1s) ---------- */
let timer = null;
function scheduleValidation() {
  if (timer) clearTimeout(timer);
  // While typing, the action is unavailable until re-validated.
  els.run.disabled = true;
  timer = setTimeout(runValidation, 1000);
}

/* ---------- Run transform ---------- */
function runTransform() {
  if (els.run.disabled) return;
  let source, spec;
  try {
    source = JSON.parse(els.json.value);
    spec = JSON.parse(els.spec.value);
  } catch (err) {
    showError("Could not parse input: " + err.message);
    return;
  }
  try {
    const result = transform(source, spec);
    const text = JSON.stringify(result, null, 2);
    els.output.classList.remove("error-out");
    els.output.innerHTML = highlightJSON(text === undefined ? "undefined" : text);
  } catch (err) {
    showError((err && err.name ? err.name + ": " : "Error: ") + (err && err.message ? err.message : String(err)));
  }
}

function showError(msg) {
  els.output.classList.add("error-out");
  els.output.textContent = "✖ " + msg;
}

/* ---------- Persistence ---------- */
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ json: els.json.value, spec: els.spec.value }));
  } catch (e) {}
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && (saved.json || saved.spec)) {
      els.json.value = saved.json;
      els.spec.value = saved.spec;
      return true;
    }
  } catch (e) {}
  return false;
}

function loadSample(key) {
  const s = SAMPLES[key] || SAMPLES.basic;
  els.json.value = JSON.stringify(s.json, null, 2);
  els.spec.value = JSON.stringify(s.spec, null, 2);
  runValidation();
  if (!els.run.disabled) runTransform();
}

/* ---------- Tab key inserts spaces ---------- */
function handleTab(e) {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const el = e.target;
  const start = el.selectionStart, end = el.selectionEnd;
  el.value = el.value.slice(0, start) + "  " + el.value.slice(end);
  el.selectionStart = el.selectionEnd = start + 2;
  scheduleValidation();
}

/* ---------- Wire up ---------- */
els.json.addEventListener("input", scheduleValidation);
els.spec.addEventListener("input", scheduleValidation);
els.json.addEventListener("keydown", handleTab);
els.spec.addEventListener("keydown", handleTab);
els.run.addEventListener("click", runTransform);
els.sample.addEventListener("change", function () { loadSample(els.sample.value); });
els.copyOut.addEventListener("click", function () {
  const text = els.output.textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  const lbl = els.copyOut.querySelector(".copy-label");
  if (lbl) { const o = lbl.textContent; lbl.textContent = "Copied!"; setTimeout(function(){ lbl.textContent = o; }, 1400); }
});

/* ---------- Init ---------- */
if (restore()) {
  runValidation();
  if (!els.run.disabled) runTransform();
} else {
  loadSample("basic");
}
