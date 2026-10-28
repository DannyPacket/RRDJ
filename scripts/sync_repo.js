// Copy the league site into the RRDJ repo as a standalone static site (for GitHub / Netlify).
// Usage: node sync_repo.js <league-site dir> <RRDJ repo dir>
// The artifact's index.html is a fragment (the artifact host adds the document skeleton), so this wraps it in a
// full HTML document with charset and viewport. reports.json and logos/ are copied as-is into <repo>/site.
// The weekly scripts go to <repo>/scripts with the Google Sheet id replaced by a placeholder (the repo is public).
const fs = require('fs'), path = require('path');
const [src, repo] = process.argv.slice(2);
const site = path.join(repo, 'site');
fs.mkdirSync(path.join(site, 'logos'), { recursive: true });

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8').replace(/^<meta name="claude:[^>]*>\n/m, '');
const cut = html.indexOf('</style>') + '</style>'.length;
html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  html.slice(0, cut) + '\n</head>\n<body>\n' + html.slice(cut).replace(/^\n+/, '') + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(site, 'index.html'), html);
fs.copyFileSync(path.join(src, 'reports.json'), path.join(site, 'reports.json'));
for (const d of ['logos', 'players', 'teams']) {
  if (!fs.existsSync(path.join(src, d))) continue;
  fs.mkdirSync(path.join(site, d), { recursive: true });
  for (const f of fs.readdirSync(path.join(src, d))) fs.copyFileSync(path.join(src, d, f), path.join(site, d, f));
}

const scripts = path.join(repo, 'scripts');
fs.mkdirSync(scripts, { recursive: true });
for (const f of ['fantrax_pull.js', 'nhl_lock.js', 'history.js', 'legacy_weeks.js', 'week_dates.json', 'player_images.js', 'voice.js', 'sync_repo.js']) {
  const text = fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/spreadsheets\/d\/[\w-]+/g, 'spreadsheets/d/<SHEET_ID>');
  fs.writeFileSync(path.join(scripts, f), text);
}
console.log('synced', fs.readdirSync(site).join(', '), '| scripts', fs.readdirSync(scripts).length);
