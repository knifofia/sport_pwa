'use strict';

const LS = { history: 'sport.history', session: 'sport.session' };
const $ = (id) => document.getElementById(id);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let defaultConfig = { appName: 'Sport', accentColor: '#4ade80', restSeconds: 20, weightUnit: 'kg', programs: [] };
let config = defaultConfig;
let tab = 'home';
let session = load(LS.session, null);

async function init() {
  try { defaultConfig = await (await fetch('config.json', { cache: 'no-cache' })).json(); } catch {}
  config = defaultConfig;
  applyConfig();
  await loadData();
  document.querySelectorAll('nav button').forEach((b) => b.onclick = () => go(b.dataset.tab));
  go(session ? 'session' : 'home');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}

function applyConfig() {
  document.documentElement.style.setProperty('--accent', config.accentColor || '#4ade80');
  document.title = config.appName || 'Sport';
}

function go(t) {
  tab = t;
  clearInterval(runTimer);
  document.body.classList.remove('focus', 'resting');
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === (t === 'session' ? 'workouts' : t)));
  ({ home: renderMuscles, workouts: renderWorkouts, session: renderSession, history: renderHistory, progress: renderProgress })[t]();
}

// --- Muscles ---
let musclesData = null;
let scoresData = { criteres: {}, scores: {} };
let exercisesData = [];
let programsData = [];
const label = (k) => { const s = k.replace(/_/g, ' '); return s[0].toUpperCase() + s.slice(1); };

async function loadData() {
  if (musclesData) return true;
  try {
    const get = async (f) => (await fetch(`data/${f}.json`)).json();
    const [m, s, e, p] = await Promise.all([get('muscles'), get('scores'), get('exercices'), get('programmes')]);
    [musclesData, scoresData, exercisesData, programsData] = [m, s, e.exercices, p.programmes];
    return true;
  } catch { musclesData = null; return false; }
}

const exerciseByName = (name) => exercisesData.find((e) => e.nom === name);

// Sollicitation cumulée d'un programme : 1 - produit des (1 - intensité) sur ses exercices
function programLoad(p) {
  const rest = {};
  p.exercices.forEach((n) => Object.entries(exerciseByName(n).muscles).forEach(([m, v]) => { rest[m] = (rest[m] ?? 1) * (1 - v / 100); }));
  return Object.fromEntries(Object.entries(rest).map(([m, r]) => [m, Math.round(100 * (1 - r))]));
}

// Intensité (0-1) par forme du schéma à partir d'un {muscle: 0-100}
function shapeLevels(vals) {
  const level = {};
  Object.entries(vals).forEach(([name, v]) => (MUSCLE_SHAPES[name] || []).forEach((id) => { level[id] = Math.max(level[id] || 0, v / 100); }));
  return level;
}

function paintShapes(els, level) {
  els.forEach((el) => {
    const v = level[el.dataset.s];
    el.classList.toggle('on', v != null);
    if (v != null) el.style.setProperty('--i', (0.25 + 0.75 * v).toFixed(2)); else el.style.removeProperty('--i');
  });
}

// Séance préremplie (séries, reps/durée, charge) à partir d'un programme de data/programmes.yaml
function sessionFromProgram(p, i) {
  return {
    id: `muscu-${i}`, name: p.nom,
    exercises: p.exercices.map((name) => {
      const d = exerciseByName(name).defaut;
      return { name, sets: d.series, reps: d.reps, weight: d.charge, duration: d.duree };
    }),
  };
}

const scoreColor = (v, inverse) => `hsl(${Math.round((inverse ? 100 - v : v) * 1.2)} 70% 45%)`;

function muscleItem(m) {
  const scores = Object.entries(scoresData.criteres).map(([k, c]) => {
    const v = scoresData.scores[m.nom]?.[k];
    return v == null ? '<span class="score">–</span>' : `<span class="score" style="--c:${scoreColor(v, c.inverse)}">${v} %</span>`;
  }).join('');
  return `<li><button class="mitem" data-name="${esc(m.nom)}" data-shapes="${esc((MUSCLE_SHAPES[m.nom] || []).join(' '))}"><span class="mname">${esc(m.nom)}</span>${scores}</button></li>`;
}

