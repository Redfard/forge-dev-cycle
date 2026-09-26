'use strict';
// forge progress viewer. bin/forge-monitor lays out the data: projects.tsv
// and forge/<project> → .forge of each project. Log format — reference/progress.md.

var POLL = 3000;
var WAITING = { dialogue: 1, 'plan-approval': 1, design: 1 };  // steps that wait for a person

// Step keys are fixed names — they are the contract of the skill set and must stay as they are in the log.
// But in the timeline "claims" alone says nothing, so a short gloss sits next to it:
// always as a tooltip, and as text when the skill wrote no note of its own.
var GLOSS = {
  key: 'task key', 'open-check': 'task already open?', description: 'task statement',
  'tree-check': 'clean working tree', branch: 'branch', folder: 'task folder',
  'broad-read': 'broad code read', dialogue: 'dialogue with the user',
  'close-read': 'read of current behavior', 'topic-scan': 'topic list scan',
  design: 'design presentation', decisions: 'writing decisions',
  frame: 'reading the project frame', draft: 'draft', 'change-map': 'change map',
  'pre-mortem': '"shipped and broke" pass', 'review-pass': 'review pass',
  handover: 'handover', reviewer: 'clean reviewer',
  verification: 'checking findings against code', 'spec-read': 'reading the spec',
  task: 'change map task', tests: 'tests and gates', report: 'report',
  scope: 'scope and diff', checks: 'mechanical checks', 'fan-out': 'fan-out of axes',
  synthesis: 'merging findings', source: 'reading the source', group: 'grouping the list',
  apply: 'fixes', claims: 'list of claims',
  'plan-helpers': 'plan helpers', 'plan-approval': 'plan approval',
  environment: 'starting the environment', api: 'API requests', frontend: 'browser',
  cleanup: 'environment cleanup', hygiene: 'tree hygiene', commit: 'commit',
  tail: 'push / merge', 'read-project': 'reading the project',
  'scope-agreed': 'agreeing the scope', rules: 'rules.md', arch: 'arch.md',
  'clean-reader': 'clean reader check', collect: 'collect',
  check: 'check against the project', register: 'register'
};
function gloss(name) {
  return GLOSS[String(name).split(':')[0].trim()] || '';
}

// Route stages. A stage name in the log is "<number> <key>" with an optional
// detail: "5 review (run 3)". The number is parsed from the name, not from
// the row order: a run may start from a stage other than the first.
var STAGE_GLOSS = {
  task: 'task setup', brainstorming: 'brainstorm',
  'make-extended-spec': 'spec', 'review-spec': 'spec review',
  'implement-extended-spec': 'implementation', implement: 'implementation',
  review: 'code review', 'manual-test': 'manual test',
  'review-test': 'test report review', commit: 'commit and PR'
};
var ROUTE_LEN = 7;   // length of the /forge:auto route — the M in "stage N of M"
// After how much silence an open row stops meaning "running": an abandoned
// run writes no closing row and would tick green for months.
var STALE = 2 * 3600 * 1000;

