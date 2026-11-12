// Builds the site's Draft History data: every draft since 2013-14 with how each pick turned out.
// Usage: node draft_build.js <site dir>      (writes <site dir>/drafts.json)
// Inputs in this folder:
//   yahoo_picks.json   { "<start year>": { league, picks: [[round, yahooId, name, yahoo team name], ...] } } in pick order
//   fantrax_2026.json  { picks: [[round, fxId, name, mgr, nhl, pos]], stats: { fxId: [fpts, gp] } }  (Fantrax draft + season so far)
//   teams.csv          the sheet's Teams tab (season, manager, team name) to turn Yahoo team names into managers
//   scoring.json       league scoring per season; "categories" for 2014-15
//   nhl/<season>.json  NHL regular-season totals (nhl_season_stats.js; re-run it for the current season each week)
// Season points = each player's full NHL season scored with that year's league settings (no matter who rostered him).
// For the season in progress, Fantrax's own points so far are used for drafted players.
// value = points - points of the Nth-best player that season, where N = the pick number (what that slot "should" return).
const fs = require('fs'), path = require('path');
const here = __dirname, site = process.argv[2];
if (!site) { console.error('usage: node draft_build.js <site dir>'); process.exit(1); }
const read = f => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
const yahoo = read('yahoo_picks.json'), fx = read('fantrax_2026.json'), scoring = read('scoring.json');
const sid = y => y + '-' + String(+y + 1).slice(2);

const teams = {};
for (const l of fs.readFileSync(path.join(here, 'teams.csv'), 'utf8').trim().split(/\r?\n/).slice(1)) {
  const m = l.match(/^([^,]+),([^,]+),(.*)$/); if (!m) continue;
  const name = m[3].replace(/^"|"$/g, '').replace(/""/g, '"').trim().toLowerCase();
  (teams[m[1]] = teams[m[1]] || {})[name] = m[2];
}

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const ALIAS = { // league-site spelling -> NHL spelling, when they differ beyond accents/punctuation
  'alex wennberg': 'alexander wennberg', 'mitch marner': 'mitchell marner', 'dan vladar': 'daniel vladar',
  'cam atkinson': 'cameron atkinson', 'mathew dumba': 'matt dumba', 'alex kerfoot': 'alexander kerfoot', 'alexander syomin': 'alexander semin', 'mike cammalleri': 'michael cammalleri',
  'tj oshie': 'tj oshie', 'pierreluc dubois': 'pierreluc dubois', 'zach aston reese': 'zach astonreese', 'nicholas paul': 'nick paul'
};
const posOf = p => p.pos === 'G' ? 'G' : p.pos === 'D' ? 'D' : { C: 'C', L: 'LW', R: 'RW' }[p.pos] || p.pos;
const grp = p => p === 'G' ? 'G' : p === 'D' ? 'D' : 'F';

function pointsFor(p, S) {
  if (p.pos === 'G') return (S.w || 0) * (p.w || 0) + (S.otl || 0) * (p.otl || 0) + (S.ga || 0) * (p.ga || 0) + (S.sv || 0) * (p.sv || 0) + (S.so || 0) * (p.so || 0);
  const ppa = (p.ppp || 0) - (p.ppg || 0), sha = (p.shp || 0) - (p.shg || 0);
  return (S.g || 0) * p.g + (S.a || 0) * p.a + (S.pm || 0) * p.pm + (S.ppg || 0) * p.ppg + (S.ppa || 0) * ppa + (S.shg || 0) * p.shg + (S.sha || 0) * sha +
    (S.gwg || 0) * p.gwg + (S.sog || 0) * p.sog + (S.fow || 0) * (p.fow || 0) + (S.hit || 0) * (p.hit || 0) + (S.blk || 0) * (p.blk || 0) + (S.pim || 0) * (p.pim || 0);
}
// 2014-15 categories: a z-score value (skaters G A +/- PIM PPP SHP SOG FW HIT BLK; goalies W GAA SV% SHO, doubled so a goalie
// counts about like his share of the categories). Pool = skaters with 20+ GP, goalies with 15+ GP.
function catValues(pl) {
  const sk = pl.filter(p => p.pos !== 'G' && p.gp >= 20), gl = pl.filter(p => p.pos === 'G' && p.gp >= 15);
  const stat = (arr, f) => { const v = arr.map(f), m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1; return x => (f(x) - m) / sd; };
  const SK = [p => p.g, p => p.a, p => p.pm, p => p.pim, p => p.ppp, p => p.shp, p => p.sog, p => p.fow || 0, p => p.hit || 0, p => p.blk || 0].map(f => stat(sk, f));
  const gaa = p => p.gp ? p.ga / p.gp : 9, svp = p => p.sv + p.ga ? p.sv / (p.sv + p.ga) : 0;
  const GL = [stat(gl, p => p.w), stat(gl, p => -gaa(p)), stat(gl, svp), stat(gl, p => p.so)];
  for (const p of pl) p.pts = p.pos === 'G' ? (p.gp ? 2 * GL.reduce((a, z) => a + z(p), 0) : -10) : SK.reduce((a, z) => a + z(p), 0);
}

