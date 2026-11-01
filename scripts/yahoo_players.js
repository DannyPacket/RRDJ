// Top & bottom players, movement and trade tracker for a past Yahoo season.
// Usage: node yahoo_players.js <raw.json> <season> <master.csv>
//   raw.json: what the Yahoo tab collected for one season (see SKILL.md): { mgr: {teamId: manager}, tname, names: {yid: name},
//     pos: {yid: "C,LW"}, rosters: {week: {teamId: [[yid, slot, pts, played, isGoalie]]}}, tx: [{ts, teams, kinds, players: [{yid, how}]}] }
//   Player points come from Yahoo's weekly matchup pages: what each player scored for his manager that week (days in the
//   starting lineup only), so every team's players add up to its official score; the script checks that against Master.
// Writes yahoo_weeks.json next to this script: { season: { weeks: { week: { players, moves, trades } }, tradeTracker } }.
// legacy_weeks.js merges it into the sheet seasons. NHL ids/teams come from NHL.com (team at the time, from game logs).
const fs = require('fs'), path = require('path');
const [rawFile, season, masterFile] = process.argv.slice(2);
const S = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
const dates = JSON.parse(fs.readFileSync(path.join(__dirname, 'week_dates.json'), 'utf8'))[season];
const y0 = +season.slice(0, 4), nhlSeason = y0 + '' + (y0 + 1);
const cacheFile = path.join(__dirname, 'nhl_cache.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : { search: {}, log: {} };
const sleep = ms => new Promise(z => setTimeout(z, ms));
const getJSON = async u => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch (e) {} await sleep(800 * (i + 1)); } return null; };

// --- check: every team's players add up to its score in Master
const rows = fs.readFileSync(masterFile, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch == '"') q = !q; else if (ch == ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; });
const sheetPts = {}; rows.filter(r => r[0] === season && r[15] === 'Regular').forEach(r => sheetPts[r[2] + '|' + r[1]] = parseFloat(r[6].replace(/,/g, '')));
const mismatches = [];
for (const [wk, teams] of Object.entries(S.rosters)) for (const tid of Object.keys(S.mgr)) {
  const list = teams[tid] || [];
  const tot = list.reduce((a, r) => a + r[2], 0), want = sheetPts[wk + '|' + S.mgr[tid]];
  if (want == null || Math.abs(tot - want) > 0.05) mismatches.push(`wk${wk} ${S.mgr[tid]}: players ${tot.toFixed(2)} vs sheet ${want}`);
}

// --- dates
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const isoOf = ts => { const m = ts.match(/([A-Z][a-z]{2}) (\d{1,2})/); if (!m) return null; const mo = MON[m[1]]; return (mo >= 8 ? y0 : y0 + 1) + '-' + String(mo).padStart(2, '0') + '-' + String(+m[2]).padStart(2, '0'); };
const wkNums = Object.keys(dates).map(Number).sort((a, b) => a - b), lastWk = wkNums[wkNums.length - 1];
const weekOf = iso => { if (iso < dates[1][0]) return 1; const w = wkNums.find(k => dates[k][0] <= iso && iso <= dates[k][1]); return w || null; };

// --- NHL lookups: id, position, team on a date
const posGroup = p => /G/.test(p) ? 'G' : /^D$|^D,|,D$/.test(p) && !/C|LW|RW|F/.test(p) ? 'D' : 'F';
async function nhlPlayer(name) {
  if (cache.search[name] && cache.search[name].length) return cache.search[name];
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  // NHL.com's search ranks hyphenated names poorly ("Ryan Nugent-Hopkins"), so fall back to the last name alone
  let same = [];
  for (const q of [name, name.split(' ').slice(-1)[0], name.replace(/-/g, ' ')]) {
    const hits = await getJSON('https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=50&q=' + encodeURIComponent(q)) || [];
    same = hits.filter(h => norm(h.name) === norm(name));
    if (same.length) break;
  }
  const found = same.map(h => ({ id: h.playerId, pos: h.positionCode }));
  if (found.length) cache.search[name] = found; // no match isn't cached, so the next run tries again
  return found;
}
async function gameLog(id) {
  const k = id + '|' + nhlSeason;
  if (cache.log[k] !== undefined) return cache.log[k];
  const j = await getJSON(`https://api-web.nhle.com/v1/player/${id}/game-log/${nhlSeason}/2`);
  if (!j) return []; // a failed request isn't cached, so the next run tries again
  return (cache.log[k] = j.gameLog ? j.gameLog.map(g => [g.gameDate, g.teamAbbrev]) : []);
}
// pick the NHL player (several can share a name) who played that season, and his team on that date
async function resolve(yid, onDate) {
  const name = S.names[yid];
  const cands = await nhlPlayer(name);
  let best = null;
  for (const c of cands) { const log = await gameLog(c.id); if (log.length && (!best || log.length > best.log.length)) best = { id: c.id, pos: c.pos, log }; }
  if (!best && cands.length) best = { id: cands[0].id, pos: cands[0].pos, log: [] };
  if (!best) return { name };
  const games = best.log.slice().sort((a, b) => a[0] < b[0] ? -1 : 1);
  const before = games.filter(g => g[0] <= onDate), after = games.filter(g => g[0] > onDate);
  const team = (before.length ? before[before.length - 1] : after[0] || [])[1];
  return { name, pid: String(best.id), nhl: team || undefined, nhlPos: best.pos };
}
const posText = (yid, r) => (S.pos[yid] || (r && r.nhlPos === 'L' ? 'LW' : r && r.nhlPos === 'R' ? 'RW' : r && r.nhlPos) || '').replace(/,/g, '/');

