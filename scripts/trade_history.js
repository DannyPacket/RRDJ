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
// each player's season so far on the day of the trade (trade_asof.js: NHL games before the trade date + that season's scoring)
const asofFile = path.join(__dirname, 'trade_asof.json');
const asof = fs.existsSync(asofFile) ? JSON.parse(fs.readFileSync(asofFile, 'utf8')) : {};

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
    if (side) ev.push({ how: 'trade', at: x.date, date: x.date, season: x.s.id, week: (weekOf(x.s, x.date) || {}).week || null, from: x.sides.filter(y => y !== side).map(y => y.mgr).join(' & ') });
  }
  ev.sort((a, b) => a.at.localeCompare(b.at));
  const last = ev.pop();
  if (!last) return null;
  delete last.at;
  return last;
}

// Yahoo seasons: each traded player's weekly stat line in his new team's lineup, regular season and playoffs, read off
// Yahoo's matchup pages (yahoo_trade_stats.json: { season: { tid, weeks: { week: { mgr: { opp, total, players: [{ slot, name, pts, st }] } | { none } } } } }).
const ytsFile = path.join(__dirname, 'yahoo_trade_stats.json');
const yts = fs.existsSync(ytsFile) ? JSON.parse(fs.readFileSync(ytsFile, 'utf8')) : {};
const YMAP = { G: 'G', A: 'A', '+/-': '+/-', PIM: 'PIM', PPG: 'PPG', PPA: 'PPA', PPP: 'PPP', SHG: 'SHG', SHA: 'SHA', SHP: 'SHP', GWG: 'GWG', SOG: 'SOG', FW: 'FOW',
  HIT: 'Hit', BLK: 'Blk', W: 'W', GA: 'GA', SV: 'SV', SHO: 'SHO', OTL: 'OL' };
