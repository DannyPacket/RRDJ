// Trade History tab data: every league trade since 2013-14, with what each side got, how the other team had come to
// own each player, the trade tracker result (fantasy points each side's players scored for their new team) and a story.
// Usage: node trade_history.js <RRDJ/site dir> [stories.json]
//   reads  <site>/reports.json (trades, trade trackers, weekly standings, moves, logos, champions) and <site>/drafts.json
//   reads  stories.json (default: trade_stories.json next to this script): { "<trade id>": { kicker, headline, body: [lead, one per side] } }
//   writes <site>/trades.json  { built, trades: [...] } newest first. Trade id = "<season>|<date>|<managers, sorted, comma-joined>".
// Run it after the weekly update (the tracker totals move every week) and after adding a story.
const fs = require('fs'), path = require('path');
const site = process.argv[2] || path.join(__dirname, '..', 'site');
const storiesFile = process.argv[3] || path.join(__dirname, 'trade_stories.json');
const reports = JSON.parse(fs.readFileSync(path.join(site, 'reports.json'), 'utf8'));
const drafts = JSON.parse(fs.readFileSync(path.join(site, 'drafts.json'), 'utf8'));
const stories = fs.existsSync(storiesFile) ? JSON.parse(fs.readFileSync(storiesFile, 'utf8')) : {};

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const r1 = x => Math.round(x * 10) / 10;
const seasons = reports.seasons;
const live = seasons[seasons.length - 1];

// ---- name -> NHL id (for headshots in site/players/<id>.png) ----
const pid = {};
for (const s of seasons) for (const w of s.weeks || []) for (const grp of Object.values(w.players || {})) {
  const cards = Array.isArray(grp) ? grp : Object.values(grp || {});
  for (const c of cards.flatMap(x => Array.isArray(x) ? x : Object.values(x && typeof x === 'object' && !x.name ? x : { x }))) if (c && c.name && c.pid) pid[norm(c.name)] = String(c.pid);
}
for (const s of drafts.seasons) for (const p of s.picks) if (p[9]) pid[norm(p[1])] = pid[norm(p[1])] || String(p[9]);
const hasImg = id => id && fs.existsSync(path.join(site, 'players', id + '.png'));

// ---- every trade, de-duplicated (weekly lists + each season's trade tracker) ----
// A three-team trade can list one manager twice (one side per player received): merge those sides.
const merge = sides => { const m = new Map(); for (const x of sides) { const y = m.get(x.mgr); if (y) y.gets = y.gets.concat(x.gets); else m.set(x.mgr, Object.assign({}, x, { gets: x.gets.slice() })); } return [...m.values()]; };
const all = [], seen = new Set();
for (const s of seasons) {
  const tt = (s.tradeTracker && s.tradeTracker.trades) || [];
  const add = (t0, week) => {
    const t = Object.assign({}, t0, { sides: merge(t0.sides) });
    const mgrs = t.sides.map(x => x.mgr).sort();
    const id = s.id + '|' + t.date + '|' + mgrs.join(',');
    if (seen.has(id)) return;
    seen.add(id);
    let tr = tt.find(x => x.date === t.date && [...new Set(x.sides.map(y => y.mgr))].sort().join() === mgrs.join());
    if (tr) tr = Object.assign({}, tr, { sides: merge(tr.sides) });
    all.push({ id, s, date: t.date, week: week || null, sides: t.sides, tracker: tr || null });
  };
  for (const w of s.weeks || []) for (const t of w.trades || []) add(t, w.week);
  for (const t of tt) add(t);
}
all.sort((a, b) => a.date.localeCompare(b.date));

// ---- drafts and season moves ----
const draftOf = {};
for (const s of drafts.seasons) {
  const n = s.teams.length;
  s.picks.forEach((p, i) => (draftOf[s.id + '|' + norm(p[1])] = { mgr: p[0], round: Math.floor(i / n) + 1, pick: i + 1 }));
}
const pastOwners = (name, before) => {
  const k = norm(name), out = [];
  for (const s of drafts.seasons) { const d = draftOf[s.id + '|' + k]; if (d && s.id < before.s.id) out.push({ season: s.id, mgr: d.mgr, how: 'drafted', round: d.round }); }
  for (const t of all) if (t.date < before.date) for (const x of t.sides) if (x.gets.some(p => norm(p.name) === k)) out.push({ season: t.s.id, mgr: x.mgr, how: 'traded for', date: t.date });
  return out.sort((a, b) => (a.season + (a.date || '')).localeCompare(b.season + (b.date || '')));
};
function weekOf(s, date) {
  const ws = (s.weeks || []).filter(w => w.start && w.week !== 100).sort((a, b) => a.week - b.week);
  const w = ws.find(x => x.start <= date && date <= x.end) || ws.filter(x => x.start <= date).pop();
  return w || null;
}
function acquired(t, name, giver) {
  const s = t.s, k = norm(name), ev = [];
  const d = draftOf[s.id + '|' + k];
  if (d && d.mgr === giver) ev.push({ how: 'draft', at: '0', round: d.round, pick: d.pick });
  for (const w of s.weeks || []) if (w.start && w.start <= t.date) for (const m of w.moves || []) {
    if (m.mgr === giver && m.add && norm(m.add.name) === k) ev.push({ how: m.add.note === 'waivers' ? 'waivers' : 'add', at: w.start, week: w.week });
  }
  for (const x of all) if (x.s === s && x.date < t.date) {
    const side = x.sides.find(y => y.mgr === giver && y.gets.some(p => norm(p.name) === k));
    if (side) ev.push({ how: 'trade', at: x.date, date: x.date, from: x.sides.filter(y => y !== side).map(y => y.mgr).join(' & ') });
  }
  ev.sort((a, b) => a.at.localeCompare(b.at));
  const last = ev.pop();
  if (!last) return null;
  delete last.at;
  return last;
}