(async () => {
  const out = { weeks: {}, tradeTracker: null };
  // --- top & bottom players
  for (const wk of wkNums) {
    const teams = S.rosters[wk] || {}, all = [];
    for (const [tid, list] of Object.entries(teams)) for (const [yid, slot, pts, played, gi] of list || []) all.push({ yid, tid, pts, played, goalie: gi === 1 });
    const groupOf = async p => { if (p.goalie) return 'G'; if (S.pos[p.yid]) return posGroup(S.pos[p.yid]); const c = (await nhlPlayer(S.names[p.yid]))[0]; return c ? (c.pos === 'D' ? 'D' : c.pos === 'G' ? 'G' : 'F') : 'F'; };
    const pick = async (list, dir) => {
      const sorted = list.slice().sort((a, b) => dir * (b.pts - a.pts)), res = { F: null, D: null, G: null };
      for (const p of sorted) { const g = await groupOf(p); if (!res[g]) res[g] = p; if (res.F && res.D && res.G) break; }
      return res;
    };
    const card = async p => { if (!p) return null; const r = await resolve(p.yid, dates[wk][0]); return { name: S.names[p.yid], nhl: r.nhl, pos: posText(p.yid, r), pts: p.pts, mgr: S.mgr[p.tid], pid: r.pid }; };
    const hi = await pick(all, 1), lo = await pick(all.filter(p => p.played), -1);
    const players = { high: {}, low: {}, faHigh: { F: null, D: null, G: null } };
    for (const k of ['F', 'D', 'G']) { players.high[k] = await card(hi[k]); players.low[k] = await card(lo[k]); }
    out.weeks[wk] = { players, moves: [], trades: [] };
  }
  // --- movement and trades, oldest first
  const tx = S.tx.slice().reverse();
  const trades = [];
  for (const t of tx) {
    const iso = isoOf(t.ts), wk = iso && weekOf(iso);
    if (!wk) continue; // after the regular season
    if (!t.players.length || t.players.some(p => /Traded/.test(p.how))) continue; // trades come from S.trades
    const tid = t.teams[0]; if (!tid || !S.mgr[tid]) continue;
    const adds = [], drops = [];
    for (const p of t.players) {
      const r = await resolve(p.yid, iso), pl = { name: S.names[p.yid], nhl: r.nhl, pos: posText(p.yid, r) };
      if (/^Waiver/.test(p.how)) pl.note = 'waivers';
      (/^To /.test(p.how) ? drops : adds).push(pl);
    }
    const n = Math.max(adds.length, drops.length);
    for (let i = 0; i < n; i++) out.weeks[wk].moves.push({ mgr: S.mgr[tid], add: adds[i] || null, drop: drops[i] || null });
  }
  // trades: one row per receiving side; the sides of one trade share a timestamp
  const byTs = {};
  for (const t of (S.trades || []).slice().reverse()) (byTs[t.ts] = byTs[t.ts] || []).push(t);
  for (const [ts, rowsT] of Object.entries(byTs)) {
    const iso = isoOf(ts), wk = iso && weekOf(iso);
    if (!wk) continue;
    const sides = [];
    for (const t of rowsT) {
      if (!S.mgr[t.to]) continue;
      const gets = [];
      for (const p of t.players) { const r = await resolve(p.yid, iso); gets.push({ yid: p.yid, name: S.names[p.yid], nhl: r.nhl, pos: posText(p.yid, r) }); }
      sides.push({ mgr: S.mgr[t.to], tid: t.to, gets });
    }
    if (sides.length < 2) continue;
    trades.push({ date: iso, sides });
    out.weeks[wk].trades.push({ date: iso, sides: sides.map(sd => ({ mgr: sd.mgr, gets: sd.gets.map(({ yid, ...g }) => g) })) });
  }
  trades.sort((a, b) => a.date < b.date ? -1 : 1);
  // --- trade tracker: points each traded player scored for his new team, week by week, from the trade week on
  const tracked = trades.map(tr => {
    const w0 = weekOf(tr.date);
    return { date: tr.date, sides: tr.sides.map(sd => ({ mgr: sd.mgr, gets: sd.gets.map(g => {
      const byWeek = {}; let last = null;
      for (const wk of wkNums.filter(k => k >= w0)) { const row = ((S.rosters[wk] || {})[sd.tid] || []).find(r => r[0] === g.yid); if (row) { byWeek[wk] = +row[2].toFixed(1); last = wk; } }
      const p = { name: g.name, nhl: g.nhl, pos: g.pos, byWeek };
      if (last && last < lastWk) p.left = dates[last][1];
      return p;
    }) })) };
  });
  out.tradeTracker = { byWeek: true, through: dates[lastWk][1], trades: tracked };

  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  const outFile = path.join(__dirname, 'yahoo_weeks.json');
  const all = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
  all[season] = out;
  fs.writeFileSync(outFile, JSON.stringify(all));
  const cards = Object.values(out.weeks).flatMap(w => ['high', 'low'].flatMap(k => Object.values(w.players[k]))).filter(Boolean);
  console.log(season, '| weeks', Object.keys(out.weeks).length, '| cards', cards.length, 'without NHL team', cards.filter(c => !c.nhl).map(c => c.name).join(', ') || 'none',
    '| moves', Object.values(out.weeks).reduce((a, w) => a + w.moves.length, 0), '| trades', trades.length,
    '| score check', mismatches.length ? mismatches.length + ' mismatches: ' + mismatches.slice(0, 5).join('; ') : 'every team-week matches the sheet');
})();