const yCheck = { ok: 0, off: [] };
function yahooWeek(season, w, mgr, name) {
  const tw = yts[season] && yts[season].weeks[w] && yts[season].weeks[w][mgr];
  if (!tw || tw.none) return null;
  const row = tw.players.find(q => norm(q.name) === norm(name));
  if (!row) return { pts: 0, st: {} };
  const st = {};
  for (const [k, v] of Object.entries(row.st || {})) if (YMAP[k] && typeof v === 'number') st[YMAP[k]] = v;
  // seasons that score PPP/SHP instead of PPG/PPA: keep the site's PPG + PPA = PPP convention
  if (st.PPP != null && st.PPA == null) { st.PPA = st.PPP - (st.PPG || 0); delete st.PPP; }
  if (st.SHP != null && st.SHA == null) { st.SHA = st.SHP - (st.SHG || 0); delete st.SHP; }
  return { pts: row.pts || 0, st };
}
const addLine = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = (a[k] || 0) + v; return a; };
const champ = (reports.history && reports.history.champions) || {};
const counts = {}, pairCounts = {}, seasonCounts = {};
const out = [];
// earlier trades, for the light "previously" notes: the same managers dealing again, a player traded again
const done = [];
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
      const ao = asof[t.id] && asof[t.id][p.name];
      const id = pid[norm(p.name)] || (ao && ao.id);
      // Yahoo: regular-season stat line over the weeks the tracker counts, then playoff/consolation weeks if he was still there
      let yReg = null, yPost = null;
      if (yts[s.id] && tp && tp.byWeek && !tp.statsByWeek) {
        const line = {}; let sum = 0, have = 0;
        for (const w of Object.keys(tp.byWeek)) { const r = yahooWeek(s.id, w, x.mgr, p.name); if (r) { have++; sum += r.pts; addLine(line, r.st); } }
        if (have) {
          yReg = line;
          const want = Object.values(tp.byWeek).reduce((a, v) => a + (v || 0), 0);
          if (Math.abs(sum - want) <= 0.05) yCheck.ok++; else yCheck.off.push(s.id + ' ' + x.mgr + ' ' + p.name + ' yahoo ' + r1(sum) + ' vs tracker ' + r1(want));
        }
        const br = fin && fin.bracket;
        if (br && !tp.left) {
          const games = br.games.filter(g => g.a === x.mgr || g.b === x.mgr);
          const pl = { pts: 0, st: {}, weeks: 0, type: games.some(g => g.type === 'Playoffs') ? 'Playoffs' : 'Consolation' };
          for (const g of games) { const r = yahooWeek(s.id, g.w, x.mgr, p.name); if (r) { pl.weeks++; pl.pts += r.pts; addLine(pl.st, r.st); } }
          yPost = games.length ? (pl.weeks ? { type: pl.type, pts: r1(pl.pts), stats: pl.st, weeks: pl.weeks } : null) : { type: 'none' };
        }
      }
      return {
        name: p.name, nhl: p.nhl, pos: p.pos, pid: hasImg(id) ? id : null,
        pts: pts == null ? null : r1(pts), gp: gp == null ? null : gp, left: tp && tp.left || null,
        asOf: ao ? { gp: ao.gp, pts: ao.pts } : null,
        // Fantrax seasons store each player's points, games and stat line week by week: the tracker shows totals and the last week
        byWeek: tp && tp.statsByWeek ? tp.byWeek || null : undefined, gpByWeek: tp && tp.statsByWeek ? tp.gpByWeek || null : undefined,
        statsByWeek: tp && tp.statsByWeek || undefined,
        regStats: yReg || undefined, post: yPost || undefined,
        // who gave him up and how that team got him (draft, pickup, waivers, trade); in a 3-team deal, the team whose records show him
        ...(() => { for (const g of giver) { const a = acquired(t, p.name, g); if (a) return { from: g, acquired: a }; } return { from: giver.join(' & '), acquired: null }; })(),
        past: pastOwners(p.name, t),
        prevTrades: done.filter(d => d.moves.some(m => norm(m.name) === norm(p.name))).map(d => { const m = d.moves.find(m => norm(m.name) === norm(p.name)); return { season: d.season, week: d.week, from: m.from, to: m.to }; })
      };
    });
    const st = before && before.standings.find(r => r.mgr === x.mgr);
    const fr = fin && fin.standings && fin.standings.find(r => r.mgr === x.mgr);
    // end of the regular season: the last regular week's standings (only once the season is over)
    const re = fin && ws.length ? ws[ws.length - 1].standings.find(r => r.mgr === x.mgr) : null;
    return {
      mgr: x.mgr, team: s.teams && s.teams[x.mgr] || null, logo: s.logos && s.logos[x.mgr] || null,
      record: st ? { rank: st.rank, w: st.w, l: st.l, t: st.t || 0 } : null,
      regEnd: re ? { rank: re.rank, w: re.w, l: re.l, t: re.t || 0 } : null,
      finish: fr ? fr.rank : null, champion: champ[s.id] === x.mgr,
      tradeNo: counts[x.mgr], gets,
      total: tr ? r1(gets.reduce((a, p) => a + (p.pts || 0), 0)) : null,
      asOfTotal: gets.some(p => p.asOf) ? { pts: r1(gets.reduce((a, p) => a + (p.asOf ? p.asOf.pts : 0), 0)), gp: gets.reduce((a, p) => a + (p.asOf ? p.asOf.gp : 0), 0) } : null
    };
  });
  const totals = sides.map(x => x.total);
  const scored = tr && s.scoring !== 'categories' && totals.some(v => v);
  const best = scored ? Math.max(...totals) : null;
  const wkNo = wk ? wk.week : t.week;
  const prevPair = done.filter(d => d.pk === pk).map(d => ({ season: d.season, week: d.week }));
  done.push({ season: s.id, week: wkNo, pk, moves: sides.flatMap(sd => sd.gets.map(p => ({ name: p.name, to: sd.mgr, from: p.from }))) });
  out.push({
    id: t.id, season: s.id, label: s.label || s.id, source: s.source === 'sheet' ? 'Yahoo' : 'Fantrax', scoring: s.scoring || 'points',
    date: t.date, week: wk ? wk.week : t.week, final: !isLive, noInSeason: seasonCounts[s.id], noAllTime: out.length + 1, pairNo: pairCounts[pk], prevPair,
    sides,
    tracker: scored ? {
      through: (s.tradeTracker && s.tradeTracker.through) || null, final: !isLive, week: (s.tradeTracker && s.tradeTracker.asOfWeek) || null,
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
if (Object.keys(yts).length) console.log('Yahoo stat lines:', yCheck.ok, 'players match the tracker points,', yCheck.off.length, 'do not' + (yCheck.off.length ? ':\n  ' + yCheck.off.join('\n  ') : ''));
