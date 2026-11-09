/* =====================================================================
   app.js — логіка інтерфейсу. Дані: prompts.js, переклади: labels.js
   ===================================================================== */
(function () {
"use strict";

var $ = function (i) { return document.getElementById(i); };
var S = { c: null, p: null, lv: null, lang: null, mode: "OFF", v: [], q: "" };

/* ---------- сховище (localStorage може бути недоступним) ---------- */
function store(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); return true; }
  catch (e) { return v === undefined ? null : false; }
}
function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

/* ---------- переклади ---------- */
function ukLabel(f) { var e = LABEL_UK[f.l]; return e ? e[0] : f.l; }
function ukPh(f) { var e = LABEL_UK[f.l]; return e && e[1] ? e[1] : (f.ph || ""); }
function ukKinds(f) { var e = LABEL_UK[f.l]; return e && e[2] ? e[2] : null; }
function ukOpt(v) {
  if (OPT_UK[v]) return OPT_UK[v];
  var m = /^(\d+) minutes$/.exec(v);
  return m ? m[1] + " хв" : v;
}
function catName(id) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === id) return CATS[i][1]; return ""; }
function plural(n, a, b, c) { var m = n % 10, h = n % 100; return h > 10 && h < 15 ? c : m === 1 ? a : (m > 1 && m < 5 ? b : c); }

/* ---------- радіо-групи ---------- */
function radios(box, name, items, sel, cb) {
  box.innerHTML = "";
  items.forEach(function (it) {
    var lab = el("label"), i = el("input");
    i.type = "radio"; i.name = name; i.value = it[0];
    if (it[0] === sel) i.checked = true;
    i.onchange = function () { cb(it[0]); };
    lab.appendChild(i);
    lab.appendChild(el("span", "", it[1]));
    box.appendChild(lab);
  });
}

/* ---------- збирання промпта ---------- */
function assemble(p, s, vals) {
  vals = vals || [];
  var a = "About me:\n- " + (p.ll || "My level") + ": " + s.lv + "\n- Language for explanations: " + s.lang + "\n";
  if (p.adult) a += "- Adult mode: " + (s.mode || "OFF") + "\n";
  (p.f || []).forEach(function (f, i) {
    var v = f.t === "s" ? (vals[i] || f.o[0]) : (vals[i] || "");
    if (!v) { if (f.opt) return; v = f.ph; }
    a += "- " + f.l + ":" + (f.t === "a" ? "\n" : " ") + v + "\n";
  });
  var ls = p.ls === undefined ? " If my level is A1-A2 and I chose Ukrainian, write task instructions in Ukrainian too." : (p.ls ? " " + p.ls : "");
  var lang = "IMPORTANT LANGUAGE RULE: Write ALL of your own text (" + (p.lt || "instructions, hints, explanations, feedback, summaries") + ") in the language I chose. Only " + p.en + " in English." + ls;
  var ad = "ADULT MODE (applies only if I wrote ON): I am an adult (18+) and I am learning real-life English, including swearing, slang, and sexual or offensive language. If " + (p.adw || "a word or expression") + " is vulgar, offensive, sexual, or taboo: do not refuse and do not only say \"this is a bad word\". Explain it like a language teacher: the meaning in plain language, the closest Ukrainian equivalent(s) (or say there is none), how strong it is (mild / strong / very offensive), when it is acceptable and when it is risky, and 1-2 milder alternatives. Keep examples short and not graphic. If it is a slur against a group of people, explain what it means and why it is offensive so I can recognise it, but do not encourage me to use it. If Adult mode is OFF and an item is vulgar, say so in one short line and tell me I can switch Adult mode ON.";
  return p.b.replace("{ABOUT}", function () { return a.trim(); })
            .replace("{LANG}", function () { return lang; })
            .replace("{CHECK}", function () { return CHECK; })
            .replace("{ADULT}", function () { return ad; });
}

