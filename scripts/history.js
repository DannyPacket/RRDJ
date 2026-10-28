// League history for the site, built from the sheet's Master tab CSV export (every season, every week).
// Games are regular-season rows only (Season Type, column P); categories seasons (Scoring, column Q) keep their
// final places and champion but no games, since their scores aren't points.
// Usage: node history.js <tab.csv> <reports.json>
//   tab.csv: curl -sL "https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=771004"
// Also catRecords: { season: { mgr: [W, L, T] } } for categories seasons, and catGames: the same [season, week, a, aCats, b, bCats]
// rows for their regular-season weeks (categories won). The site counts those only for W-L-T, win %, places and
// head-to-head, never for points stats or records.
// Writes reports.json.history = { games: [[season, week, a, aPts, b, bPts]], finals: { season: { mgr: place } }, champions: { season: mgr },
//   odd: { season: { week: "long" | "short" } }, regular: { season: { mgr: place after the last regular-season week } } }
// "odd" weeks are periods whose average score is 30% above or below that season's median week (multi-week breaks,
// short holiday weeks). The site leaves them out of single-week score records.
// Each game appears once. Week 100 rows are final places, not games.
const fs = require('fs');
const [csvFile, reportsFile] = process.argv.slice(2);
const rows = fs.readFileSync(csvFile, 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const out = []; let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}).slice(1);
const num = s => parseFloat(String(s).replace(/,/g, ''));
const games = [], catGames = [], playoffGames = [], pseen = new Set(), seen = new Set(), finals = {}, lastWk = {}, regular = {}, catRecords = {};
for (const [season, team, week, opp, place, , pf, pa, , cw, cl, ct, , , , type, scoring] of rows) {
  const wk = Number(week);
  if (wk === 100) {
    (finals[season] = finals[season] || {})[team] = Number(place);
    // categories seasons: keep the season W-L-T for display (finishes table), never for points stats
    if (scoring === 'Categories') (catRecords[season] = catRecords[season] || {})[team] = [Number(cw), Number(cl), Number(ct)];
    continue;
  }
  if (type === 'Playoffs' || type === 'Consolation') {
    // playoff and consolation games: [season, week, type, a, aPts, b, bPts] (categories seasons in categories won)
    const pk = season + '|' + wk + '|' + [team, opp].sort().join('|');
    // a game whose scores aren't known yet keeps null scores; the site takes the winner from the final places
    if (opp && !pseen.has(pk)) { pseen.add(pk); playoffGames.push([season, wk, type, team, pf === '' ? null : num(pf), opp, pa === '' ? null : num(pa)]); }
    continue;
  }
  if (type && type !== 'Regular') continue;
  if (!opp || pf === '' || pa === '') continue;
  if (wk > (lastWk[season] || 0)) { lastWk[season] = wk; regular[season] = {}; }
  if (wk === lastWk[season] && place !== '') regular[season][team] = Number(place);
  const key = season + '|' + wk + '|' + [team, opp].sort().join('|');
  if (seen.has(key)) continue;
  seen.add(key);
  (scoring === 'Categories' ? catGames : games).push([season, wk, team, num(pf), opp, num(pa)]);
}
playoffGames.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]));
for (const g of [games, catGames]) g.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]));
const champions = Object.fromEntries(Object.entries(finals).map(([s, f]) => [s, Object.keys(f).find(m => f[m] === 1)]).filter(([, m]) => m));
const odd = {};
for (const season of new Set(games.map(g => g[0]))) {
  const avg = {};
  games.filter(g => g[0] === season).forEach(g => { (avg[g[1]] = avg[g[1]] || []).push(g[3], g[5]); });
  const means = Object.entries(avg).map(([w, v]) => [w, v.reduce((a, b) => a + b, 0) / v.length]);
  const med = means.map(x => x[1]).sort((a, b) => a - b)[means.length >> 1];
  for (const [w, m] of means) if (m > med * 1.3 || m < med * 0.7) (odd[season] = odd[season] || {})[w] = m > med ? "long" : "short";
}
const r = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
// Category totals and per-category records for categories seasons, pulled once from Yahoo's Team Stats page (cat_stats.json)
const catFile = require('path').join(__dirname, 'cat_stats.json');
const catStats = fs.existsSync(catFile) ? JSON.parse(fs.readFileSync(catFile, 'utf8')) : {};
r.history = { games, catGames, playoffGames, finals, champions, odd, regular, catRecords, catStats };
fs.writeFileSync(reportsFile, JSON.stringify(r, null, 1));
console.log('games', games.length, '| categories games', catGames.length, '| playoff games', playoffGames.length, '| finals', Object.keys(finals).join(', '), '| champions', JSON.stringify(champions), '| odd weeks', JSON.stringify(odd));
