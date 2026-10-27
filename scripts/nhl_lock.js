// Roster lock for a scoring period = puck drop of the first NHL game on the period's first day, in Eastern time.
// Usage: node nhl_lock.js <schedule.json> <YYYY-MM-DD>
//   where schedule.json is: curl -sL https://api-web.nhle.com/v1/schedule/<YYYY-MM-DD>
// Prints e.g. 2026-10-12T13:00  (use it as __LOCK__ in fantrax_pull.js)
const fs = require('fs');
const [file, day] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const games = ((j.gameWeek || []).find(d => d.date === day) || { games: [] }).games;
if (!games.length) { console.error('no NHL games on ' + day); process.exit(1); }
const first = games.map(g => g.startTimeUTC).sort()[0];
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  .formatToParts(new Date(first)).map(p => [p.type, p.value]));
console.log(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`);
