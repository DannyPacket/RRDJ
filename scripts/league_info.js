// League details for the site's "League details" tab: each season's scoring settings and basics, for the record.
// Usage: node league_info.js <site dir>      (updates <site dir>/reports.json -> leagueInfo)
// Sources: drafts/scoring.json (point values read off each Yahoo league's settings page and Fantrax's league rules),
// cat_stats.json (2014-15's categories), drafts.json (draft rounds), reports.json (teams, platform, history).
// Run it again when a season's scoring changes or a new season starts (add that season to drafts/scoring.json first).
const fs = require('fs'), path = require('path');
const site = process.argv[2];
if (!site) { console.error('usage: node league_info.js <site dir>'); process.exit(1); }
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const scoring = read(path.join(__dirname, 'drafts', 'scoring.json'));
const cats = read(path.join(__dirname, 'cat_stats.json'));
const repFile = path.join(site, 'reports.json'), rep = read(repFile);
const drafts = fs.existsSync(path.join(site, 'drafts.json')) ? read(path.join(site, 'drafts.json')) : { seasons: [] };
const H = rep.history || {};

// scoring.json keys -> [group, display key]. Goalie-only keys, plus a season's `goalie` block (goalies' own offense).
const SK = { g: 'G', a: 'A', pm: '+/-', ppg: 'PPG', ppa: 'PPA', ppp: 'PPP', shg: 'SHG', sha: 'SHA', shp: 'SHP', gwg: 'GWG', sog: 'SOG', fow: 'FOW', hit: 'HIT', blk: 'BLK', pim: 'PIM' };
const GK = { w: 'W', otl: 'OTL', ga: 'GA', sv: 'SV', so: 'SO', gaa: 'GAA', svp: 'SV%' };
const CAT_KEY = { G: ['skater', 'G'], A: ['skater', 'A'], '+/-': ['skater', '+/-'], PIM: ['skater', 'PIM'], PPP: ['skater', 'PPP'], SHP: ['skater', 'SHP'], SOG: ['skater', 'SOG'],
  FW: ['skater', 'FOW'], HIT: ['skater', 'HIT'], BLK: ['skater', 'BLK'], W: ['goalie', 'W'], GAA: ['goalie', 'GAA'], 'SV%': ['goalie', 'SV%'], SHO: ['goalie', 'SO'] };

const seasons = rep.seasons.map(s => {
  const y = s.id.slice(0, 4), sc = scoring[y], out = { id: s.id, platform: +y >= 2026 ? 'Fantrax' : 'Yahoo', teams: Object.keys(s.teams || {}).length };
  if (sc === 'categories') {
    out.format = 'categories';
    out.skater = {}; out.goalie = {};
    for (const c of (cats[s.id] || {}).cats || []) { const [g, k] = CAT_KEY[c] || ['skater', c]; out[g][k] = true; }
    out.lowWins = (cats[s.id] || {}).lowWins || [];
  } else if (sc) {
    out.format = 'points';
    out.skater = {}; out.goalie = {};
    for (const [k, v] of Object.entries(sc)) if (SK[k]) out.skater[SK[k]] = v; else if (GK[k]) out.goalie[GK[k]] = v;
    for (const [k, v] of Object.entries(sc.goalie || {})) if (SK[k]) out.goalie[SK[k]] = v;
  }
  const d = drafts.seasons.find(x => x.id === s.id);
  if (d) out.draftRounds = d.rounds;
  const regWeeks = new Set([...(H.games || []), ...(H.catGames || [])].filter(g => g[0] === s.id).map(g => g[1]));
  out.regularWeeks = regWeeks.size || null;
  const po = new Set((H.playoffGames || []).filter(g => g[0] === s.id && g[2] === 'Playoffs').flatMap(g => [g[3], g[5]]));
  out.playoffTeams = po.size || null;
  out.champion = (H.champions || {})[s.id] || null;
  out.live = !(H.finals || {})[s.id] && s === rep.seasons[rep.seasons.length - 1];
  return out;
});
rep.leagueInfo = { built: new Date().toISOString().slice(0, 10), seasons };
fs.writeFileSync(repFile, JSON.stringify(rep));
for (const s of seasons) console.log(s.id, s.platform, s.format, 'teams', s.teams, 'rounds', s.draftRounds, 'wks', s.regularWeeks, 'po', s.playoffTeams, 'champ', s.champion,
  '| skater', JSON.stringify(s.skater), '| goalie', JSON.stringify(s.goalie));