/* Поля з заготовкою в квадратних дужках обов’язкові */
function missing() {
  var m = [];
  (S.p.f || []).forEach(function (f, i) {
    if (f.opt || f.t === "s") return;
    if (!S.v[i] && /^\[/.test(f.ph || "")) m.push(ukLabel(f).replace(/[:(].*$/, "").trim());
  });
  return m;
}

function ready() { return S.p && S.lv && S.lang && (!S.p.adult || S.mode); }

var lastText = "";
function render() {
  if (!ready()) return;
  lastText = assemble(S.p, S, S.v);
  $("out").textContent = lastText;
  var words = lastText.split(/\s+/).filter(Boolean).length;
  $("meta").textContent = "≈ " + words + " слів · " + lastText.length + " символів";
  var m = missing(), w = $("warn");
  if (m.length) {
    w.hidden = false;
    w.textContent = "Не заповнено: " + m.join("; ") + ". Заповніть у розділі «Деталі для промпта», інакше в промпті залишиться заготовка в дужках.";
  } else { w.hidden = true; }
  $("status").textContent = "";
}

/* ---------- показ кроків ---------- */
function scrollToId(id) {
  var e = $(id); if (!e) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  e.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
var shown = {};
function reveal(doScroll) {
  var st = {
    s2: !!(S.c || S.q),
    s3: !!S.p,
    s4: !!(S.p && S.lv),
    s5: !!(S.p && S.p.adult && S.lang),
    s6: !!(ready() && (S.p.f || []).length),
    s7: !!ready()
  };
  var fresh = null;
  Object.keys(st).forEach(function (k) {
    $(k).hidden = !st[k];
    if (st[k] && !shown[k]) fresh = k;
    shown[k] = st[k];
  });
  if (doScroll && fresh) setTimeout(function () { scrollToId(fresh); }, 60);
}

/* ---------- рівні ---------- */
function levels() {
  var r = S.p.lv.split("-"), a = LV.indexOf(r[0]), z = LV.indexOf(r[1]);
  var it = LV.slice(a, z + 1).concat(["not sure"]).map(function (x) { return [x, LEVEL_UK[x] || x]; });
  if (S.lv && !it.some(function (x) { return x[0] === S.lv; })) S.lv = null;
  radios($("level"), "lv", it, S.lv, function (v) { S.lv = v; reveal(1); render(); });
  $("lvlTest").hidden = S.p.id === "lvl";
}

/* ---------- поля ---------- */
var fid = 0, insertBoxes = [];
function fields() {
  var b = $("fields"); b.innerHTML = ""; S.v = []; insertBoxes = [];
  (S.p.f || []).forEach(function (f, i) {
    var id = "f" + (++fid);
    var w = el("div", "fl"), l = el("label", "", ukLabel(f)); l.htmlFor = id;
    if (f.opt) l.appendChild(el("span", "o", " (необов’язково)"));
    else if (f.t !== "s" && /^\[/.test(f.ph || "")) { l.appendChild(document.createTextNode(" ")); l.appendChild(el("span", "req", "*")); }
    w.appendChild(l);
    var x, hint = "";
    if (f.t === "s") {
      x = el("select"); x.id = id;
      f.o.forEach(function (o) { var op = el("option", "", ukOpt(o)); op.value = o; x.appendChild(op); });
      x.onchange = function () { S.v[i] = x.value; render(); };
      w.appendChild(x);
    } else if (f.t === "c") {
      x = el("select"); x.id = id;
      var z = el("option", "", "— обрати зі списку —"); z.value = "";
      x.appendChild(z);
      f.o.forEach(function (o) { var op = el("option", "", ukOpt(o)); op.value = o; x.appendChild(op); });
      var y = el("input"); y.type = "text"; y.placeholder = "або впишіть своє"; y.setAttribute("aria-label", ukLabel(f) + ": власний варіант");
      var u = function () { S.v[i] = y.value.trim() || x.value; render(); };
      x.onchange = u; y.oninput = u;
      w.appendChild(x); w.appendChild(y);
      hint = /^choose/.test(f.ph) ? "Якщо нічого не обрати, ШІ вирішить сам." : "Якщо нічого не обрати: «" + f.ph + "».";
    } else {
      x = el(f.t === "a" ? "textarea" : "input"); x.id = id;
      if (f.t === "t") x.type = "text";
      x.placeholder = ukPh(f);
      x.oninput = function () { S.v[i] = x.value.trim(); render(); };
      w.appendChild(x);
      if (!f.opt && f.ph && !/^\[/.test(f.ph)) hint = /^choose/.test(f.ph) ? "Якщо залишити порожнім, ШІ вирішить сам." : "Якщо залишити порожнім: «" + f.ph + "».";
      var kinds = ukKinds(f);
      if (f.t === "a" && kinds) {
        var box = el("div", "insert");
        w.appendChild(box);
        insertBoxes.push({ box: box, kinds: kinds, ta: x, idx: i });
      }
    }
    if (hint) w.appendChild(el("p", "fieldhint", hint));
    b.appendChild(w);
  });
  refreshInserts();
}

/* ---------- промпти ---------- */
function pickPrompt(p) { S.p = p; levels(); fields(); reveal(1); render(); }

function list() {
  var b = $("plist"); b.innerHTML = "";
  var q = S.q.toLowerCase();
  $("catHint").textContent = q ? "Результати пошуку за запитом «" + S.q + "»" : (CAT_DESC[S.c] || "");
  var items = P.filter(function (p) {
    if (q) return (p.n + " " + (PROMPT_UK[p.id] || "") + " " + p.d + " " + p.id + " " + p.lv + " " + catName(p.c)).toLowerCase().indexOf(q) > -1;
    return p.c === S.c;
  });
  if (!items.length) { b.appendChild(el("p", "empty", "Нічого не знайдено. Спробуйте інше слово або оберіть категорію.")); return; }
  items.forEach(function (p) {
    var lab = el("label"), i = el("input");
    i.type = "radio"; i.name = "prompt"; i.value = p.id;
    if (S.p === p) i.checked = true;
    i.onchange = function () { pickPrompt(p); };
    var s = el("span");
    var ukTitle = PROMPT_UK[p.id];
    s.appendChild(el("b", "", ukTitle || p.n));
    if (ukTitle) s.appendChild(el("small", "en", p.n));
    var tags = el("div", "tags");
    tags.appendChild(el("span", "tag", "Рівні " + p.lv.replace("-", "–")));
    tags.appendChild(el("span", "tag", p.t));
    if (p.adult) tags.appendChild(el("span", "tag adult", "є режим 18+"));
    if (q) tags.appendChild(el("span", "tag cat", catName(p.c)));
    s.appendChild(tags);
    s.appendChild(el("div", "desc", p.d));
    lab.appendChild(i); lab.appendChild(s);
    b.appendChild(lab);
  });
}

function goPrompt(id) {
  var p = P.filter(function (x) { return x.id === id; })[0]; if (!p) return;
  S.c = p.c; S.q = ""; $("q").value = "";
  var ci = document.querySelector('#cats input[value="' + p.c + '"]'); if (ci) ci.checked = true;
  list();
  var pi = document.querySelector('#plist input[value="' + id + '"]'); if (pi) pi.checked = true;
  pickPrompt(p);
}

/* ---------- копіювання / відкриття / завантаження ---------- */
function flash(msg) { $("status").textContent = msg; }

function copyText(t, onOk, onFail) {
  function fb() {
    try {
      var a = document.createElement("textarea");
      a.value = t; a.setAttribute("readonly", ""); a.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(a); a.select();
      var r = document.execCommand("copy");
      document.body.removeChild(a);
      r ? onOk() : onFail();
    } catch (e) { onFail(); }
  }
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(onOk, fb); else fb(); }
  catch (e) { fb(); }
}

function selectOut() {
  try { var r = document.createRange(); r.selectNodeContents($("out")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
}

function copyPrompt(where) {
  var t = lastText || $("out").textContent, lab = $("copyLabel"), btn = $("copy");
  copyText(t, function () {
    flash(where
      ? "Промпт скопійовано. У новій вкладці (" + where + ") вставте його: Ctrl+V (⌘V на Mac) і надішліть."
      : "Скопійовано. Вставте промпт у новий чат: Ctrl+V (⌘V на Mac).");
    lab.textContent = "Скопійовано!"; btn.classList.add("done");
    clearTimeout(copyPrompt._t);
    copyPrompt._t = setTimeout(function () { lab.textContent = "Скопіювати промпт"; btn.classList.remove("done"); }, 2500);
  }, function () {
    flash("Автоматично скопіювати не вдалося. Клікніть у рамку з текстом (він виділиться весь) і скопіюйте вручну: Ctrl+C.");
    selectOut();
  });
}

function download() {
  var t = lastText || $("out").textContent;
  var blob = new Blob([t], { type: "text/plain;charset=utf-8" });
  saveBlob(blob, "prompt-" + (S.p ? S.p.id : "english") + ".txt");
  flash("Файл завантажено.");
}
function saveBlob(blob, name) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}

/* ---------- Мої нотатки ---------- */
var NOTE_KEY = "gen-notes", notes = [], memOnly = false;

function loadNotes() {
  try {
    var r = localStorage.getItem(NOTE_KEY);
    notes = r ? JSON.parse(r) : [];
    if (!Array.isArray(notes)) notes = [];
    localStorage.setItem("gen-test", "1"); localStorage.removeItem("gen-test");
  } catch (e) { memOnly = true; if (!Array.isArray(notes)) notes = []; }
}
function saveNotes() {
  try { localStorage.setItem(NOTE_KEY, JSON.stringify(notes)); memOnly = false; } catch (e) { memOnly = true; }
  notesChanged();
}

function detectType(t) {
  if (/MISTAKE NOTEBOOK/i.test(t)) return "notebook";
  if (/MISTAKES TO SAVE/i.test(t)) return "mistakes";
  if (/WORDS TO SAVE/i.test(t)) return "words";
  if (/MY LEVEL SUMMARY/i.test(t)) return "level";
  if (/\bSCENARIO\b/.test(t)) return "scenario";
  return "other";
}
function fmtDate(ts) {
  try { return new Date(ts).toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}
function noteTitle(n) {
  var first = (n.text.split("\n").filter(function (l) { return l.trim() && !/^[A-Z \-:]{6,}$/.test(l.trim()); })[0] || n.text).trim();
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

function addNote(text, type) {
  text = (text || "").replace(/\s+$/, "").replace(/^\s*\n/, "");
  if (!text.trim()) return "empty";
  if (notes.some(function (n) { return n.text === text; })) return "dup";
  notes.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: type || detectType(text), text: text, ts: Date.now() });
  if (notes.length > 300) notes.length = 300;
  saveNotes();
  return "ok";
}

function renderNotes() {
  var box = $("noteList"); box.innerHTML = "";
  $("noteCount").textContent = notes.length;
  $("storageWarn").hidden = !memOnly;
  if (!notes.length) { box.appendChild(el("p", "empty-notes", "Пока що порожньо. Після заняття скопіюйте блок із відповіді ШІ й вставте його вище.")); return; }
  notes.forEach(function (n) {
    var it = el("div", "note-item");
    var top = el("div", "top");
    top.appendChild(el("span", "tag", NOTE_TYPES[n.type] || NOTE_TYPES.other));
    top.appendChild(el("strong", "", noteTitle(n)));
    top.appendChild(el("span", "when", fmtDate(n.ts)));
    it.appendChild(top);
    var pre = el("pre", "", n.text); it.appendChild(pre);
    var act = el("div", "actions");
    var cp = el("button", "ghost", "Копіювати"); cp.type = "button";
    cp.onclick = function () {
      copyText(n.text, function () { cp.textContent = "Скопійовано!"; setTimeout(function () { cp.textContent = "Копіювати"; }, 1800); },
        function () { cp.textContent = "Виділіть вручну"; });
    };
    var del = el("button", "ghost", "Видалити"); del.type = "button";
    del.onclick = function () {
      if (!del._armed) {
        del._armed = true; del.textContent = "Точно видалити?"; del.classList.add("danger");
        setTimeout(function () { if (del.isConnected) { del._armed = false; del.textContent = "Видалити"; del.classList.remove("danger"); } }, 3000);
        return;
      }
      notes = notes.filter(function (x) { return x.id !== n.id; });
      saveNotes();
    };
    act.appendChild(cp); act.appendChild(del);
    it.appendChild(act);
    box.appendChild(it);
  });
}

/* Кнопки «Вставити зі збережених» під полями */
function refreshInserts() {
  insertBoxes.forEach(function (ib) {
    var box = ib.box; box.innerHTML = "";
    var mine = notes.filter(function (n) { return ib.kinds.indexOf(n.type) > -1; }).slice(0, 6);
    if (!mine.length) {
      var t = el("span", "", "Збережених блоків для цього поля поки немає. ");
      var lk = el("button", "link", "Відкрити нотатки"); lk.type = "button"; lk.onclick = openNotes;
      box.appendChild(t); box.appendChild(lk);
      return;
    }
    box.appendChild(el("span", "", "Вставити зі збережених:"));
    var row = el("div", "row");
    mine.forEach(function (n) {
      var c = el("button", "chipbtn", (NOTE_TYPES[n.type] || "") + " · " + fmtDate(n.ts)); c.type = "button";
      c.title = noteTitle(n);
      c.onclick = function () {
        var cur = ib.ta.value.replace(/\s+$/, "");
        ib.ta.value = (cur ? cur + "\n\n" : "") + n.text;
        S.v[ib.idx] = ib.ta.value.trim(); render();
        c.textContent = "Вставлено ✓";
        setTimeout(function () { refreshInserts(); }, 1200);
      };
      row.appendChild(c);
    });
    box.appendChild(row);
  });
}

function notesChanged() {
  var c = $("notesCount");
  c.textContent = notes.length; c.hidden = !notes.length;
  renderNotes(); refreshInserts();
}

var dlg = $("notesDlg");
function openNotes() {
  renderNotes();
  $("noteStatus").textContent = "";
  if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  setTimeout(function () { $("noteText").focus(); }, 30);
}
function closeNotes() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }

function initNotes() {
  loadNotes();
  var sel = $("noteType");
  var auto = el("option", "", "Визначити автоматично"); auto.value = "auto"; sel.appendChild(auto);
  Object.keys(NOTE_TYPES).forEach(function (k) { var o = el("option", "", NOTE_TYPES[k]); o.value = k; sel.appendChild(o); });

  $("notesOpen").onclick = openNotes;
  $("notesOpen2").onclick = openNotes;
  $("notesClose").onclick = closeNotes;
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeNotes(); });

  $("noteAdd").onclick = function () {
    var t = $("noteText").value, ty = sel.value === "auto" ? null : sel.value;
    var r = addNote(t, ty), st = $("noteStatus");
    if (r === "ok") { $("noteText").value = ""; sel.value = "auto"; st.textContent = "Збережено."; }
    else if (r === "dup") st.textContent = "Такий блок уже збережено.";
    else st.textContent = "Спершу вставте текст блока.";
  };

  $("noteExport").onclick = function () {
    var blob = new Blob([JSON.stringify({ app: "english-prompt-generator", version: 1, notes: notes }, null, 2)], { type: "application/json" });
    saveBlob(blob, "my-notes.json");
    $("noteStatus").textContent = "Файл збережено.";
  };
  $("noteImportBtn").onclick = function () { $("noteImport").click(); };
  $("noteImport").onchange = function () {
    var f = this.files && this.files[0]; if (!f) return;
    var rd = new FileReader(), st = $("noteStatus"), inp = this;
    rd.onload = function () {
      try {
        var data = JSON.parse(rd.result), arr = Array.isArray(data) ? data : data.notes, added = 0;
        if (!Array.isArray(arr)) throw new Error("format");
        arr.forEach(function (n) {
          if (!n || typeof n.text !== "string" || !n.text.trim()) return;
          if (notes.some(function (x) { return x.text === n.text; })) return;
          notes.push({ id: String(n.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), type: NOTE_TYPES[n.type] ? n.type : detectType(n.text), text: n.text, ts: +n.ts || Date.now() });
          added++;
        });
        notes.sort(function (a, b) { return b.ts - a.ts; });
        saveNotes();
        st.textContent = "Імпортовано: " + added + " " + plural(added, "нотатка", "нотатки", "нотаток") + ".";
      } catch (e) { st.textContent = "Не вдалося прочитати файл: потрібен JSON, збережений через «Експорт»."; }
      inp.value = "";
    };
    rd.readAsText(f);
  };
  notesChanged();
}

/* ---------- старт ---------- */
function restart() {
  S.c = null; S.p = null; S.lv = null; S.v = []; S.q = ""; S.mode = "OFF";
  $("q").value = ""; shown = {};
  radios($("cats"), "cat", catItems(), null, pickCat);
  radios($("mode"), "mode", MODES, "OFF", function (v) { S.mode = v; reveal(1); render(); });
  $("plist").innerHTML = "";
  reveal(0);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function catItems() {
  return CATS.filter(function (c) { return P.some(function (p) { return p.c === c[0]; }); }).map(function (c) {
    return [c[0], c[1] + " (" + P.filter(function (p) { return p.c === c[0]; }).length + ")"];
  });
}
function pickCat(v) { S.c = v; S.p = null; S.v = []; S.q = ""; $("q").value = ""; list(); reveal(1); }

radios($("cats"), "cat", catItems(), null, pickCat);

var qt;
$("q").oninput = function () {
  var val = this.value.trim();
  clearTimeout(qt);
  qt = setTimeout(function () {
    S.q = val;
    if (val) {
      S.c = null; S.p = null; S.v = [];
      document.querySelectorAll("#cats input").forEach(function (i) { i.checked = false; });
    }
    list(); reveal(0);
  }, 150);
};

var savedLang = store("gen-lang");
if (!LANGS.some(function (l) { return l[0] === savedLang; })) savedLang = "Ukrainian";
S.lang = savedLang;
radios($("lang"), "lang", LANGS, S.lang, function (v) { S.lang = v; store("gen-lang", v); reveal(1); render(); });
radios($("mode"), "mode", MODES, "OFF", function (v) { S.mode = v; reveal(1); render(); });

$("goLevel").onclick = function () { goPrompt("lvl"); };
$("copy").onclick = function () { copyPrompt(); };
["openChatgpt", "openClaude", "openGemini"].forEach(function (id) {
  var a = $(id), name = a.textContent;
  /* Не скасовуємо перехід: посилання відкриється, а промпт тим часом скопіюється */
  a.addEventListener("click", function () { copyPrompt(name); });
});
$("dl").onclick = download;
$("restart").onclick = restart;

/* ---------- тема ---------- */
var sunSvg = '<circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>';
var moonSvg = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
function isLight() {
  var t = document.documentElement.getAttribute("data-theme");
  if (t) return t === "light";
  return !!(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches);
}
function paintTheme() {
  var light = isLight();
  $("themeIcon").innerHTML = light ? moonSvg : sunSvg;
  $("themeToggle").setAttribute("aria-label", light ? "Увімкнути темну тему" : "Увімкнути світлу тему");
  $("themeColor").setAttribute("content", light ? "#f0fdf4" : "#04120e");
}
$("themeToggle").onclick = function () {
  var next = isLight() ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  store("gen-theme", next); paintTheme();
};
paintTheme();

/* ---------- підсвітка під курсором ---------- */
if (window.matchMedia && matchMedia("(hover: hover)").matches) {
  var raf = 0, ev = null;
  document.addEventListener("mousemove", function (e) {
    ev = e; if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var sec = ev.target.closest && ev.target.closest("section");
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      sec.style.setProperty("--mx", (ev.clientX - r.left) + "px");
      sec.style.setProperty("--my", (ev.clientY - r.top) + "px");
    });
  }, { passive: true });
}

initNotes();
reveal(0);
})();
