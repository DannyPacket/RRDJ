// Team logos as they looked each season (NHL standings for a mid-season date give the logo in use then).
// Usage: node nhl_logos.js 2013 2026  -> nhl/logos.json { "<season>": { "<ABBR>": "<light svg url>" } } (dark = swap _light for _dark)
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, 'nhl', 'logos.json');
const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const [from, to] = process.argv.slice(2).map(Number);
const dateFor = y => y === 2020 ? '2021-03-01' : y === new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0) ? new Date().toISOString().slice(0, 10) : (y + 1) + '-01-15';
(async () => {
  for (let y = from; y <= to; y++) {
    const r = await fetch('https://api-web.nhle.com/v1/standings/' + dateFor(y));
    const j = await r.json(), id = y + '-' + String(y + 1).slice(2);
    out[id] = Object.fromEntries(j.standings.map(t => [t.teamAbbrev.default, t.teamLogo]));
    console.log(id, Object.keys(out[id]).length, 'teams');
    await new Promise(z => setTimeout(z, 500));
  }
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
})();
