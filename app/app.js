/* Leonida Ledger — trophy tracker logic.
   Plain classic script, no imports, no network beyond the three local
   data files sitting beside this page. Everything else lives in
   localStorage under one key. */
(function () {
  'use strict';

  var STORAGE_KEY = 'leonida-ledger/v1';
  var POINTS = { bronze: 15, silver: 30, gold: 90, platinum: 300 };
  var GRADES = ['platinum', 'gold', 'silver', 'bronze'];
  var KINDS = ['story', 'missable', 'collectibles', 'activities', 'world', 'capstone'];
  var KIND_LABELS = {
    story: 'Story',
    missable: 'Missable',
    collectibles: 'Collectibles',
    activities: 'Activities',
    world: 'World & feats',
    capstone: 'Capstone'
  };

  /* The road to the platinum, in the order a first playthrough should
     meet it. Guide files assign each trophy a stage; trophies without a
     guide entry fall back to a grade-based guess (see fallbackStage). */
  var STAGES = [
    { n: 1, title: 'Arrival in Leonida', blurb: 'The opening mission and Chapter 1 — learn the city, start the story.' },
    { n: 2, title: 'Early chapters', blurb: 'Chapters 2 and 3. Keep a rotating save: the missables start mattering here.' },
    { n: 3, title: 'Mid chapters', blurb: 'Chapter 4 and the named story missions that carry the middle of the game.' },
    { n: 4, title: 'Endgame', blurb: 'The final mission — and the long road to 100% completion it unlocks.' },
    { n: 5, title: 'Stranger strands', blurb: 'Final missions for the people of Leonida: Andy, Kenton, Billy, Randy, Tyrone and the rest.' },
    { n: 6, title: 'Activities & challenges', blurb: 'Races, stunts, the shooting range, fishing, arcade cabinets and the challenge count.' },
    { n: 7, title: 'Collectibles & the map', blurb: 'Card sets, WAiNK spots, meditation points, vehicles and every corner of the state.' },
    { n: 8, title: 'Feats, fortune & the platinum', blurb: 'Robberies, money targets and one-off feats — then the platinum itself.' }
  ];

  function fallbackStage(grade) {
    if (grade === 'platinum') return 8;
    if (grade === 'gold') return 4;
    if (grade === 'silver') return 7;
    return 6;
  }

  /* ---------- state ---------- */

  var state = {
    earned: {},          // id (number) -> true
    spoilers: true,      // hide story spoilers until earned
    search: '',
    kind: 'all',
    grade: 'all',
    status: 'all'
  };
  var openGuides = {};   // id -> true while its guide panel is open
  var revealed = {};     // id -> true once the reader un-blurs a story card

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (saved.earned && typeof saved.earned === 'object') {
          Object.keys(saved.earned).forEach(function (k) {
            var id = Number(k);
            if (saved.earned[k] && knownIds[id]) state.earned[id] = true;
          });
        }
        if (typeof saved.spoilers === 'boolean') state.spoilers = saved.spoilers;
        if (typeof saved.search === 'string') state.search = saved.search;
        if (saved.kind === 'all' || KINDS.indexOf(saved.kind) >= 0) {
          state.kind = saved.kind;
        }
        if (saved.grade === 'all' || GRADES.indexOf(saved.grade) >= 0) {
          state.grade = saved.grade;
        }
        if (['all', 'earned', 'unearned'].indexOf(saved.status) >= 0) {
          state.status = saved.status;
        }
        if (saved.openGuides && typeof saved.openGuides === 'object') {
          Object.keys(saved.openGuides).forEach(function (k) {
            var id = Number(k);
            if (saved.openGuides[k] && knownIds[id]) openGuides[id] = true;
          });
        }
      }
    } catch (err) { /* a corrupt save must never break the guide */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        earned: state.earned,
        spoilers: state.spoilers,
        search: state.search,
        kind: state.kind,
        grade: state.grade,
        status: state.status,
        openGuides: openGuides
      }));
    } catch (err) { /* storage full/blocked: the session still works */ }
  }

  /* ---------- data ---------- */

  var trophies = [];     // raw rows from data/trophies.json
  var knownIds = {};     // id -> true
  var guides = {};       // id -> guide entry merged from both guide files

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error(url + ': ' + res.status);
      return res.json();
    });
  }

  function mergeGuides(obj) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (k) {
      var id = Number(k);
      if (id && obj[k] && typeof obj[k] === 'object') guides[id] = obj[k];
    });
  }

  /* The effective record for one trophy: guide entry where one exists,
     official data everywhere else. */
  function entryFor(t) {
    var g = guides[t.id] || null;
    var kind = g && KINDS.indexOf(g.kind) >= 0 ? g.kind : 'activities';
    var stage = g && Number(g.stage) >= 1 && Number(g.stage) <= 8
      ? Number(g.stage) : fallbackStage(t.grade);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      grade: t.grade,
      kind: kind,
      stage: stage,
      missable: !!(g && g.missable),
      guide: g && g.guide ? String(g.guide) : t.description,
      sources: g && Array.isArray(g.sources) && g.sources.length
        ? g.sources : ['PlayStation trophy list']
    };
  }

  /* ---------- tiny DOM helpers ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function byId(id) { return document.getElementById(id); }

  /* ---------- rendering ---------- */

  function renderSummary(entries) {
    var earnedCount = 0, points = 0;
    var perGrade = {};
    GRADES.forEach(function (g) { perGrade[g] = { earned: 0, total: 0 }; });
    entries.forEach(function (e) {
      perGrade[e.grade].total += 1;
      if (state.earned[e.id]) {
        earnedCount += 1;
        points += POINTS[e.grade] || 0;
        perGrade[e.grade].earned += 1;
      }
    });

    var total = entries.length;
    var pct = total ? Math.round((earnedCount / total) * 100) : 0;
    var text = earnedCount + ' of ' + total + ' trophies earned (' + pct + '%) · ' +
      points + ' trophy points';
    var next = nextUp(entries);
    if (next) text += '. Next up: ' + next.name + '.';
    else if (total && earnedCount === total) text += '. Leonida is yours — platinum earned.';
    byId('progress-text').textContent = text;

    var fill = byId('progress-fill');
    fill.style.width = pct + '%';
    var track = fill.parentElement;
    if (track) track.setAttribute('aria-valuenow', String(earnedCount));

    var list = byId('grade-summary');
    list.innerHTML = '';
    GRADES.forEach(function (g) {
      var label = g.charAt(0).toUpperCase() + g.slice(1);
      list.appendChild(el('li', null,
        label + ' ' + perGrade[g].earned + ' / ' + perGrade[g].total));
    });
  }

  function nextUp(entries) {
    var best = null;
    entries.forEach(function (e) {
      if (state.earned[e.id]) return;
      if (!best || e.stage < best.stage ||
          (e.stage === best.stage && e.id < best.id)) best = e;
    });
    return best;
  }

  function renderRoadmap(entries) {
    var host = byId('roadmap-stages');
    host.innerHTML = '';
    STAGES.forEach(function (stage) {
      var mine = entries.filter(function (e) { return e.stage === stage.n; });
      var done = mine.filter(function (e) { return state.earned[e.id]; }).length;
      var li = el('li');
      li.appendChild(el('h3', null, stage.title));
      var note = stage.blurb + ' — ' + done + ' of ' + mine.length + ' earned.';
      li.appendChild(el('p', null, note));
      host.appendChild(li);
    });
  }

  function chip(label, value, current, onPick) {
    var b = el('button', 'chip' + (current === value ? ' active' : ''), label);
    b.type = 'button';
    b.setAttribute('aria-pressed', current === value ? 'true' : 'false');
    b.addEventListener('click', function () { onPick(value); });
    return b;
  }

  function renderFilters() {
    var kindHost = byId('kind-filters');
    kindHost.innerHTML = '';
    kindHost.appendChild(chip('All kinds', 'all', state.kind, function (v) {
      state.kind = v; saveState(); refresh();
    }));
    KINDS.forEach(function (k) {
      kindHost.appendChild(chip(KIND_LABELS[k], k, state.kind, function (v) {
        state.kind = v; saveState(); refresh();
      }));
    });

    var gradeHost = byId('grade-filters');
    gradeHost.innerHTML = '';
    gradeHost.appendChild(chip('All grades', 'all', state.grade, function (v) {
      state.grade = v; saveState(); refresh();
    }));
    GRADES.forEach(function (g) {
      var label = g.charAt(0).toUpperCase() + g.slice(1);
      gradeHost.appendChild(chip(label, g, state.grade, function (v) {
        state.grade = v; saveState(); refresh();
      }));
    });

    var statusHost = byId('status-filters');
    statusHost.innerHTML = '';
    [['all', 'All'], ['earned', 'Earned'], ['unearned', 'Not yet']].forEach(function (pair) {
      statusHost.appendChild(chip(pair[1], pair[0], state.status, function (v) {
        state.status = v; saveState(); refresh();
      }));
    });
  }

  function matches(e) {
    if (state.kind !== 'all' && e.kind !== state.kind) return false;
    if (state.grade !== 'all' && e.grade !== state.grade) return false;
    if (state.status === 'earned' && !state.earned[e.id]) return false;
    if (state.status === 'unearned' && state.earned[e.id]) return false;
    if (state.search) {
      var hay = (e.name + ' ' + e.description + ' ' + e.guide).toLowerCase();
      if (hay.indexOf(state.search) < 0) return false;
    }
    return true;
  }

  function renderList(entries) {
    var host = byId('trophy-list');
    host.innerHTML = '';
    var visible = entries.filter(matches);
    visible.sort(function (a, b) {
      return a.stage - b.stage || a.id - b.id;
    });

    visible.forEach(function (e) { host.appendChild(cardFor(e)); });

    byId('result-count').textContent =
      'Showing ' + visible.length + ' of ' + entries.length + ' trophies.';
    byId('empty-message').hidden = visible.length > 0;
  }

  function cardFor(e) {
    var earned = !!state.earned[e.id];
    var card = el('li', 'trophy-card' +
      (earned ? ' earned' : '') +
      (e.kind === 'story' ? ' is-story' : ''));

    var head = el('div', 'trophy-head');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'earned-toggle';
    box.checked = earned;
    box.setAttribute('aria-label', 'Mark ' + e.name + ' as earned');
    box.addEventListener('change', function () {
      if (box.checked) state.earned[e.id] = true;
      else delete state.earned[e.id];
      saveState();
      refresh();
    });
    head.appendChild(box);
    head.appendChild(el('h3', 'trophy-name', e.name));
    var pill = el('span', 'grade-pill grade-' + e.grade,
      e.grade.charAt(0).toUpperCase() + e.grade.slice(1));
    head.appendChild(pill);
    card.appendChild(head);

    var desc = el('p', 'trophy-description', e.description);
    card.appendChild(desc);

    var meta = el('div', 'trophy-meta');
    meta.appendChild(el('span', 'kind-tag', KIND_LABELS[e.kind]));
    meta.appendChild(el('span', 'kind-tag',
      'Stage ' + e.stage + ' · ' + STAGES[e.stage - 1].title));
    if (e.missable) {
      meta.appendChild(el('span', 'missable-flag', 'Missable — plan ahead'));
    }
    card.appendChild(meta);

    var guide = el('div', 'trophy-guide');
    guide.hidden = !openGuides[e.id];
    guide.appendChild(el('p', null, e.guide));
    guide.appendChild(el('p', 'guide-sources',
      'Sources: ' + e.sources.join(' · ')));
    card.appendChild(guide);

    var toggle = el('button', 'guide-toggle',
      openGuides[e.id] ? 'Hide guide' : 'Show guide');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', openGuides[e.id] ? 'true' : 'false');
    toggle.addEventListener('click', function () {
      openGuides[e.id] = !openGuides[e.id];
      saveState();
      guide.hidden = !openGuides[e.id];
      toggle.textContent = openGuides[e.id] ? 'Hide guide' : 'Show guide';
      toggle.setAttribute('aria-expanded', openGuides[e.id] ? 'true' : 'false');
    });
    card.appendChild(toggle);

    /* Per-card spoiler override: while protection is on, an unearned
       story card is blurred by CSS; this button lifts the blur on this
       card only (inline filter beats the stylesheet rule). */
    if (state.spoilers && e.kind === 'story' && !earned && !revealed[e.id]) {
      var reveal = el('button', 'guide-toggle', 'Reveal spoilers for this trophy');
      reveal.type = 'button';
      reveal.addEventListener('click', function () {
        revealed[e.id] = true;
        [card.querySelector('.trophy-name'),
         card.querySelector('.trophy-description'),
         card.querySelector('.trophy-guide')].forEach(function (node) {
          if (node) { node.style.filter = 'none'; node.style.userSelect = 'auto'; }
        });
        reveal.remove();
      });
      card.appendChild(reveal);
    } else if (revealed[e.id]) {
      [card.querySelector('.trophy-name'),
       card.querySelector('.trophy-description'),
       card.querySelector('.trophy-guide')].forEach(function (node) {
        if (node) { node.style.filter = 'none'; node.style.userSelect = 'auto'; }
      });
    }

    return card;
  }

  function refresh() {
    var entries = trophies.map(entryFor);
    renderSummary(entries);
    renderRoadmap(entries);
    renderFilters();
    renderList(entries);
    document.body.classList.toggle('spoilers-hidden', state.spoilers);
    byId('spoiler-toggle').checked = state.spoilers;
  }

  /* ---------- import / export / reset ---------- */

  function exportProgress() {
    var payload = {
      app: 'leonida-ledger',
      version: 1,
      exported: new Date().toISOString(),
      earned: Object.keys(state.earned).map(Number),
      spoilers: state.spoilers
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)],
      { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leonida-ledger-progress.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var ids = Array.isArray(data) ? data : data.earned;
        if (!Array.isArray(ids)) throw new Error('no earned list');
        var clean = {};
        ids.forEach(function (id) {
          var n = Number(id);
          if (knownIds[n]) clean[n] = true;
        });
        state.earned = clean;
        if (data && typeof data.spoilers === 'boolean') {
          state.spoilers = data.spoilers;
        }
        saveState();
        refresh();
      } catch (err) {
        byId('result-count').textContent =
          'That file is not a Leonida Ledger progress export — nothing was imported.';
      }
    };
    reader.readAsText(file);
  }

  /* ---------- URL presets (screenshot-friendly) ---------- */

  function applyPresets(entries) {
    /* Whatever view state loadState() restored goes back into the
       search box; any URL preset below then overrides it. */
    byId('search-input').value = state.search;
    var q = new URLSearchParams(window.location.search);
    if (q.get('kind') && (q.get('kind') === 'all' || KINDS.indexOf(q.get('kind')) >= 0)) {
      state.kind = q.get('kind');
    }
    if (q.get('grade') && (q.get('grade') === 'all' || GRADES.indexOf(q.get('grade')) >= 0)) {
      state.grade = q.get('grade');
    }
    if (q.get('status') && ['all', 'earned', 'unearned'].indexOf(q.get('status')) >= 0) {
      state.status = q.get('status');
    }
    if (q.get('spoiler') != null) {
      state.spoilers = q.get('spoiler') !== '0';
      saveState();
    }
    var open = Number(q.get('open'));
    if (open && knownIds[open]) {
      openGuides[open] = true;
      refresh();
      var cards = byId('trophy-list').children;
      var target = null;
      var ordered = entries.filter(matches);
      ordered.sort(function (a, b) { return a.stage - b.stage || a.id - b.id; });
      ordered.forEach(function (e, i) { if (e.id === open) target = cards[i]; });
      if (target) target.scrollIntoView({ block: 'center' });
      return;
    }
    refresh();
    if (q.get('view') === 'roadmap') {
      byId('roadmap').scrollIntoView();
    }
  }

  /* ---------- wiring & boot ---------- */

  function wire() {
    byId('search-input').addEventListener('input', function (ev) {
      state.search = ev.target.value.trim().toLowerCase();
      saveState();
      var entries = trophies.map(entryFor);
      renderList(entries);
    });
    byId('spoiler-toggle').addEventListener('change', function (ev) {
      state.spoilers = !!ev.target.checked;
      saveState();
      refresh();
    });
    byId('export-btn').addEventListener('click', exportProgress);
    var fileInput = byId('import-file');
    byId('import-btn').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) importProgress(fileInput.files[0]);
      fileInput.value = '';
    });
    byId('reset-btn').addEventListener('click', function () {
      state.earned = {};
      openGuides = {};
      revealed = {};
      saveState();
      refresh();
    });
  }

  function boot() {
    wire();
    fetchJson('data/trophies.json')
      .then(function (data) {
        trophies = (data && data.trophies) || [];
        trophies.forEach(function (t) { knownIds[t.id] = true; });
        loadState();
        return Promise.all([
          fetchJson('data/guides-a.json').then(mergeGuides).catch(function () {}),
          fetchJson('data/guides-b.json').then(mergeGuides).catch(function () {})
        ]);
      })
      .then(function () { applyPresets(trophies.map(entryFor)); })
      .catch(function () {
        byId('empty-message').hidden = false;
        byId('result-count').textContent =
          'The trophy data could not be loaded — serve this folder (node serve.ts) rather than opening the file directly.';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
