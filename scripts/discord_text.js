// Builds the weekly Discord message (rendered markdown, not a code block) from the league site's reports.json.
// Usage: node discord_text.js <reports.json> <season id> <week> [site url] > message.txt
// Same rules as the Discord block in SKILL.md: 3+ streaks with their emoji, top and bottom F/D/G (with a free-agent
// line under a top card when one outscored it), and the season's weekly high-score tally.
const fs = require('fs');
const [file, season, wkArg, site] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const s = r.seasons.find(x => x.id === season);
const w = s && s.weeks.find(x => x.week === +wkArg);
if (!w) throw new Error('no week ' + wkArg + ' in ' + season);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = iso => { const [, m, d] = iso.split('-').map(Number); return MON[m - 1] + ' ' + d; };
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const emoji = (k, n) => k === 'W' ? (n >= 10 ? ':heart_eyes::sweat_drops:' : n >= 6 ? ':hot_face:' : ':fire:') : (n >= 10 ? ':dizzy_face::skull:' : n >= 6 ? ':cold_face:' : ':snowflake:');
const span = w.days === 14 ? 'last 14 days' : 'last 7 days';
const card = (k, p) => p ? `${k}: ${p.name} - ${p.nhl} (${f1(p.pts)}) - ${p.mgr}${p.note ? ' (' + p.note.charAt(0).toLowerCase() + p.note.slice(1) + ')' : ''}` : `${k}: none`;
const out = [`**Week ${w.week} is in the books** (${md(w.start)} – ${md(w.end)})${site ? '\nFull report: <' + site + '#' + season + '-w' + w.week + '>' : ''}`, ''];
out.push('**Streaks (min 3):**');
const st = (w.streaks || []).slice().sort((a, b) => (a.kind === b.kind ? b.n - a.n : a.kind === 'W' ? -1 : 1));
if (!st.length) out.push('None');
for (const x of st) out.push(`${x.n} ${x.kind === 'W' ? 'wins' : 'losses'} ${emoji(x.kind, x.n)}: ${x.mgrs.join(', ')}`);
out.push('', `**Highest scoring (${span}):**`);
for (const k of ['F', 'D', 'G']) {
  out.push(card(k, w.players && w.players.high[k]));
  const fa = w.players && w.players.faHigh && w.players.faHigh[k];
  if (fa) out.push(`   ↳ FA: ${fa.name} - ${fa.nhl} (${f1(fa.pts)}) - ${fa.mgr ? (fa.note || 'picked up').replace(/^Free agent pickup/, 'picked up by ' + fa.mgr).replace(/^Waiver claim/, 'claimed by ' + fa.mgr) : 'unowned'}`);
}
out.push(`**Lowest scoring (${span}):**`);
for (const k of ['F', 'D', 'G']) out.push(card(k, w.players && w.players.low[k]));
out.push('', '**Weekly High Scores:**');
for (const t of w.highScoreTally || []) out.push(`${t.count}: ${t.entries.map(e => `${e.mgr} (${e.weeks.join(',')})`).join(', ')}`);
const text = out.join('\n');
if (text.length > 2000) throw new Error('message too long for Discord (' + text.length + ')');
process.stdout.write(text + '\n');