function season(y, picksIn, live) {
  const id = sid(y), file = path.join(here, 'nhl', id + '.json');
  const nhl = fs.existsSync(file) ? Object.entries(JSON.parse(fs.readFileSync(file, 'utf8'))).map(([id, p]) => Object.assign(p, { id: +id })) : [];
  const S = scoring[y], cat = S === 'categories';
  if (cat) catValues(nhl); else for (const p of nhl) p.pts = pointsFor(p, S);
  const byName = {};
  for (const p of nhl) (byName[norm(p.name)] = byName[norm(p.name)] || []).push(p);
  const find = name => {
    let k = norm(name); k = ALIAS[k] || k;
    let c = byName[k];
    if (!c) { // same last name, first names that start alike (Alex/Alexander, Mike/Michael)
      const [f, ...rest] = k.split(' '), last = rest.join(' ');
      c = nhl.filter(p => { const [f2, ...r2] = norm(p.name).split(' '); return r2.join(' ') === last && (f2.startsWith(f.slice(0, 3)) || f.startsWith(f2.slice(0, 3))); });
      if (!c.length) return null;
    }
    return c.slice().sort((a, b) => b.pts - a.pts)[0]; // two players, one name (Sebastian Aho): the one who mattered
  };
  const sorted = nhl.map(p => p.pts).sort((a, b) => b - a);
  const rankOf = pts => sorted.findIndex(v => v <= pts + 1e-9) + 1;
  const unmatched = [];
  const picks = picksIn.map((p, i) => {
    const n = find(p.name);
    if (!n && !live) unmatched.push(p.name);
    let pts = n ? n.pts : (cat ? null : 0), gp = n ? n.gp : 0;
    if (live && p.fx) { pts = p.fx[0]; gp = p.fx[1]; }
    const pos = p.pos || (n ? posOf(n) : '');
    const team = p.nhl || (n ? String(n.team || '').split(',').pop() : '');
    const rank = pts == null || !gp ? null : rankOf(pts); // no games = no finish
    const slot = sorted[i] != null ? sorted[i] : 0;
    // stat line from NHL.com: skaters [gp, g, a, +/-, ppp, sog, hit, blk]; goalies [gp, w, otl, ga, sv, so]
    const line = !n ? null : n.pos === 'G' ? [n.gp, n.w, n.otl, n.ga, n.sv, n.so] : [n.gp, n.g, n.a, n.pm, n.ppp, n.sog, n.hit || 0, n.blk || 0];
    const draftTeam = n ? String(n.team || '').split(',')[0] : (p.nhl || '');
    return [p.mgr, p.name, pos, team, pts == null ? null : Math.round(pts * 10) / 10, gp, rank, pts == null ? null : Math.round((pts - slot) * 10) / 10, null, n ? n.id : null, draftTeam, line];
  });
  // position finish (among all NHL players at F / D / G)
  const posSorted = { F: [], D: [], G: [] };
  for (const p of nhl) posSorted[grp(posOf(p))].push(p.pts);
  for (const k in posSorted) posSorted[k].sort((a, b) => b - a);
  for (const p of picks) { const arr = posSorted[grp(p[2].split('/')[0])]; p[8] = p[4] == null || p[6] == null ? null : arr.findIndex(v => v <= p[4] + 1e-9) + 1; }
  const rounds = Math.max(...picksIn.map(p => p.round));
  if (unmatched.length) console.log(id, 'not found in NHL stats (0 GP that season?):', unmatched.join(', '));
  return { id, src: +y >= 2026 ? 'Fantrax' : 'Yahoo', scoring: cat ? 'categories' : 'points', live: !!live, rounds, teams: picksIn.filter(p => p.round === 1).map(p => p.mgr), picks };
}

const logoFile = path.join(here, 'nhl', 'logos.json');
const out = { built: new Date().toISOString().slice(0, 10), cols: ['mgr', 'player', 'pos', 'nhl', 'pts', 'gp', 'rank', 'value', 'posRank', 'nhlId', 'draftTeam', 'line'],
  logos: fs.existsSync(logoFile) ? JSON.parse(fs.readFileSync(logoFile, 'utf8')) : {}, seasons: [] };
for (const y of Object.keys(yahoo).sort()) {
  const id = sid(y), T = teams[id] || {};
  const picks = yahoo[y].picks.map(([round, yid, name, team]) => {
    const mgr = T[team.toLowerCase()];
    if (!mgr) throw new Error(id + ': no manager for team "' + team + '"');
    return { round, name, mgr };
  });
  out.seasons.push(season(y, picks, false));
}
out.seasons.push(season('2026', fx.picks.map(([round, fid, name, mgr, nhl, pos]) => ({ round, name, mgr, nhl, pos, fx: fx.stats[fid] })), true));
fs.writeFileSync(path.join(site, 'drafts.json'), JSON.stringify(out));
console.log('wrote', path.join(site, 'drafts.json'), out.seasons.map(s => s.id + ':' + s.picks.length).join(' '));