const MATERIEL = {
  poids: { icon: '🏋️', label: 'Poids (barre, haltères)' },
  machine: { icon: '⚙️', label: 'Machine / poulie' },
  elastique: { icon: '🪢', label: 'Élastique' },
  corps: { icon: '🤸', label: 'Poids du corps (barre, poutre, banc)' },
  libre: { icon: '🧘', label: 'Sans matériel' },
};

async function renderMuscles() {
  setView('Muscles', '<p class="muted">Chargement…</p>');
  if (!(await loadData())) return setView('Muscles', '<p class="muted">Impossible de charger les fichiers de data/.</p>');
  if (tab !== 'home') return;
  const crits = Object.values(scoresData.criteres);
  const sectors = Object.entries(musclesData.secteurs).map(([sector, groups]) => ({
    sector,
    groups: Object.entries(groups).map(([key, g]) => ({
      key, g,
      lists: g.muscles ? [[null, g.muscles]] : Object.entries(g).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [label(k), v]),
    })),
  }));
  const names = (groups) => groups.flatMap((x) => x.lists.flatMap(([, ms]) => ms.map((m) => m.nom)));
  const unique = (arr) => new Set(arr).size;
  const all = sectors.flatMap((s) => names(s.groups));
  const list = sectors.map(({ sector, groups }) => `
    <h2>${esc(label(sector))} <span class="muted">· ${unique(names(groups))}</span></h2>
    ${groups.map(({ key, g, lists }) => `<div class="mgroup"><h3>${esc(g.nom || label(key))} <span class="muted">· ${names([{ lists }]).length}</span></h3>
      ${lists.map(([t, ms]) => `${t ? `<h4>${esc(t)}</h4>` : ''}<ul>${ms.map(muscleItem).join('')}</ul>`).join('')}
    </div>`).join('')}`).join('');
  const categories = [...new Set(exercisesData.map((e) => e.categorie))];
  const exList = categories.map((cat) => `<div class="mgroup"><h3>${esc(cat)}</h3><ul>${exercisesData.map((e, i) => e.categorie !== cat ? '' :
    `<li><button class="exitem" data-i="${i}"><span class="gear">${(e.materiel || []).map((k) => `<i class="mat ${k}" title="${MATERIEL[k].label}">${MATERIEL[k].icon}</i>`).join('')}</span>${esc(e.nom)}</button></li>`).join('')}</ul></div>`).join('');
  const caption = `${unique(all)} muscles`;
  // Score d'un programme par critère : moyenne des scores des muscles pondérée par leur sollicitation
  const programScores = (p) => {
    const load = programLoad(p);
    const total = Object.values(load).reduce((a, b) => a + b, 0);
    return Object.entries(scoresData.criteres).map(([k, c]) => {
      const v = Math.round(Object.entries(load).reduce((s, [m, l]) => s + l * (scoresData.scores[m]?.[k] ?? 0), 0) / total);
      return `<span class="pscore" title="${esc(c.nom)}" style="--c:${scoreColor(v, c.inverse)}">${esc(c.court || c.nom)} ${v}</span>`;
    }).join('');
  };
  const progList = programsData.map((p, i) => `<button class="pitem" data-p="${i}"><span class="phead"><b>${esc(p.nom)}</b><span class="pscores">${programScores(p)}</span></span><span class="muted">${esc(p.description || "")}</span>
    <ol class="progex">${p.exercices.map((n) => `<li>${esc(n)}</li>`).join('')}</ol></button>`).join('');
  setView('Muscles', `<div class="anat">
    <div class="mcell"><div class="mhead">${crits.map((c) => `<span class="score" title="${esc(c.description || '')}">${esc(c.court || c.nom)}</span>`).join('')}</div>
      <div class="mlist">${list}</div></div>
    <div class="figure"><div class="figmain">${bodySvg()}<div class="muted total">${caption}</div></div></div>
    <div class="exlist"><h2>Exercices</h2><div class="legend">${Object.entries(MATERIEL).map(([k, m]) => `<span><i class="mat ${k}">${m.icon}</i> ${m.label.split(' (')[0]}</span>`).join('')}</div>${exList}</div>
    <aside class="prog"><h2>Programmes de muscu</h2>${progList}</aside></div>`);

  let selMuscle = null, selEx = null, selProg = null, hover = null;
  const shapeEls = document.querySelectorAll('.body .m');
  const rows = document.querySelectorAll('.mitem');
  const exBtns = document.querySelectorAll('.exitem');
  const progBtns = document.querySelectorAll('.pitem');
  const paint = () => {
    const m = hover || selMuscle;
    const ex = m || selEx == null ? null : exercisesData[selEx];
    const prog = m || selProg == null ? null : programsData[selProg];
    const vals = ex ? ex.muscles : prog ? programLoad(prog) : null; // muscle -> 0-100
    const level = vals ? shapeLevels(vals) : {};
    if (m) m.dataset.shapes.split(' ').filter(Boolean).forEach((id) => { level[id] = 1; });
    paintShapes(shapeEls, level);
    rows.forEach((r) => {
      const v = vals ? vals[r.dataset.name] : null;
      r.classList.toggle('hit', v != null);
      r.classList.toggle('dim', vals && v == null);
      r.style.setProperty('--i', v != null ? v / 100 : 0);
      r.querySelector('.tag')?.remove();
      if (v != null) r.querySelector('.mname').insertAdjacentHTML('afterend', `<span class="tag">${v} %</span>`);
    });
    const inProg = prog ? new Set(prog.exercices) : null;
    exBtns.forEach((b) => {
      b.classList.toggle('sel', selEx === Number(b.dataset.i));
      b.classList.toggle('inprog', !!inProg?.has(exercisesData[b.dataset.i].nom));
    });
    progBtns.forEach((b) => b.classList.toggle('sel', selProg === Number(b.dataset.p)));
    selMuscle?.classList.add('sel');
    document.querySelector('.total').textContent = m ? m.dataset.name : ex ? ex.nom : prog ? `${prog.nom} · sollicitation totale` : caption;
  };
  rows.forEach((b) => {
    b.onmouseenter = () => { hover = b; paint(); };
    b.onmouseleave = () => { hover = null; paint(); };
    b.onclick = () => {
      selMuscle?.classList.remove('sel');
      selMuscle = selMuscle === b ? null : b;
      selEx = selProg = null;
      paint();
    };
  });
  exBtns.forEach((b) => b.onclick = () => {
    selEx = selEx === Number(b.dataset.i) ? null : Number(b.dataset.i);
    selProg = null;
    selMuscle?.classList.remove('sel');
    selMuscle = null;
    paint();
  });
  progBtns.forEach((b) => b.onclick = () => {
    selProg = selProg === Number(b.dataset.p) ? null : Number(b.dataset.p);
    selEx = null;
    selMuscle?.classList.remove('sel');
    selMuscle = null;
    paint();
  });
  progBtns.forEach((b) => b.ondblclick = () => {
    if (session && !confirm('Une séance est en cours. La remplacer ?')) return;
    beginSession(sessionFromProgram(programsData[b.dataset.p], b.dataset.p));
  });
}

