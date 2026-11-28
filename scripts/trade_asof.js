// Each traded player's season stats AS OF THE TRADE (NHL regular-season games played before the trade date), turned into
// fantasy points with that season's scoring (reports.json leagueInfo). The Trade history cards show these, so a card reads
// like it did the day the deal was made; the trade tracker above it shows what happened after.
// Usage: node trade_asof.js <RRDJ/site dir> [out.json]   (default out: trade_asof.json next to this script)
//   reads <site>/trades.json (built by trade_history.js) for the trade list, and the NHL stats API (no sign-in).
//   Trades already in out.json are kept (past seasons never change); pass --all to refetch everything,
//   --live to refetch only the current season's trades. Then re-run trade_history.js, which merges the file in.
// out.json: { "<trade id>": { "<player name>": { id, gp, pts, line: { g, a, pm, ... } } } }
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter(a => !a.startsWith('--'));
const site = pos[0] || path.join(__dirname, '..', 'site');
const outFile = pos[1] || path.join(__dirname, 'trade_asof.json');
const reports = JSON.parse(fs.readFileSync(path.join(site, 'reports.json'), 'utf8'));
const trades = JSON.parse(fs.readFileSync(path.join(site, 'trades.json'), 'utf8')).trades;
const out = fs.existsSync(outFile) && !flags.includes('--all') ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const liveId = reports.seasons[reports.seasons.length - 1].id;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const ALIAS = { alexwennberg: 'alexanderwennberg', mitchmarner: 'mitchellmarner', danvladar: 'danielvladar', camatkinson: 'cameronatkinson',
  mathewdumba: 'mattdumba', alexkerfoot: 'alexanderkerfoot', mikecammalleri: 'michaelcammalleri', nicholaspaul: 'nickpaul' };
const scoringOf = id => (reports.leagueInfo.seasons || []).find(s => s.id === id) || {};

async function report(kind, rep, sid, before) {
  const exp = `seasonId=${sid} and gameTypeId=2 and gameDate<"${before}"`;
  // date-filtered (game) reports come back 100 rows at a time: page through them
  const rows = [];
  for (let start = 0; ; start += 100) {
    const u = `https://api.nhle.com/stats/rest/en/${kind}/${rep}?isAggregate=true&isGame=true&limit=100&start=${start}&sort=playerId&cayenneExp=${encodeURIComponent(exp)}`;
    let page = null;
    for (let i = 0; i < 7 && !page; i++) {
      try { const r = await fetch(u); if (r.ok) page = await r.json(); } catch (e) {}
      if (!page) await sleep(1500 * (i + 1));
    }
    if (!page) throw new Error('failed ' + u);
    rows.push(...page.data);
    if (!page.data.length || rows.length >= page.total) return rows;
    await sleep(150);
  }
}
const cache = {};
async function poolBefore(season, date) {
  const key = season + '|' + date;
  if (cache[key]) return cache[key];
  const y = +season.slice(0, 4), sid = `${y}${y + 1}`, pool = {};
  for (const p of await report('skater', 'summary', sid, date)) pool[p.playerId] = { id: p.playerId, name: p.skaterFullName, pos: p.positionCode, team: p.teamAbbrevs,
    gp: p.gamesPlayed, g: p.goals, a: p.assists, pm: p.plusMinus, ppg: p.ppGoals, ppa: p.ppPoints - p.ppGoals, shg: p.shGoals, sha: p.shPoints - p.shGoals,
    gwg: p.gameWinningGoals, sog: p.shots, pim: p.penaltyMinutes, hit: 0, blk: 0, fow: 0 };
  await sleep(300);
  for (const p of await report('skater', 'realtime', sid, date)) if (pool[p.playerId]) Object.assign(pool[p.playerId], { hit: p.hits || 0, blk: p.blockedShots || 0 });
  await sleep(300);
  for (const p of await report('skater', 'faceoffwins', sid, date)) if (pool[p.playerId]) pool[p.playerId].fow = p.totalFaceoffWins || 0;
  await sleep(300);
  for (const p of await report('goalie', 'summary', sid, date)) pool[p.playerId] = { id: p.playerId, name: p.goalieFullName, pos: 'G', team: p.teamAbbrevs,
    gp: p.gamesPlayed, w: p.wins, otl: p.otLosses || 0, ga: p.goalsAgainst, sv: p.saves, so: p.shutouts, g: p.goals || 0, a: p.assists || 0, pim: p.penaltyMinutes || 0 };
  await sleep(300);
  return (cache[key] = pool);
}
// Fantasy points from a stat line with the season's scoring: skater {G, A, +/-, PIM, PPG, PPA, SHG, SHA, GWG, SOG, FOW, HIT, BLK},
// goalie {W, OTL, GA, SV, SO, and any skater stats goalies score (G, A, PIM...)}.
const SK = { G: 'g', A: 'a', '+/-': 'pm', PIM: 'pim', PPG: 'ppg', PPA: 'ppa', SHG: 'shg', SHA: 'sha', GWG: 'gwg', SOG: 'sog', FOW: 'fow', HIT: 'hit', BLK: 'blk' };
const GO = { W: 'w', OTL: 'otl', GA: 'ga', SV: 'sv', SO: 'so', G: 'g', A: 'a', PIM: 'pim', PPG: 'ppg', PPA: 'ppa', SHG: 'shg', SHA: 'sha' };
function points(p, sc) {
  const rule = p.pos === 'G' ? sc.goalie : sc.skater, map = p.pos === 'G' ? GO : SK;
  let s = 0;
  for (const [k, v] of Object.entries(rule || {})) if (typeof v === 'number' && map[k]) s += v * (p[map[k]] || 0);
  return Math.round(s * 10) / 10;
}

(async () => {
  let fetched = 0;
  for (const t of trades.slice().reverse()) {
    if (out[t.id] && !flags.includes('--all') && !(flags.includes('--live') && t.season === liveId)) continue;
    const sc = scoringOf(t.season);
    if (sc.format !== 'points') { out[t.id] = {}; continue; }
    const pool = await poolBefore(t.season, t.date);
    const byName = {}; for (const p of Object.values(pool)) (byName[norm(p.name)] = byName[norm(p.name)] || []).push(p);
    const rec = {};
    for (const sd of t.sides) for (const pl of sd.gets) {
      const k = norm(pl.name), cands = byName[k] || byName[ALIAS[k]] || [];
      // same name twice (e.g. two Sebastian Ahos): prefer the position that matches
      const want = String(pl.pos || '').includes('G') ? 'G' : String(pl.pos || '') === 'D' ? 'D' : 'F';
      const p = cands.find(c => (c.pos === 'G' ? 'G' : c.pos === 'D' ? 'D' : 'F') === want) || cands[0];
      if (!p) { rec[pl.name] = { id: null, gp: 0, pts: 0, line: null }; console.log('  no games before the trade (or no match):', t.id, pl.name); continue; }
      const line = Object.assign({}, p); delete line.id; delete line.name; delete line.team;
      rec[pl.name] = { id: String(p.id), gp: p.gp, pts: points(p, sc), line };
    }
    out[t.id] = rec; fetched++; fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
    console.log(t.id, Object.entries(rec).map(([n, r]) => n + ' ' + r.pts + '/' + r.gp).join(', '));
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log('trade_asof.json:', Object.keys(out).length, 'trades,', fetched, 'fetched now');
})().catch(e => { console.error(e.message); process.exit(1); });
