// Headshots and NHL team logos for the site's top/bottom player cards.
// Usage: node player_images.js <league-site dir>
// For every player card in reports.json (high, low and free-agent notes) it finds the NHL player id (NHL search API,
// matched on name, then team and position), downloads the headshot to players/<id>.png and the team logos to
// teams/<ABBR>_light.svg and teams/<ABBR>_dark.svg, and stores pid on the card. Files already downloaded are kept.
// The artifact's CSP blocks outside images, so the page only ever loads these local copies.
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const file = path.join(dir, 'reports.json');
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
fs.mkdirSync(path.join(dir, 'players'), { recursive: true });
fs.mkdirSync(path.join(dir, 'teams'), { recursive: true });
const POS = { F: ['C', 'L', 'R'], D: ['D'], G: ['G'] };

async function save(url, out) {
  if (fs.existsSync(out)) return true;
  const res = await fetch(url);
  if (!res.ok) return false;
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return true;
}
async function findId(p, group) {
  const q = encodeURIComponent(p.name);
  const hits = await fetch(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=20&q=${q}`).then(x => x.json()).catch(() => []);
  const same = hits.filter(h => h.name.toLowerCase() === p.name.toLowerCase());
  const pool = same.length ? same : hits;
  const score = h => (h.teamAbbrev === p.nhl || h.lastTeamAbbrev === p.nhl ? 2 : 0) + (POS[group] && POS[group].includes(h.positionCode) ? 1 : 0) + (h.active ? 0.5 : 0);
  return pool.sort((a, b) => score(b) - score(a))[0] || null;
}

(async () => {
  let found = 0, missing = [];
  for (const s of r.seasons) for (const w of s.weeks) {
    if (!w.players) continue;
    for (const kind of ['high', 'low', 'faHigh']) for (const [group, p] of Object.entries(w.players[kind] || {})) {
      if (!p || !p.name) continue;
      if (p.nhl) for (const v of ['light', 'dark']) await save(`https://assets.nhle.com/logos/nhl/svg/${p.nhl}_${v}.svg`, path.join(dir, 'teams', `${p.nhl}_${v}.svg`));
      if (!p.pid) {
        const hit = await findId(p, group);
        if (!hit) { missing.push(p.name); continue; }
        p.pid = String(hit.playerId);
      }
      const shot = path.join(dir, 'players', p.pid + '.png');
      if (!fs.existsSync(shot)) {
        const land = await fetch(`https://api-web.nhle.com/v1/player/${p.pid}/landing`).then(x => x.json()).catch(() => null);
        if (!land || !land.headshot || !(await save(land.headshot, shot))) { missing.push(p.name + ' (no headshot)'); continue; }
      }
      found++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(r, null, 1));
  console.log('cards with headshots', found, '| missing', missing.length ? missing.join(', ') : 'none',
    '| players', fs.readdirSync(path.join(dir, 'players')).length, '| team logos', fs.readdirSync(path.join(dir, 'teams')).length);
})();