function setView(title, html) { document.title = title; $('view').innerHTML = html; }

// --- Séances ---
function renderWorkouts() {
  if (session) return go('session');
  const cards = config.programs.map((p) => `
    <div class="card">
      <h3>${esc(p.name)}</h3>
      <div class="muted">${p.exercises.map((e) => esc(e.name)).join(' · ')}</div>
      <div class="actions"><button class="primary" data-start="${esc(p.id)}">Démarrer</button></div>
    </div>`).join('');
  setView(config.appName || 'Sport', cards || '<p class="muted">Aucun programme dans config.json.</p>');
  document.querySelectorAll('[data-start]').forEach((b) => b.onclick = () => startSession(b.dataset.start));
}

function startSession(id) {
  beginSession(config.programs.find((x) => x.id === id));
}

function beginSession(p) {
  session = {
    programId: p.id, name: p.name, start: Date.now(),
    restSeconds: p.restSeconds || config.restSeconds || 20,
    phase: 'run', cur: { i: 0, j: 0 }, rest: null, work: null, exStart: Date.now(),
    exercises: p.exercises.map((e) => ({
      name: e.name,
      sets: Array.from({ length: e.sets || 3 }, () => ({ weight: e.weight ?? 0, reps: e.duration ? null : e.reps ?? 10, duration: e.duration ?? null, done: false })),
    })),
  };
  save(LS.session, session);
  go('session');
}

