// Games played for the Yahoo trade-tracker rows. Yahoo's matchup pages give each player's week (lineup days only) as
// points and a stat line, but no GP. This finds which of his NHL games that week were in the lineup: the set of games
// (NHL game log) whose stats add up to Yahoo's weekly line. A game with no stats at all can't be told apart, so it
// counts as played (he was most likely in the lineup).
// Usage: node yahoo_gp.js        reads yahoo_trade_stats.json, trade_asof.json (NHL ids), week_dates.json
//        writes yahoo_trade_gp.json  { "<season>": { "<week>": { "<mgr>": { "<player>": gp } } } }
const fs = require('fs'), path = require('path');
const dir = __dirname;
const yts = JSON.parse(fs.readFileSync(path.join(dir, 'yahoo_trade_stats.json'), 'utf8'));
const asof = JSON.parse(fs.readFileSync(path.join(dir, 'trade_asof.json'), 'utf8'));
const wd = JSON.parse(fs.readFileSync(path.join(dir, 'week_dates.json'), 'utf8'));
const outFile = path.join(dir, 'yahoo_trade_gp.json');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const ids = {};
for (const t of Object.values(asof)) for (const [n, v] of Object.entries(t)) if (v && v.id) ids[norm(n)] = v.id;
const ALIAS = { mathewdumba: 'mattdumba' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url) {
  for (let i = 0; i < 10; i++) {
    let wait = 2000 * (i + 1);
    try { const r = await fetch(url); if (r.ok) { await sleep(700); return r.json(); } if (r.status === 429) wait = (+r.headers.get('retry-after') || 20) * 1000 + 1000; } catch (e) { }
    await sleep(wait);
  }
  throw new Error('failed ' + url);
}
const logs = {};
async function gameLog(id, sid) {
  const k = id + '|' + sid;
  if (!logs[k]) logs[k] = (await getJSON(`https://api-web.nhle.com/v1/player/${id}/game-log/${sid}/2`)).gameLog || [];
  return logs[k];
}
// Yahoo's stat keys from one NHL game
const line = g => g.shotsAgainst != null || g.decision != null || g.goalsAgainst != null
  ? { W: g.decision === 'W' ? 1 : 0, GA: g.goalsAgainst || 0, SV: (g.shotsAgainst || 0) - (g.goalsAgainst || 0), SHO: g.shutouts || 0 }
  : { G: g.goals || 0, A: g.assists || 0, '+/-': g.plusMinus || 0, PIM: g.pim || 0, PPG: g.powerPlayGoals || 0, PPA: (g.powerPlayPoints || 0) - (g.powerPlayGoals || 0),
      SHG: g.shorthandedGoals || 0, SHA: (g.shorthandedPoints || 0) - (g.shorthandedGoals || 0), GWG: g.gameWinningGoals || 0, SOG: g.shots || 0 };
function bestGP(games, st) {
  const keys = Object.keys(line(games[0] || {})).filter(k => st[k] != null);
  let best = null;
  for (let m = 0; m < 1 << games.length; m++) {
    const sum = {}; let n = 0;
    games.forEach((g, i) => { if (m >> i & 1) { n++; for (const [k, v] of Object.entries(line(g))) sum[k] = (sum[k] || 0) + v; } });
    const off = keys.reduce((a, k) => a + Math.abs((sum[k] || 0) - (+st[k] || 0)), 0);
    if (!best || off < best.off || (off === best.off && n > best.n)) best = { off, n };
  }
  return best;
}
(async () => {
  const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
  let rows = 0, exact = 0, miss = [];
  for (const [season, s] of Object.entries(yts)) {
    const sid = season.slice(0, 4) + (+season.slice(0, 4) + 1);
    for (const [w, mgrs] of Object.entries(s.weeks)) {
      // playoff weeks aren't in week_dates.json: they run on, 7 days each, after the last week listed
      let [a, b] = (wd[season] || {})[w] || [];
      if (!a && wd[season]) { const ks = Object.keys(wd[season]).map(Number), last = Math.max(...ks), e = new Date(wd[season][last][1] + 'T12:00:00Z');
        const st = new Date(+e + ((+w - last - 1) * 7 + 1) * 864e5); a = st.toISOString().slice(0, 10); b = new Date(+st + 6 * 864e5).toISOString().slice(0, 10);
        // the last week can run to the end of the NHL season (2017-18's ran two weeks): no NHL regular-season games come after it anyway
        if (+w === +s.last) b = new Date(+st + 13 * 864e5).toISOString().slice(0, 10); }
      if (!a) { miss.push(season + ' wk ' + w + ' no dates'); continue; }
      for (const [mgr, m] of Object.entries(mgrs)) for (const p of m.players || []) {
        const id = ids[norm(p.name)] || ids[ALIAS[norm(p.name)]];
        if (!id) { miss.push(season + ' ' + p.name + ' no id'); continue; }
        const st = p.st || {};
        const games = (await gameLog(id, sid)).filter(g => g.gameDate >= a && g.gameDate <= b);
        const r = games.length ? bestGP(games, st) : { off: 0, n: 0 };
        rows++; if (r.off === 0) exact++; else miss.push(season + ' wk ' + w + ' ' + mgr + ' ' + p.name + ' off by ' + r.off);
        ((out[season] = out[season] || {})[w] = out[season][w] || {});
        (out[season][w][mgr] = out[season][w][mgr] || {})[p.name] = r.n;
      }
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(rows + ' player-weeks, ' + exact + ' exact matches');
  if (miss.length) console.log(miss.join('\n'));
})();