function stageInfo(name) {
  var s = String(name).trim(), m = /^(\d+)\s+(.+)$/.exec(s);
  var rest = m ? m[2] : s;
  var key = rest.split(/[\s,(]/)[0].trim();
  return { num: m ? m[1] : '', rest: rest, key: key, label: STAGE_GLOSS[key] || '' };
}

var state = {
  projects: [], tasks: [], sel: null, rows: [], cmds: [], dirs: {}, err: null,
  tasksSig: null, tlSig: null, nowSig: null, runsClosed: {}, stagesClosed: {},
  waiting: [], waitingShown: false, phaseTitle: '', desc: true
};

// --- loading ----------------------------------------------------------------
// Read bytes and decode them ourselves: then the server's Content-Type (and its charset)
// plays no part at all — neither nginx nor http.server needs any setup.
function load(path) {
  return fetch(path + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
    .then(function (b) { return b ? new TextDecoder('utf-8').decode(b) : null; })
    .catch(function () { return null; });
}

function parse(text) {
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map(function (line) {
    var c = line.split('\t');
    return {
      ts: c[0], t: Date.parse(c[0]), task: c[1] || '-', kind: c[2] || '',
      name: c[3] || '', event: c[4] || 'start', extra: c[5] || ''
    };
  }).filter(function (r) { return !isNaN(r.t); });
}

// --- time -------------------------------------------------------------------
function el(ms) {
  var s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return s + 's';
  var m = Math.round(s / 60);
  if (m < 60) return m + 'm';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}
function hhmm(t) {
  var d = new Date(t), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
function day(t) {
  var d = new Date(t), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.getDate()) + '.' + p(d.getMonth() + 1);
}
function ago(t) {
  var d = Date.now() - t;
  if (d < 60000) return 'just now';
  if (d < 86400000) return el(d) + ' ago';
  return new Date(t).toLocaleDateString('en-GB');
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

// --- start/end pairs --------------------------------------------------------
// end closes the last open start of the same kind+name; a step is closed
// by the next event or by the end of its stage — this is how the protocol works.
function build(rows) {
  var items = [], open = {};
  rows.forEach(function (r) {
    var key = r.kind + ' ' + r.name;
    if (r.kind === 'step' || r.kind === 'note') {
      items.push({ kind: r.kind, name: r.name, start: r.t,
                   end: r.kind === 'note' ? r.t : null, extra: r.extra });
      return;
    }
    if (r.event === 'end') {
      var it = open[key] && open[key].pop();
      if (it) { it.end = r.t; if (r.extra) it.extra = (it.extra ? it.extra + ' · ' : '') + r.extra; }
      else items.push({ kind: r.kind, name: r.name, start: null, end: r.t, extra: r.extra });
      return;
    }
    var item = { kind: r.kind, name: r.name, start: r.t, end: null, extra: r.extra };
    items.push(item);
    (open[key] = open[key] || []).push(item);
  });

  items.sort(function (a, b) { return (a.start || a.end) - (b.start || b.end); });

  // A step is closed by whichever comes first: the next event or the end
  // of its stage. The parent stage sits in the array before the step (sorted by
  // start), so its end is searched backwards — it cannot be seen going forward.
  items.forEach(function (it, i) {
    if (it.kind !== 'step' || it.end) return;
    var cand = null;
    for (var j = i + 1; j < items.length; j++) {
      var n = items[j];
      if (n.kind !== 'note' && n.start) { cand = n.start; break; }
    }
    for (var k = i - 1; k >= 0; k--) {
      var p = items[k];
      if ((p.kind === 'stage' || p.kind === 'round') && p.start && p.start <= it.start) {
        // p.end is before the step start — so the step is not inside this stage but after
        // it: the skill was called directly. Otherwise we get a negative span.
        if (p.end && p.end > it.start && (cand === null || p.end < cand)) cand = p.end;
        break;
      }
    }
    it.end = cand;
  });
  return items;
}

// Tree run → stage/round → step. A flat list answered "what happened", but not
// "how long the stage took and what it was made of" — and that is what people ask.
function tree(items) {
  var runs = [], cur = null;
  function fresh(node) { cur = { node: node, children: [] }; runs.push(cur); return cur; }

  items.forEach(function (it) {
    if (it.kind === 'run') { fresh(it); return; }
    // Work before the first run or after its end is a block of its own: these are skills
    // called by slash command, and they must not be counted in a closed run.
    if (!cur || (cur.node && cur.node.end && it.start > cur.node.end)) fresh(null);
    if (it.kind === 'stage' || it.kind === 'round') {
      cur.children.push({ node: it, children: [] });
      return;
    }
    var last = cur.children[cur.children.length - 1];
    if (last && (last.node.kind === 'stage' || last.node.kind === 'round') &&
        last.node.start <= it.start && (!last.node.end || last.node.end >= it.start)) {
      last.children.push({ node: it, children: [] });
    } else {
      cur.children.push({ node: it, children: [] });
    }
  });
  return runs;
}

function span(node) { return node ? (node.end || Date.now()) - (node.start || node.end) : 0; }
function isOpen(node) { return !!(node && node.start && !node.end); }

function blockSpan(b) {
  if (b.node) return span(b.node);
  var first = b.children[0], last = b.children[b.children.length - 1];
  if (!first) return 0;
  var end = isOpen(last.node) ? Date.now() : (last.node.end || last.node.start);
  return Math.max(0, end - first.node.start);
}

// --- task list --------------------------------------------------------------
function tasksFromIndex(proj, rows) {
  var by = {};
  rows.forEach(function (r) {
    if (r.task === '-') return;
    var id = proj + '/' + r.task;
    var t = by[id] || (by[id] = { id: id, proj: proj, key: r.task, last: 0,
                                  stage: null, round: null, open: null, runs: 0 });
    t.last = Math.max(t.last, r.t);
    if (r.kind === 'run' && r.event === 'start') t.runs++;
    var d = /(?:^| )dir=(\S+)/.exec(r.extra);   // task folder — {KEY}-{slug}
    if (d) state.dirs[id] = d[1];
    // Stage and round are kept apart: a round ("re-check 1") in the label instead of the stage
    // answered "what is being done now" and said nothing about where the task is on the route —
    // and people read the list for the second one.
    if (r.kind === 'stage') {
      if (r.event === 'start') { t.stage = r.name; t.open = r.name; }
      else if (t.open === r.name) t.open = null;
    }
    if (r.kind === 'round') {
      if (r.event === 'start') t.round = r.name;
      else if (t.round === r.name) t.round = null;
    }
    if (r.kind === 'run' && r.event === 'end') { t.open = null; t.round = null; }
  });
  return Object.keys(by).map(function (k) { return by[k]; });
}

function renderTasks() {
  var box = document.getElementById('tasks');
  var list = state.tasks.slice();
  // The index has only milestones, so for the open task take the time from its timeline:
  // otherwise an active task looks abandoned for hours.
  if (state.sel && state.rows.length) {
    var lastRow = state.rows[state.rows.length - 1].t;
    list.forEach(function (t) { if (t.id === state.sel) t.last = Math.max(t.last, lastRow); });
  }
  list.sort(function (a, b) { return b.last - a.last; });

  var sig = state.sel + '|' + state.projects.length + '|' + list.map(function (t) {
    return [t.id, t.open, t.stage, t.round, t.runs, ago(t.last)].join('~');
  }).join('|');
  if (sig === state.tasksSig) return;
  state.tasksSig = sig;

  if (!list.length) {
    box.innerHTML = '<div class="empty">no tasks yet' +
      (state.err ? '<br><br>' + state.err : '') + '</div>';
    return;
  }

  var many = state.projects.length > 1;
  var html = '', shown = {};
  // Group by project, but the tasks set the order: the project worked on last
  // goes on top.
  list.forEach(function (t) {
    if (many && !shown[t.proj]) { shown[t.proj] = 1; html += '<div class="proj">' + esc(t.proj) + '</div>'; }
    var live = t.open ? '<span class="live">● ' + esc(t.open) + '</span>' : esc(t.stage || '—');
    html += '<button type="button" class="task' + (t.id === state.sel ? ' sel' : '') +
      '" data-id="' + esc(t.id) + '">' +
      '<span class="key">' + esc(t.key) + '</span>' +
      '<span class="meta">' + live + (t.round ? ' · ' + esc(t.round) : '') + '</span>' +
      '<span class="meta">' + ago(t.last) +
      (t.runs > 1 ? ' · runs: ' + t.runs : '') + '</span></button>';
  });
  box.innerHTML = html;
  Array.prototype.forEach.call(box.querySelectorAll('.task'), function (n) {
    n.onclick = function () { select(n.getAttribute('data-id')); };
  });
}

// --- task timeline ----------------------------------------------------------
function bar(px, cls) {
  return '<div class="bar ' + cls + '" style="width:' + Math.min(150, Math.max(2, Math.round(px))) + 'px"></div>';
}
function pct(part, whole) { return whole > 0 ? Math.round(part / whole * 100) + '%' : ''; }

// The point of a command is buried between the wrapper and the tail: `docker compose exec -u root
// -T app php artisan test modules/Shared/Tenancy/tests 2>&1 | grep -E "Tests:"`.
// Show the useful part; the full line stays in the tooltip.
function shortCmd(cmd) {
  var s = String(cmd);
  s = s.replace(/^\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s*;\s*)+/, '');          // S=/tmp/... ;
  s = s.replace(/^\s*cd\s+\S+\s*&&\s*/, '');
  s = s.replace(/docker\s+compose\s+exec\s+(?:-\S+\s+\S+\s+|-\S+\s+)*\S+\s+/g, '');
  s = s.replace(/\s*2>&1[\s\S]*$/, '');
  s = s.replace(/\s*\|\s*(?:grep|tail|head|sed|awk)[\s\S]*$/, '');
  s = s.replace(/modules\/([A-Za-z]+)\/([A-Za-z]+)\/tests?\b/g, '$1/$2');
  s = s.replace(/^php\s+artisan/, 'artisan');
  s = s.replace(/;\s*(?:artisan|php|docker)[\s\S]*$/, ' …');                 // second command
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > 96 ? s.slice(0, 95) + '…' : s;
}

function row(node, opts) {
  var open = isOpen(node) && !opts.unclosed, s = opts.elapsed || span(node);
  var cmd = node.kind === 'cmd';
  // Waiting is marked with a word, not an icon: an emoji glyph depends on the font
  // of the machine where the page is open, and on a server without color fonts it is an empty
  // square. The note flag comes from a text block, it exists everywhere.
  var mark = node.kind === 'note' ? '\u2691 ' : '';
  var wait = WAITING[String(node.name).split(':')[0].trim()]
    ? ' <span class="extra">waiting</span>' : '';
  // The stage number sits in a badge: "6" is seen before "manual-test"
  // is read. A round carries the same badge, faded — it stands on its own
  // row after its stage, and otherwise you cannot see which stage it belongs to.
  var si = node.kind === 'stage' ? stageInfo(node.name) : null;
  var badge = si
    ? '<span class="stnum">' + esc(si.num || '\u00b7') + '</span>'
    : (opts.stnum ? '<span class="stnum ghost">' + esc(opts.stnum) + '</span>' : '');
  var title = si
    ? esc(si.rest) + (si.label ? ' <span class="extra">(' + esc(si.label) + ')</span>' : '')
    : (node.kind === 'step' && gloss(node.name)
        ? '<span class="glossed" title="' + esc(gloss(node.name)) + '">' + esc(node.name) + '</span>'
        : esc(node.name));
  // Show the command shortened, and its own numbers on a second line:
  // they do not fit on one and get cut on the right, and the answer is in them.
  var name = cmd
    ? (opts.owner ? '<span class="owner">' + esc(opts.owner) + ' \u203a </span>' : '') +
      '<span class="cmdtext" title="' + esc(node.name) + '">' + esc(shortCmd(node.name)) + '</span>' +
      (node.extra ? '<span class="cmdsum">' + esc(node.extra) + '</span>' : '')
    : badge + title + wait +
      (node.extra ? ' <span class="extra">' + esc(node.extra) + '</span>'
        : (node.kind === 'step' && gloss(node.name)
            ? ' <span class="extra">' + esc(gloss(node.name)) + '</span>' : ''));
  return '<tr class="' + esc(node.kind) + (opts.cls ? ' ' + opts.cls : '') + '"' +
    (node.kind === 'stage' && node.start ? ' data-stage="' + node.start + '"' : '') +
      (opts.toggle ? ' data-toggle="' + esc(opts.toggle) + '" data-closed="' +
        (opts.closed ? '1' : '0') + '"' : '') +
      (opts.ctx ? ' data-ctx="' + esc(opts.ctx) + '"' : '') + '>' +
    '<td class="dim">' + (node.start ? hhmm(node.start) : '\u2014') + '</td>' +
    '<td class="el' + (open ? ' open' : '') + '">' +
      (node.kind === 'note' ? '' : (node.start ? el(s) + (open ? ' \u25cf' : '') : '(\u2014)')) + '</td>' +
    '<td class="barcell">' + (opts.bar || '') + '</td>' +
    '<td class="share dim">' + (opts.share || '') + '</td>' +
    '<td class="name ' + (opts.indent || '') + '">' + (opts.caret || '') + mark + name +
      (opts.unclosed ? ' <span class="unclosed">not closed</span>' : '') + '</td></tr>';
}

// Day separator: the timeline shows newest first, and crossing midnight otherwise
// reads as a step back in time inside one day.
function daySep(t) {
  return '<tr class="daysep"><td colspan="5">' + day(t) + '</td></tr>';
}

// "Now" bar: the main stage of the run and what is running inside it. The timeline alone
// does not answer this — fix rounds stand on their own rows after their stage,
// and with "newest on top" the open stage moves below them, to the middle
// of the screen, where you have to search for it.
function renderNow(blocks) {
  var box = document.getElementById('nowbar');
  // Take the last non-empty block: the tail of the timeline can be a block of one
  // orphan end — by that one a live run would look empty.
  var b = null;
  for (var i = (blocks || []).length - 1; i >= 0; i--) {
    if (blocks[i].children.length) { b = blocks[i]; break; }
  }
  if (!b) {
    box.hidden = true; box.innerHTML = '';
    state.phaseTitle = ''; syncTitle();
    return;
  }

  // Running is the last OPEN unit, not the last one by time: a short
  // round that closed inside a long one (a re-check inside a re-test) stands
  // last in the timeline, and by that one the run would look stuck.
  var stage = null, unit = null, live = null, loose = null, maxNum = 0, last = 0;
  b.children.forEach(function (c) {
    var n = c.node;
    if (n.kind === 'note' || n.kind === 'cmd') return;
    if (n.kind === 'stage') { stage = c; maxNum = Math.max(maxNum, Number(stageInfo(n.name).num) || 0); }
    if (n.kind === 'stage' || n.kind === 'round') {
      unit = c;
      if (isOpen(n) && !c.unclosed) live = c;
    }
    if (n.kind === 'step') loose = n;
    last = Math.max(last, n.end || n.start || 0);
    c.children.forEach(function (g) { last = Math.max(last, g.node.end || g.node.start || 0); });
  });
  var cur = live || unit;
  if (!cur && !loose) { box.hidden = true; box.innerHTML = ''; state.phaseTitle = ''; syncTitle(); return; }
  if (stage) stage.isCur = true;

  // Take the step from the running unit: that is where it is written.
  var step = loose;
  if (cur) { step = null; cur.children.forEach(function (g) { if (g.node.kind === 'step') step = g.node; }); }

  function held(c) { return c.unclosed ? c.unclosed - c.node.start : span(c.node); }
  var stageLive = !!(stage && isOpen(stage.node) && !stage.unclosed);
  var si = stage ? stageInfo(stage.node.name) : null;

  // Route: the stage number from its name, the total is the route length or
  // the biggest number, if the run turned out longer.
  var num = si ? Number(si.num) || 0 : 0, total = Math.max(ROUTE_LEN, maxNum), route = '';
  if (num) {
    for (var k = 1; k <= total; k++) {
      route += '<span class="nb-seg' + (k < num ? ' past' : k === num ? ' cur' : '') + '">' + k + '</span>';
    }
    route = '<span class="nb-route">' + route + '</span>';
  }

  var head = si
    ? '<span class="nb-name">' + esc(si.rest) + '</span>' +
      (si.label ? '<span class="nb-gloss">' + esc(si.label) + '</span>' : '') +
      '<span class="nb-el' + (stageLive ? ' live' : '') + '">' + el(held(stage)) +
        (stage.unclosed ? ' <span class="unclosed">not closed</span>' : stageLive ? ' ●' : '') + '</span>'
    : '<span class="nb-name">outside stages</span>';

  var stale = last && Date.now() - last > STALE
    ? ' · <span class="idle">silent for ' + el(Date.now() - last) + '</span>' : '';

  var sub;
  if (!live && step && !step.end) {
    // Work without stages — it was run by slash commands: there are no units, and the whole answer is in the step.
    sub = 'step <b>' + esc(step.name) + '</b>' +
      (gloss(step.name) ? ' <span class="nb-gloss">' + esc(gloss(step.name)) + '</span>' : '') +
      ' · ' + el(Date.now() - step.start) + stale;
  } else if (!live) {
    sub = '<span class="idle">nothing running</span> · last event ' +
      (last ? el(Date.now() - last) + ' ago' : '—');
  } else {
    var waits = WAITING[String(step && step.name).split(':')[0].trim()] && step && !step.end;
    // A stage is running and the last row in the timeline is a round — so the round is already over:
    // "stage running" alone does not say what exactly the run is busy with.
    sub = (live.node.kind === 'round'
        ? 'round <b>' + esc(live.node.name) + '</b> · ' + el(span(live.node))
        : 'stage running' + (unit && unit !== live && unit.node.kind === 'round'
            ? ' · last round <b>' + esc(unit.node.name) + '</b> ' +
              ago(unit.node.end || unit.node.start)
            : '')) +
      (step && !step.end
        ? ' → <b>' + esc(step.name) + '</b>' +
          (gloss(step.name) ? ' <span class="nb-gloss">' + esc(gloss(step.name)) + '</span>' : '') +
          ' · ' + el(Date.now() - step.start)
        : '') +
      (waits ? ' <span class="idle">waiting for you</span>' : '') + stale;
  }

  var html = route + '<span class="nb-head">' + head + '</span>' +
    '<span class="nb-sub">' + sub + '</span>';
  if (html !== state.nowSig) {
    state.nowSig = html;
    box.innerHTML = html;
  }
  box.hidden = false;
  box.title = stage ? 'go to the stage row in the timeline' : '';
  box.onclick = function () {
    var t = stage && document.querySelector('[data-stage="' + stage.node.start + '"]');
    if (t) t.scrollIntoView({ block: 'center' });
  };

  state.phaseTitle = si ? (si.num ? si.num + ' ' : '') + si.rest : '';
  syncTitle();
}

// Tab title: waiting for input matters more than the stage and replaces it.
function syncTitle() {
  if (state.waitingShown) return;
  var key = state.sel ? state.sel.slice(state.sel.indexOf('/') + 1) : '';
  document.title = state.phaseTitle && key
    ? key + ' · ' + state.phaseTitle
    : 'forge · progress';
}

function renderOrder() {
  var b = document.getElementById('order');
  b.textContent = state.desc ? 'newest on top ↓' : 'oldest on top ↑';
  b.onclick = function () {
    state.desc = !state.desc;
    try { localStorage.setItem('forge.desc', state.desc ? '1' : '0'); } catch (e) {}
    state.tlSig = null;
    renderOrder(); renderTimeline();
  };
}

function renderTimeline() {
  var box = document.getElementById('timeline');
  if (!state.sel) {
    renderNow(null);
    paint(box, '<div class="empty">pick a task on the left</div>');
    return;
  }
  var items = build(state.rows).concat(state.cmds.map(function (c) {
    return { kind: 'cmd', name: c.name, start: c.start, end: c.end, extra: c.extra };
  })).sort(function (a, b) { return (a.start || a.end) - (b.start || b.end); });
  var blocks = tree(items);
  // A command belongs to the last step before it. Count this in time order,
  // before reversing: with a collapsed step the command would otherwise hang with no owner.
  // A row that has no end, but after which something that replaces it has already started,
  // is not running, just not closed. Showing it as growing is a lie:
  // it makes a 12-minute round look like a day of work. What replaces it depends on the
  // level: a stage is ended only by the next STAGE, because the lead's fix rounds
  // run inside its cycle (fixes from the review report, from the test report) and do not
  // close it; a round is replaced both by a stage and by the next round.
  blocks.forEach(function (b) {
    var kids = b.children;
    kids.forEach(function (c, i) {
      if (!isOpen(c.node) || (c.node.kind !== 'stage' && c.node.kind !== 'round')) return;
      var closers = c.node.kind === 'stage' ? { stage: 1 } : { stage: 1, round: 1 };
      for (var j = i + 1; j < kids.length; j++) {
        var n = kids[j].node;
        if (closers[n.kind] && n.start) { c.unclosed = n.start; return; }
      }
      if (b.node && b.node.end) c.unclosed = b.node.end;   // the run is closed, but the row is not
    });
  });

  blocks.forEach(function (b) {
    var lastUnit = '', stnum = '';
    b.children.forEach(function (c) {
      if (c.node.kind === 'stage') stnum = stageInfo(c.node.name).num;
      else if (c.node.kind === 'round') c.stnum = stnum;
      if (c.node.kind === 'stage' || c.node.kind === 'round') lastUnit = c.node.name;
      else if (c.node.kind === 'cmd') c.owner = lastUnit;   // the round is already closed — it is the owner
      var lastStep = '';
      c.children.forEach(function (g) {
        if (g.node.kind === 'step') lastStep = g.node.name;
        else if (g.node.kind === 'cmd') g.owner = lastStep;
      });
    });
  });
  renderNow(blocks);
  if (!blocks.length) { paint(box, '<div class="empty">no events for this task yet</div>'); return; }

  var key = state.sel.slice(state.sel.indexOf('/') + 1);
  var runs = blocks.filter(function (b) { return b.node; }).length;
  var html = '<h2>' + esc(key) +
    '<span class="sub">' + (runs ? 'runs: ' + runs : 'outside a run') + '</span></h2>';

  // Count the run number before sorting: it does not depend on the display order.
  var seen = 0;
  blocks.forEach(function (b) { if (b.node) { seen++; b.num = seen; } });
  var ordered = state.desc ? blocks.slice().reverse() : blocks.slice();
  var lastDay = '';

  ordered.forEach(function (b, idx) {
    var first = b.node || (b.children[0] && b.children[0].node);
    if (!first) return;
    var id = 'run:' + first.start;
    // The newest run is open, past ones are collapsed: people watch the current one and skim the history.
    var newest = state.desc ? idx === 0 : idx === ordered.length - 1;
    var closed = state.runsClosed[id] === undefined ? !newest : state.runsClosed[id];
    var total = blockSpan(b);
    var live = b.node ? isOpen(b.node) : b.children.some(function (c) { return isOpen(c.node); });
    var num = b.num;

    var longest = null;
    b.children.forEach(function (c) {
      if (c.node.kind === 'note') return;
      if (!longest || span(c.node) > span(longest.node)) longest = c;
    });

    if (lastDay && lastDay !== day(first.start)) html += '<table class="rows">' + daySep(first.start) + '</table>';
    lastDay = day(first.start);

    html += '<table class="run"><tr class="runhead" data-ctx="' +
      esc(b.node ? 'Run ' + num : 'Outside a run') + '" data-toggle="' + esc(id) +
      '" data-closed="' + (closed ? '1' : '0') + '">' +
      '<td class="caret">' + (closed ? '▸' : '▾') + '</td>' +
      '<td class="el' + (live ? ' open' : '') + '">' + el(total) + (live ? ' ●' : '') + '</td>' +
      '<td class="name">' + (b.node ? 'Run ' + num : 'Outside a run') +
        '<span class="extra"> · ' + day(first.start) + ' ' + hhmm(first.start) +
        (closed && longest ? ' · longest: ' + esc(longest.node.name) + ' ' + el(span(longest.node)) : '') +
        (b.node && b.node.extra ? ' · ' + esc(b.node.extra) : '') +
      '</span></td></tr></table>';

    if (closed) return;

    html += '<table class="rows">';
    (state.desc ? b.children.slice().reverse() : b.children).forEach(function (c) {
      var cs = c.unclosed ? c.unclosed - c.node.start : span(c.node);
      var sid = 'stage:' + c.node.start;
      var hasKids = c.children.length > 0;
      // By default steps are hidden for all stages except the running one: an expanded
      // history is a wall of rows, and usually only one stage is needed, the current one.
      var stClosed = state.stagesClosed[sid] === undefined
        ? !isOpen(c.node) : state.stagesClosed[sid];
      var caret = hasKids
        ? '<span class="caret">' + (stClosed ? '▸' : '▾') + '</span> '
        : '<span class="caret"> </span> ';
      if (c.node.start) {
        if (lastDay && lastDay !== day(c.node.start)) html += daySep(c.node.start);
        lastDay = day(c.node.start);
      }
      html += row(c.node, {
        unclosed: c.unclosed, elapsed: cs, stnum: c.stnum, cls: c.isCur ? 'cur' : '',
        bar: c.node.kind === 'note' ? '' : bar(cs / (total || 1) * 150, c.node.kind),
        share: (c.node.kind === 'note' || c.node.kind === 'cmd') ? '' : pct(cs, total),
        owner: c.owner,
        caret: caret, toggle: hasKids ? sid : '', closed: stClosed, indent: 'ind1',
        ctx: (b.node ? 'Run ' + num + ' · ' : '') + c.node.name
      });
      if (stClosed) return;
      (state.desc ? c.children.slice().reverse() : c.children).forEach(function (g) {
        var gs = span(g.node);
        if (g.node.start) {
          if (lastDay && lastDay !== day(g.node.start)) html += daySep(g.node.start);
          lastDay = day(g.node.start);
        }
        html += row(g.node, {
          // Second scale: a step is measured against its stage, not the run — otherwise next
          // to the longest stage all steps turn into thin threads.
          bar: g.node.kind === 'note' ? '' : bar(gs / (cs || 1) * 110, g.node.kind),
          // A share makes no sense for a command: eight minutes of a test run out of
          // a thirteen-hour round is 1%, and the number is just noise.
          share: (g.node.kind === 'note' || g.node.kind === 'cmd') ? '' : pct(gs, cs),
          owner: g.owner, indent: g.node.kind === 'cmd' ? 'ind3' : 'ind2'
        });
      });
    });
    html += '</table>';
  });

  paint(box, html);
  syncCtx();
  Array.prototype.forEach.call(box.querySelectorAll('[data-toggle]'), function (n) {
    n.onclick = function () {
      var id = n.getAttribute('data-toggle');
      var store = id.indexOf('run:') === 0 ? state.runsClosed : state.stagesClosed;
      store[id] = n.getAttribute('data-closed') !== '1';
      state.tlSig = null;
      renderTimeline();
    };
  });
}

// "Waiting for input" banner. The session's hooks set the marks through bin/forge-waiting, not
// the model: a hook fires exactly at the moment of waiting and cannot forget it.
// The favicon is drawn as a shape, not an emoji: a glyph takes its color from the font, and on a dark
// tab bar it is not visible at all. Red when input is awaited.
var FAV_IDLE = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Crect%20x%3D%221%22%20y%3D%229%22%20width%3D%223.6%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%239ece6a%22%20opacity%3D%22.55%22/%3E%3Crect%20x%3D%226.2%22%20y%3D%225%22%20width%3D%223.6%22%20height%3D%2210%22%20rx%3D%221%22%20fill%3D%22%239ece6a%22/%3E%3Crect%20x%3D%2211.4%22%20y%3D%221.5%22%20width%3D%223.6%22%20height%3D%2213.5%22%20rx%3D%221%22%20fill%3D%22%239ece6a%22%20opacity%3D%22.8%22/%3E%3C/svg%3E';
var FAV_WAIT = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Crect%20x%3D%221%22%20y%3D%229%22%20width%3D%223.6%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%23e06c75%22%20opacity%3D%22.55%22/%3E%3Crect%20x%3D%226.2%22%20y%3D%225%22%20width%3D%223.6%22%20height%3D%2210%22%20rx%3D%221%22%20fill%3D%22%23e06c75%22/%3E%3Crect%20x%3D%2211.4%22%20y%3D%221.5%22%20width%3D%223.6%22%20height%3D%2213.5%22%20rx%3D%221%22%20fill%3D%22%23e06c75%22%20opacity%3D%22.8%22/%3E%3C/svg%3E';
function setFav(waiting) {
  var l = document.getElementById('fav');
  if (l) l.href = waiting ? FAV_WAIT : FAV_IDLE;
}

function renderWaiting() {
  var box = document.getElementById('waiting');
  // Every Claude Code session writes marks, including in projects that are not
  // monitored: their banner here is just noise.
  var known = {};
  state.projects.forEach(function (p) { known[p.name] = 1; });
  var w = state.waiting.filter(function (r) { return known[r.proj]; });
  if (!w.length) {
    box.hidden = true; box.innerHTML = '';
    state.waitingShown = false;
    syncTitle();
    setFav(false);
    return;
  }
  box.hidden = false;
  state.waitingShown = true;
  setFav(true);
  box.innerHTML = w.map(function (r) {
    // Project and session — and nothing more: labeling it with the project's open task
    // is wrong, any other session in the same folder may be waiting, and the label
    // would send you to answer in the wrong place.
    return '<span class="w"><span class="who">' + esc(r.proj) + '</span>' +
      '<span class="age"> · ' + esc(r.label || 'session ' + String(r.session).slice(0, 8)) + '</span>' +
      ' is waiting for input <span class="age">— ' + el(Date.now() - r.t) + '</span> ' +
      '<span class="msg">· ' + esc(r.msg) + '</span></span>';
  }).join('');
  // In the title — so it is visible on an inactive tab.
  document.title = '⚠ waiting for input: ' + w.map(function (r) { return r.proj; })
    .filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ');
}

// Sticky header: while scrolling it shows the run and stage that what is on screen
// belongs to. Without it a piece of the timeline does not answer "which stage is this".
function syncCtx() {
  var box = document.getElementById('timeline');
  var bar = document.getElementById('ctx');
  var rows = box.querySelectorAll('[data-ctx]');
  if (!rows.length) { bar.hidden = true; return; }
  var top = box.scrollTop, text = '', base = box.getBoundingClientRect().top - top;
  // The timeline may show newest first, so take not "the last one above" but the one
  // whose row is closest to the top edge of the view.
  var best = -1;
  Array.prototype.forEach.call(rows, function (r) {
    var y = r.getBoundingClientRect().top - base;
    if (y <= top + 6 && y > best) { best = y; text = r.getAttribute('data-ctx'); }
  });
  if (!text) text = rows[0].getAttribute('data-ctx');
  bar.textContent = text;
  bar.hidden = !text;
}

// Redraw only on a real change and never over a selection:
// the timeline is rewritten once a second so open rows keep ticking, and a blind
// rewrite makes it impossible to copy anything from it.
function paint(box, html) {
  if (html === state.tlSig) return;
  var sel = window.getSelection && window.getSelection();
  if (sel && !sel.isCollapsed && sel.anchorNode && box.contains(sel.anchorNode)) return;
  state.tlSig = html;
  box.innerHTML = html;
}

// --- loop -------------------------------------------------------------------
function select(id) {
  state.sel = id;
  state.tlSig = null;
  try { localStorage.setItem('forge.sel', id); } catch (e) {}
  renderTasks();
  refreshTask().then(function () { renderTasks(); renderTimeline(); });
}

function refreshTask() {
  if (!state.sel || state.sel.indexOf('/') < 0) return Promise.resolve();
  var proj = state.sel.slice(0, state.sel.indexOf('/'));
  var key = state.sel.slice(state.sel.indexOf('/') + 1);
  var dir = state.dirs[state.sel] || key;
  var base = 'forge/' + encodeURIComponent(proj) + '/';
  // The task folder may appear after the first rows — read both places and merge.
  // Long commands are written per project, not per task: the hook knows only the folder.
  return Promise.all([
    load(base + 'tasks/' + encodeURIComponent(dir) + '/progress.tsv'),
    load(base + 'run/' + encodeURIComponent(key) + '.tsv'),
    load(base + 'run/commands.tsv')
  ]).then(function (parts) {
    state.rows = parse(parts[0]).concat(parse(parts[1]))
      .sort(function (a, b) { return a.t - b.t; });
    var first = state.rows.length ? state.rows[0].t : 0;
    var live = state.rows.some(function (r) { return r.kind === 'run' && r.event === 'start'; }) &&
      !state.rows.some(function (r) { return r.kind === 'run' && r.event === 'end'; });
    var last = state.rows.length ? state.rows[state.rows.length - 1].t : 0;
    state.cmds = parse(parts[2]).filter(function (c) {
      // task window: from the first row to the last, for a running one up to now
      return first && c.t >= first && (live || c.t <= last + 300000);
    }).map(function (c) {
      var m = /elapsed=(\d+)s/.exec(c.extra);
      return { name: c.name, start: c.t, end: c.t + (m ? Number(m[1]) * 1000 : 0),
               extra: c.extra.replace(/^elapsed=\d+s( · )?/, '') };
    });
  });
}

function tick() {
  document.getElementById('now').textContent = hhmm(Date.now());
  load('projects.tsv').then(function (text) {
    if (text === null) {
      state.err = 'cannot read <code>projects.tsv</code> — monitoring is not set up yet: ' +
        'run <code>bin/forge-monitor &lt;project path&gt;</code>, see README.';
      state.projects = [];
      return [];
    }
    state.err = null;
    state.projects = text.split(/\r?\n/).filter(Boolean).map(function (l) {
      var c = l.split('\t');
      return { name: c[0], label: c[1] || c[0] };
    });
    var jobs = state.projects.map(function (p) {
      return load('forge/' + encodeURIComponent(p.name) + '/run/index.tsv')
        .then(function (t) { return tasksFromIndex(p.name, parse(t)); });
    });
    jobs.push(load('waiting.tsv').then(function (t) {
      state.waiting = (t || '').split(/\r?\n/).filter(Boolean).map(function (l) {
        var c = l.split('\t');
        return { t: Number(c[0]) * 1000, session: c[1], proj: c[2],
                 msg: c[3] || 'waiting for input', label: c[4] || '' };
      }).filter(function (r) { return r.t; });
      return [];
    }));
    return Promise.all(jobs);
  }).then(function (lists) {
    state.tasks = [].concat.apply([], lists || []);
    document.getElementById('status').textContent = state.projects.length > 1
      ? 'projects: ' + state.projects.length
      : (state.projects[0] ? state.projects[0].name : '');
    // A choice from a past visit may point to a task that is not here:
    // without a reset the page opens with an empty timeline next to a non-empty list.
    if (!state.tasks.length && state.sel) {   // no tasks at all — drop the past choice
      state.sel = null; state.rows = []; state.tlSig = null;
      try { localStorage.removeItem('forge.sel'); } catch (e) {}
    }
    if (state.tasks.length && !state.tasks.some(function (t) { return t.id === state.sel; })) {
      state.sel = state.tasks.slice().sort(function (a, b) { return b.last - a.last; })[0].id;
      state.tlSig = null;
      try { localStorage.setItem('forge.sel', state.sel); } catch (e) {}
    }
    renderTasks();   // the signature decides by itself whether anything changed
    renderWaiting();
    return refreshTask();
  }).then(function () { renderTasks(); renderTimeline(); });
}

document.getElementById('timeline').addEventListener('scroll', syncCtx);

try { state.sel = localStorage.getItem('forge.sel'); } catch (e) {}
try { state.desc = localStorage.getItem('forge.desc') !== '0'; } catch (e) {}
renderOrder();
tick();
setInterval(tick, POLL);
setInterval(function () {  // open rows tick on their own, with no request to the server
  document.getElementById('now').textContent = hhmm(Date.now());
  if (state.rows.length) renderTimeline();
  if (state.waiting.length) renderWaiting();
}, 1000);