const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
const fmtSet = (s, unit) => `${s.duration != null ? `${s.duration} s` : `${s.reps} reps`}${s.weight ? ` × ${s.weight} ${unit}` : ''}`;
const fmtResult = (s) => s.duration != null ? `${s.duration}s${s.weight ? `×${s.weight}` : ''}` : `${s.weight}×${s.reps}`;
const fmtDay = (t) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(t);

// Dernière performance enregistrée d'un exercice (l'historique est du plus récent au plus ancien)
function lastPerf(name) {
  for (const h of load(LS.history, [])) {
    const done = h.exercises.find((e) => e.name === name)?.sets.filter((s) => s.done);
    if (done?.length) return `Dernière fois (${fmtDay(h.start)}) : ${done.map(fmtResult).join(' · ')}`;
  }
  return '';
}
const saveSession = () => save(LS.session, session);

// Durée réelle moyenne d'une répétition d'un exercice, apprise des séances passées
let sprCache = {};
function secPerRep(name) {
  if (name in sprCache) return sprCache[name];
  const vals = [];
  for (const h of load(LS.history, [])) {
    const sets = h.exercises.find((e) => e.name === name)?.sets.filter((s) => s.done && s.reps && s.temps) || [];
    sets.forEach((s) => vals.push(s.temps / s.reps));
    if (vals.length >= 6) break;
  }
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return (sprCache[name] = avg && avg >= 1 && avg <= 20 ? avg : null);
}
const estSet = (name, s) => s.duration ?? Math.round((s.reps || 10) * (secPerRep(name) ?? 4));

// Prochaine série non faite après la position {i, j}
function nextPos({ i, j }) {
  for (let a = i, b = j + 1; a < session.exercises.length; a++, b = 0) {
    for (; b < session.exercises[a].sets.length; b++) if (!session.exercises[a].sets[b].done) return { i: a, j: b };
  }
  return null;
}

function renderSession() {
  if (!session) return go('workouts');
  document.body.classList.toggle('resting', session.phase === 'run' && !!session.rest);
  return session.phase === 'run' ? renderRun() : renderReview();
}

// --- Écran de séance guidée ---
let runTimer = null;

