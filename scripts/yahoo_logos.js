// Each Yahoo season's team logos (the custom uploads and Yahoo's stock icons), for the past-season pages.
// Usage: node yahoo_logos.js <yahoo_logos_raw.json> <teams.csv> <league-site dir>
//   yahoo_logos_raw.json: { "2013": { "<Yahoo team name>": "<logo url>" }, ... } read off each league's /teams page
//   (signed in to Yahoo; season "2013" = 2013-14). teams.csv is the Teams tab (Season, Manager, Team name).
// Downloads every logo to <site>/logos/y<season>-<manager>.<ext> (custom uploads at 192px) and writes
// yahoo_logos.json next to this script: { "2013-14": { manager: "logos/y2013-14-danny.png" } }. legacy_weeks.js uses
// it as that season's logos. The artifact's CSP blocks outside images, so the page only loads these local copies.
const fs = require('fs'), path = require('path');
const [rawFile, teamsFile, site] = process.argv.slice(2);
const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
const byTeam = {};
for (const line of fs.readFileSync(teamsFile, 'utf8').split(/\r?\n/).slice(1).filter(Boolean)) {
  const c = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; }
  c.push(cur);
  (byTeam[c[0]] = byTeam[c[0]] || {})[c[2]] = c[1];
}
(async () => {
  const out = {}, missing = [];
  for (const [y, teams] of Object.entries(raw)) {
    const id = y + '-' + String(+y + 1).slice(2);
    for (const [team, url] of Object.entries(teams)) {
      const m = (byTeam[id] || {})[team];
      if (!m) { missing.push(id + ': ' + team); continue; }
      const big = url.replace('/t_s90sq/', '/t_s192sq/'), ext = (url.match(/\.(png|jpe?g|gif|webp)$/i) || [, 'png'])[1].toLowerCase();
      const rel = 'logos/y' + id + '-' + m.toLowerCase() + '.' + ext, file = path.join(site, rel);
      if (!fs.existsSync(file)) {
        let res = await fetch(big);
        if (!res.ok) res = await fetch(url);
        if (!res.ok) { missing.push(id + ': ' + team + ' (download ' + res.status + ')'); continue; }
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      }
      (out[id] = out[id] || {})[m] = rel;
    }
  }
  fs.writeFileSync(path.join(__dirname, 'yahoo_logos.json'), JSON.stringify(out, null, 1));
  console.log('seasons', Object.keys(out).length, '| logos', Object.values(out).reduce((a, o) => a + Object.keys(o).length, 0), '| missing', missing.length ? missing.join('; ') : 'none');
})();