const champ = (reports.history && reports.history.champions) || {};
const counts = {}, pairCounts = {}, seasonCounts = {};
const out = [];
for (const t of all) {
  const s = t.s, mgrs = t.sides.map(x => x.mgr);
  for (const m of mgrs) counts[m] = (counts[m] || 0) + 1;
  const pk = mgrs.slice().sort().join(',');
  pairCounts[pk] = (pairCounts[pk] || 0) + 1;
  seasonCounts[s.id] = (seasonCounts[s.id] || 0) + 1;
  const wk = weekOf(s, t.date);
  const ws = (s.weeks || []).filter(w => w.week !== 100 && w.standings).sort((a, b) => a.week - b.week);
  const before = wk ? ws.filter(w => w.week < wk.week).pop() : null;
  const fin = (s.weeks || []).find(w => w.week === 100);
  const isLive = s === live && !fin;
  const tr = t.tracker;
  const sides = t.sides.map(x => {
    const giver = t.sides.filter(y => y !== x).map(y => y.mgr);
    const trSide = tr && tr.sides.find(y => y.mgr === x.mgr);
    const gets = x.gets.map(p => {
      const tp = trSide && trSide.gets.find(q => norm(q.name) === norm(p.name));
      const pts = tp ? (tp.pts != null ? tp.pts : Object.values(tp.byWeek || {}).reduce((a, v) => a + (v || 0), 0)) : null;
      const gp = tp && (tp.gp != null ? tp.gp : tp.gpByWeek ? Object.values(tp.gpByWeek).reduce((a, v) => a + v, 0) : null);
      const id = pid[norm(p.name)];
      return {
        name: p.name, nhl: p.nhl, pos: p.pos, pid: hasImg(id) ? id : null,
        pts: pts == null ? null : r1(pts), gp: gp == null ? null : gp, left: tp && tp.left || null,
        from: giver.join(' & '), acquired: giver.length === 1 ? acquired(t, p.name, giver[0]) : null,
        past: pastOwners(p.name, t)
      };
    });
    const st = before && before.standings.find(r => r.mgr === x.mgr);
    const fr = fin && fin.standings && fin.standings.find(r => r.mgr === x.mgr);
    return {
      mgr: x.mgr, team: s.teams && s.teams[x.mgr] || null, logo: s.logos && s.logos[x.mgr] || null,
      record: st ? { rank: st.rank, w: st.w, l: st.l, t: st.t || 0 } : null,
      finish: fr ? fr.rank : null, champion: champ[s.id] === x.mgr,
      tradeNo: counts[x.mgr], gets,
      total: tr ? r1(gets.reduce((a, p) => a + (p.pts || 0), 0)) : null
    };
  });
  const totals = sides.map(x => x.total);
  const scored = tr && s.scoring !== 'categories' && totals.some(v => v);
  const best = scored ? Math.max(...totals) : null;
  out.push({
    id: t.id, season: s.id, label: s.label || s.id, source: s.source === 'sheet' ? 'Yahoo' : 'Fantrax', scoring: s.scoring || 'points',
    date: t.date, week: wk ? wk.week : t.week, noInSeason: seasonCounts[s.id], noAllTime: out.length + 1, pairNo: pairCounts[pk],
    sides,
    tracker: scored ? {
      through: (s.tradeTracker && s.tradeTracker.through) || null, final: !isLive,
      leader: totals.filter(v => v === best).length === 1 ? sides[totals.indexOf(best)].mgr : null,
      by: r1(best - Math.min(...totals))
    } : null,
    // Yahoo seasons: points a player scored in his new team's starting lineup (fantasy playoff weeks only count for teams still playing). Fantrax: every fantasy point since the trade.
    basis: s.source === 'sheet' ? 'lineup' : 'all',
    story: stories[t.id] || null
  });
}
out.reverse();
const result = { built: new Date().toISOString(), through: live.tradeTracker && live.tradeTracker.through, trades: out };
fs.writeFileSync(path.join(site, 'trades.json'), JSON.stringify(result));
console.log('trades.json:', out.length, 'trades,', out.filter(x => x.story).length, 'with stories,', out.reduce((a, t) => a + t.sides.reduce((b, s) => b + s.gets.filter(p => p.pid).length, 0), 0), 'headshots');