// Durée prévue de la séance : efforts (durée, ou ~4 s par répétition) + pauses entre les séries
function gaugeModel() {
  const items = session.exercises.flatMap((e, i) => e.sets.map((s, j) => ({ i, j, w: estSet(e.name, s), r: session.restSeconds })));
  items[items.length - 1].r = 0;
  const idx = items.findIndex((x) => x.i === session.cur.i && x.j === session.cur.j);
  const inRest = !!session.rest;
  const left = inRest ? Math.ceil((session.rest.end - Date.now()) / 1000) : 0;
  const segs = session.exercises.map(() => ({ T: 0, done: 0, off: 0, rests: [] }));
  items.forEach((x) => { segs[x.i].T += x.w + x.r; });
  items.forEach((x, k) => {
    const sg = segs[x.i];
    if (k < idx) sg.done += x.w;
    if (k < idx - (inRest ? 1 : 0)) sg.done += x.r;
    else if (inRest && k === idx - 1) sg.done += Math.min(x.r, Math.max(0, x.r - left));
    if (x.r) sg.rests.push([100 * (sg.off + x.w) / sg.T, 100 * x.r / sg.T]);
    sg.off += x.w + x.r;
  });
  const T = segs.reduce((a, s) => a + s.T, 0);
  return { pct: Math.round(100 * segs.reduce((a, s) => a + s.done, 0) / T), segs, restTotal: items.reduce((a, x) => a + x.r, 0) };
}
function renderRun() {
  document.body.classList.add('focus');
  const unit = esc(config.weightUnit || 'kg');
  const { i, j } = session.cur;
  const ex = session.exercises[i], s = ex.sets[j];
  const pct = (a, b) => Math.round(100 * a / b);
  const exDone = ex.sets.filter((x) => x.done).length;
  const stepper = (f, v, label) => `<div class="step"><button data-f="${f}" data-d="-1">−</button><span><b>${v}</b> ${label}</span><button data-f="${f}" data-d="1">+</button></div>`;
  let controls;
  if (session.rest) {
    controls = `<div class="rest-label">😮‍💨 Repos · prochaine série ${j + 1}/${ex.sets.length}</div><div class="clock rest" id="clock"></div>
      <div class="actions"><button id="r-minus">−15 s</button><button id="r-plus">+15 s</button></div>`;
  } else {
    if (!session.work) { session.work = { start: Date.now() }; saveSession(); }
    controls = `<div class="clockrow"><div class="clock" id="clock" data-est="${estSet(ex.name, s)}"></div><div class="est">/ ~${fmtTime(estSet(ex.name, s))}</div></div>
      <div class="actions"><button class="primary big-btn" id="s-done">Série faite ✓</button></div>`;
  }
  const g = gaugeModel();
  const exData = exerciseByName(ex.name);
  const topList = exData ? Object.entries(exData.muscles).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m, v]) => `<li><b>${v} %</b> ${esc(m)}</li>`).join('') : '';
  const figure = exData ? `<div class="run-fig">${bodySvg()}<ul class="stats">${topList}</ul></div>` : '';
  const segs = g.segs.map((sg, k) => `<button class="seg ${k === i ? 'cur' : ''}" data-k="${k}" style="flex:${sg.T}" title="${esc(session.exercises[k].name)}">
    ${sg.rests.map(([a, w]) => `<b style="left:${a}%;width:${w}%"></b>`).join('')}<div style="width:${pct(sg.done, sg.T)}%"></div>
    <span>${esc(session.exercises[k].name)} ${session.exercises[k].sets.filter((x) => x.done).length}/${session.exercises[k].sets.length}</span></button>`).join('');
  const setMarks = Array.from({ length: ex.sets.length - 1 }, (_, k) => `<i style="left:${pct(k + 1, ex.sets.length)}%"></i>`).join('');
  setView(session.name, `<div class="run">
    <div class="gauges">
      <div class="segs">${segs}</div>
      <div class="gauge ex"><div style="width:${pct(exDone, ex.sets.length)}%"></div>${setMarks}
        <span>Exercice ${i + 1}/${session.exercises.length} · ${exDone}/${ex.sets.length} séries<b id="g-rest"></b></span></div>
    </div>
    <h2 class="run-title">${esc(ex.name)}</h2>
    ${figure}
    <div class="run-main">
      <div class="steppers">${stepper("weight", s.weight, unit)}${s.duration != null ? stepper("duration", s.duration, "s") : stepper("reps", s.reps, "rép")}</div>
      <div class="muted last">${esc(lastPerf(ex.name))}</div>
      ${controls}</div>
    ${session.rest ? "" : `<div class="actions"><button id="skipset">Série suivante ⏭</button></div>`}
    <div class="run-foot">
      <div class="actions sm"><button id="skip">Exercice suivant ⏭</button></div>
      <button class="stop" id="end">S'arrêter là</button>
      <div class="run-top"><span>${esc(session.name)} · ⏱ <b id="elapsed"></b> · exo ⏱ <b id="exelapsed"></b> · <span id="g-pct">${g.pct}</span> % · pauses ${fmtTime(g.restTotal)}</span><button id="quit" aria-label="Abandonner">✕</button></div>
    </div></div>`);
  if (exData) paintShapes(document.querySelectorAll('.body .m'), shapeLevels(exData.muscles));
  document.querySelectorAll('.seg').forEach((b) => b.onclick = () => {
    const k = Number(b.dataset.k), first = session.exercises[k].sets.findIndex((x) => !x.done);
    advance({ i: k, j: Math.max(0, first) });
  });
  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  const STEP = { weight: 2.5, reps: 1, duration: 5 };
  document.querySelectorAll('.step button').forEach((b) => b.onclick = () => {
    const f = b.dataset.f;
    s[f] = Math.max(f === 'weight' ? 0 : 1, Math.round((s[f] + STEP[f] * Number(b.dataset.d)) * 100) / 100);
    saveSession(); renderRun();
  });
  bind('s-done', () => {
    const t = Math.max(1, Math.round((Date.now() - session.work.start) / 1000));
    completeSet(s.duration != null ? t : null, t);
  });

  bind('r-minus', () => { session.rest.end -= 15000; saveSession(); });
  bind('r-plus', () => { session.rest.end += 15000; saveSession(); });
  if (!session.rest) bind('skipset', () => advance(nextPos({ i, j }), true));
  bind('skip', () => advance(nextPos({ i, j: ex.sets.length }), true));
  bind('end', () => { if (confirm('Arrêter la séance ici et passer au bilan ?')) advance(null); });
  bind('quit', () => { if (confirm('Abandonner la séance ?')) endSession(false); });
  clearInterval(runTimer);
  runTimer = setInterval(tickRun, 250);
  tickRun();
}

