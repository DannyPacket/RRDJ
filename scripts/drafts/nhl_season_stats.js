// Regular-season totals for every NHL player, per season, from the NHL stats API (no sign-in needed).
// Usage: node nhl_season_stats.js 2013 2025   -> drafts/nhl/<y>-<y+1>.json for each start year (skipped if present)
// Each file: { "<playerId>": { name, pos ("C"/"L"/"R"/"D"/"G"), team, gp, g, a, pm, ppg, ppp, shg, shp, gwg, sog, pim, hit, blk, fow,
//   (goalies) w, otl, ga, sv, so } }. draft_build.js turns these into fantasy points with each season's scoring.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'nhl'); fs.mkdirSync(dir, { recursive: true });
const [from, to] = process.argv.slice(2).map(Number);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function report(kind, rep, sid) {
  const u = `https://api.nhle.com/stats/rest/en/${kind}/${rep}?isAggregate=false&isGame=false&limit=-1&start=0&cayenneExp=seasonId=${sid}%20and%20gameTypeId=2`;
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(u); if (r.ok) return (await r.json()).data; } catch (e) {}
    await sleep(1500 * (i + 1));
  }
  throw new Error('failed ' + u);
}
(async () => {
  for (let y = from; y <= to; y++) {
    const file = path.join(dir, `${y}-${String(y + 1).slice(2)}.json`);
    if (fs.existsSync(file)) { console.log('have', file); continue; }
    const sid = `${y}${y + 1}`, out = {};
    for (const p of await report('skater', 'summary', sid)) out[p.playerId] = {
      name: p.skaterFullName, pos: p.positionCode, team: p.teamAbbrevs, gp: p.gamesPlayed, g: p.goals, a: p.assists, pm: p.plusMinus,
      ppg: p.ppGoals, ppp: p.ppPoints, shg: p.shGoals, shp: p.shPoints, gwg: p.gameWinningGoals, sog: p.shots, pim: p.penaltyMinutes };
    await sleep(400);
    for (const p of await report('skater', 'realtime', sid)) if (out[p.playerId]) Object.assign(out[p.playerId], { hit: p.hits || 0, blk: p.blockedShots || 0 });
    await sleep(400);
    for (const p of await report('skater', 'faceoffwins', sid)) if (out[p.playerId]) out[p.playerId].fow = p.totalFaceoffWins || 0;
    await sleep(400);
    for (const p of await report('goalie', 'summary', sid)) out[p.playerId] = {
      name: p.goalieFullName, pos: 'G', team: p.teamAbbrevs, gp: p.gamesPlayed, w: p.wins, otl: p.otLosses, ga: p.goalsAgainst, sv: p.saves,
      so: p.shutouts, g: p.goals || 0, a: p.assists || 0, pim: p.penaltyMinutes || 0 };
    fs.writeFileSync(file, JSON.stringify(out));
    console.log(file, Object.keys(out).length, 'players');
    await sleep(600);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