function tickRun() {
  if (!session || session.phase !== 'run') return clearInterval(runTimer);
  $('elapsed').textContent = fmtTime(Math.floor((Date.now() - session.start) / 1000));
  $('exelapsed').textContent = fmtTime(Math.floor((Date.now() - (session.exStart || session.start)) / 1000));
  const clock = $('clock');
  $('g-rest').textContent = session.rest ? ` · repos ${fmtTime(Math.max(0, Math.ceil((session.rest.end - Date.now()) / 1000)))}` : '';
  if (session.rest) {
    const left = Math.ceil((session.rest.end - Date.now()) / 1000);
    if (left <= 0) { navigator.vibrate?.([200, 100, 200]); return endRest(); }
    clock.textContent = fmtTime(left);
    const g = gaugeModel();
    document.querySelectorAll('.seg > div').forEach((el, k) => { el.style.width = `${Math.round(100 * g.segs[k].done / g.segs[k].T)}%`; });
    $('g-pct').textContent = g.pct;
  } else if (session.work && clock) {
    const sec = Math.floor((Date.now() - session.work.start) / 1000);
    clock.textContent = fmtTime(sec);
    clock.classList.toggle('over', sec > Number(clock.dataset.est));
  }
}

function closeRest() {
  if (session.rest) session.restDone = (session.restDone || 0) + Math.max(0, Math.round((Math.min(Date.now(), session.rest.end) - (session.rest.start || session.rest.end)) / 1000));
}

function endRest() {
  closeRest();
  session.rest = null;
  const { i, j } = session.cur;
  if (session.exercises[i].sets[j].duration != null) session.work = { start: Date.now() };
  saveSession(); renderSession();
}

function completeSet(duration, temps) {
  const s = session.exercises[session.cur.i].sets[session.cur.j];
  s.done = true;
  if (duration != null) s.duration = duration;
  if (temps != null) s.temps = temps;
  session.work = null;
  advance(nextPos(session.cur), true);
}

// pos = prochaine série, ou null pour passer au bilan
function advance(pos, withRest) {
  closeRest();
  session.work = null;
  if (!pos) {
    session.phase = 'review';
    session.rest = null;
    session.minutes = Math.max(1, Math.round((Date.now() - session.start) / 60000));
  } else {
    if (pos.i !== session.cur.i) session.exStart = Date.now();
    session.cur = pos;
    session.rest = withRest ? { start: Date.now(), end: Date.now() + session.restSeconds * 1000 } : null;
  }
  saveSession();
  renderSession();
}

// --- Bilan de fin de séance : ajustement des valeurs réellement effectuées ---
function renderReview() {
  document.body.classList.remove('focus');
  const unit = esc(config.weightUnit || 'kg');
  const input = (i, j, f, v, mode) => `<input type="number" inputmode="${mode}" step="any" value="${v}" data-i="${i}" data-j="${j}" data-f="${f}">`;
  const html = session.exercises.map((ex, i) => `
    <div class="card"><h3>${esc(ex.name)}</h3>
      ${ex.sets.map((s, j) => `
        <div class="row ${s.done ? 'checked' : ''}">
          <span class="n">${j + 1}</span>
          ${input(i, j, 'weight', s.weight, 'decimal')}<span class="muted">${unit}</span>
          ${s.duration != null ? `${input(i, j, 'duration', s.duration, 'numeric')}<span class="muted">s</span>` : `${input(i, j, 'reps', s.reps, 'numeric')}<span class="muted">reps</span>`}
          <button class="done" data-i="${i}" data-j="${j}" aria-label="Effectuée">✓</button>
        </div>`).join('')}
    </div>`).join('');
  setView(`Bilan · ${session.name}`, `
    <div class="card"><h3>Durée de la séance</h3>
      <div class="row"><input type="number" inputmode="numeric" id="minutes" value="${session.minutes ?? Math.max(1, Math.round((Date.now() - session.start) / 60000))}"><span class="muted">min</span></div></div>
    <p class="muted">Ajuste les charges, répétitions et temps réellement effectués. Les séries non cochées ne sont pas enregistrées.</p>
    ${html}
    <div class="actions">
      <button class="danger" id="cancel">Annuler</button>
      <button class="primary" id="finish">Enregistrer</button>
    </div>`);
  $('minutes').onchange = () => { session.minutes = Math.max(1, Number($('minutes').value) || 1); saveSession(); };
  document.querySelectorAll('#view .row input[data-f]').forEach((inp) => inp.onchange = () => {
    session.exercises[inp.dataset.i].sets[inp.dataset.j][inp.dataset.f] = Number(inp.value) || 0;
    saveSession();
  });
  document.querySelectorAll('#view button.done').forEach((b) => b.onclick = () => {
    const s = session.exercises[b.dataset.i].sets[b.dataset.j];
    s.done = !s.done;
    saveSession();
    b.parentElement.classList.toggle('checked', s.done);
  });
  $('cancel').onclick = () => { if (confirm('Annuler la séance ?')) endSession(false); };
  $('finish').onclick = () => endSession(true);
}

function buildFile(rec) {
  const unit = config.weightUnit || 'kg';
  const data = {
    seance: rec.name,
    debut: new Date(rec.start).toISOString(),
    fin: new Date(rec.end).toISOString(),
    duree_minutes: Math.round((rec.end - rec.start) / 60000),
    unite_poids: unit,
    repos_prevu_secondes: rec.restSeconds,
    repos_reel_secondes: rec.restDone || 0,
    exercices: rec.exercises.map((e) => ({
      nom: e.name,
      series: e.sets.map((s, n) => ({
        numero: n + 1, fait: s.done, poids: s.weight, repetitions: s.reps ?? null, duree_secondes: s.duration ?? null, temps_reel_secondes: s.temps ?? s.duration ?? null,
      })),
    })),
  };
  const d = new Date(rec.start), p = (n) => String(n).padStart(2, '0');
  const slug = rec.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return { filename: `seance-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}h${p(d.getMinutes())}-${slug}.json`, data };
}

const fileKey = (start) => `sport.file.${start}`;

function downloadFile({ filename, data }) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function endSession(keep) {
  if (keep) {
    const history = load(LS.history, []);
    const { phase, cur, rest, work, exStart, minutes, ...rec } = session;
    const full = { ...rec, end: session.start + (minutes ?? 1) * 60000 };
    history.unshift(full);
    save(fileKey(full.start), buildFile(full));
    sprCache = {};
    save(LS.history, history);
  }
  session = null;
  localStorage.removeItem(LS.session);
  clearInterval(runTimer);
  go(keep ? 'history' : 'workouts');
}

// --- Progression ---
// Valeur suivie d'un exercice par séance : durée max, sinon charge max, sinon répétitions max
function progressSeries(name) {
  const sessions = load(LS.history, []).slice().reverse().map((h) => ({
    start: h.start, sets: h.exercises.find((e) => e.name === name)?.sets.filter((s) => s.done) || [],
  })).filter((x) => x.sets.length);
  if (!sessions.length) return null;
  const last = sessions[sessions.length - 1].sets;
  const kind = last.some((s) => s.duration != null) ? 'duration' : last.some((s) => s.weight > 0) ? 'weight' : 'reps';
  const unit = { duration: 's', weight: config.weightUnit || 'kg', reps: 'rép' }[kind];
  return { kind, unit, points: sessions.map((x) => ({ t: x.start, v: Math.max(...x.sets.map((s) => s[kind] ?? 0)) })) };
}

function sparkline(points) {
  const W = 120, H = 40, vs = points.map((p) => p.v), min = Math.min(...vs), max = Math.max(...vs);
  const xy = points.map((p, k) => [points.length > 1 ? 4 + k * (W - 8) / (points.length - 1) : W / 2, max === min ? H / 2 : H - 4 - (p.v - min) * (H - 8) / (max - min)]);
  const [lx, ly] = xy[xy.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}"><polyline points="${xy.map((c) => c.join(',')).join(' ')}"/><circle cx="${lx}" cy="${ly}" r="3.5"/></svg>`;
}

function renderProgress() {
  const names = [...new Set(load(LS.history, []).flatMap((h) => h.exercises.filter((e) => e.sets.some((s) => s.done)).map((e) => e.name)))];
  const cards = names.map((name) => {
    const p = progressSeries(name), first = p.points[0].v, last = p.points[p.points.length - 1].v, d = Math.round((last - first) * 100) / 100;
    const spr = secPerRep(name);
    return `<div class="card prog-card"><div><h3>${esc(name)}</h3>
      <div><b>${last} ${esc(p.unit)}</b> <span class="${d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}">${d > 0 ? '▲ +' : d < 0 ? '▼ ' : '= '}${d} ${esc(p.unit)}</span></div>
      <div class="muted">${p.points.length} séance${p.points.length > 1 ? 's' : ''} · depuis le ${fmtDay(p.points[0].t)}${spr ? ` · ~${spr.toFixed(1).replace('.', ',')} s/rép` : ''}</div></div>${sparkline(p.points)}</div>`;
  }).join('');
  setView('Progression', cards || '<p class="muted">Termine une séance pour voir ta progression.</p>');
}

// --- Historique ---
function renderHistory() {
  const history = load(LS.history, []);
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const html = history.map((h, idx) => {
    const lines = h.exercises.map((ex) => {
      const done = ex.sets.filter((s) => s.done);
      return done.length ? `<div><b>${esc(ex.name)}</b> <span class="muted">${done.map(fmtResult).join(', ')}</span></div>` : '';
    }).join('');
    const min = Math.round((h.end - h.start) / 60000);
    return `<div class="card"><h3>${esc(h.name)} <span class="muted">· ${fmt.format(h.start)} · ${min} min</span></h3>${lines}
      <div class="actions"><button data-dl="${idx}">Télécharger</button><button class="danger" data-del="${idx}">Supprimer</button></div></div>`;
  }).join('');
  setView('Historique', html || '<p class="muted">Aucune séance enregistrée.</p>');
  document.querySelectorAll('[data-dl]').forEach((b) => b.onclick = () => {
    const h = history[Number(b.dataset.dl)];
    downloadFile(load(fileKey(h.start), null) || buildFile(h));
  });
  document.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
    if (!confirm('Supprimer cette séance ?')) return;
    localStorage.removeItem(fileKey(history[Number(b.dataset.del)].start));
    history.splice(Number(b.dataset.del), 1);
    save(LS.history, history);
    renderHistory();
  });
}

init();
