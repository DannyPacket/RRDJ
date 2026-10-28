// Weekly-report entries for past seasons, rebuilt from the sheet (no Fantrax data: no player cards, moves or trades).
// Usage: node legacy_weeks.js <master.csv> <reports.json>   (Master tab: gid=771004; regular-season rows and week 100 only,
// categories seasons skipped)
// For every season in the sheet that reports.json doesn't already hold as a Fantrax season, (re)writes
// seasons[] = { id, label, source: "sheet", logos, schedule, weeks: [...] } with matchups, standings (sheet rank,
// cumulative W-L-T/PF/PA, streak), 3+ streaks, high-score tally, the next week's pairings and a short recap
// written from the numbers. Week 100 is the final-standings entry. Seasons stay sorted by id, so the newest
// (Fantrax) season stays last, which the site treats as the current season.
const fs = require('fs');
const [csvFile, reportsFile, teamsFile] = process.argv.slice(2); // teamsFile (optional): Teams tab CSV, gid=771005 (Season, Manager, Team name)
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
const r = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
const odd = (r.history && r.history.odd) || {};
const fantrax = new Set(r.seasons.filter(s => s.source !== 'sheet').map(s => s.id));
const logos = (r.seasons.find(s => s.logos) || {}).logos || {};
const BROTHERS = [['Will', 'Tom', 'Tim', 'Danny'], ['Nick', 'Vin']];
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
// Categories seasons (2014-15) score each week in categories won, so their numbers print as whole numbers
let CAT = false;
const f1 = n => CAT ? String(Math.round(n)) : (Math.round(n * 10) / 10).toFixed(1);
const catSeasons = new Set();
const rel = (a, b) => {
  if (BROTHERS.some(g => g.includes(a) && g.includes(b))) return 'brother vs. brother';
  if ([a, b].includes('Hallie') && [a, b].includes('Will')) return 'husband vs. wife';
  if ([a, b].includes('Hallie') && BROTHERS[0].some(x => [a, b].includes(x))) return 'in-law';
  if ([a, b].includes('Zac') && ['Nick', 'Vin'].some(x => [a, b].includes(x))) return 'zac';
  return null;
};

// Team names per season from the Teams tab (quoted CSV fields are allowed)
const teamNames = {};
if (teamsFile) for (const line of fs.readFileSync(teamsFile, 'utf8').split(/\r?\n/).slice(1).filter(Boolean)) {
  const c = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; }
  c.push(cur);
  if (c[0] && c[1]) (teamNames[c[0]] = teamNames[c[0]] || {})[c[1]] = c[2];
}

// Week dates (week end = the Monday Yahoo applies stat corrections, minus a day), from week_dates.json next to this file
const datesFile = require('path').join(__dirname, 'week_dates.json');
const weekDates = fs.existsSync(datesFile) ? JSON.parse(fs.readFileSync(datesFile, 'utf8')) : {};
const allFinals = {};
const series = []; // [season, week, a, aPts, b, bPts], each game once
{
  const seen = new Set();
  for (const [season, team, week, opp, , , pf, pa, , , , , , , , type, scoring] of rows) {
    if (scoring === 'Categories' || (type && type !== 'Regular') || Number(week) === 100 || !opp || pf === '' || pa === '') continue;
    const k = season + '|' + week + '|' + [team, opp].sort().join('|');
    if (seen.has(k)) continue;
    seen.add(k); series.push([season, Number(week), team, num(pf), opp, num(pa)]);
  }
  series.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]));
}
const bySeason = {};
for (const [season, team, week, opp, place, , pf, pa, , , , , , , , type, scoring] of rows) {
  if (Number(week) === 100) (allFinals[season] = allFinals[season] || {})[team] = Number(place);
  if (fantrax.has(season)) continue;
  if (scoring === 'Categories') catSeasons.add(season);
  const S = bySeason[season] = bySeason[season] || { rank: {}, games: {}, finals: {}, post: {} };
  const wk = Number(week);
  if (type === 'Playoffs' || type === 'Consolation') {
    if (opp && pf !== '' && pa !== '') (S.post[wk] = S.post[wk] || {})[team] = { opp, p: num(pf), q: num(pa), type };
    continue;
  }
  if (type && type !== 'Regular' && type !== 'Final') continue;
  if (wk === 100) { S.finals[team] = Number(place); continue; }
  if (!opp || pf === '' || pa === '') continue;
  (S.rank[wk] = S.rank[wk] || {})[team] = Number(place);
  (S.games[wk] = S.games[wk] || {})[team] = { opp, p: num(pf), q: num(pa) };
}

const seasonIds = [...new Set([...Object.keys(teamNames), ...Object.keys(allFinals), ...Object.keys(bySeason)])].sort();
const champOf = y => { const f = allFinals[y] || {}; return Object.keys(f).find(m => f[m] === 1) || null; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = iso => { const [, m, d] = iso.split('-').map(Number); return MON[m - 1] + ' ' + d; };
const covers = (dw, mmdd) => { if (!dw) return false; const [a, b] = dw; const y = a.slice(0, 4), y2 = b.slice(0, 4); return [y, y2].some(Y => a <= Y + '-' + mmdd && Y + '-' + mmdd <= b); };
const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
// What the February break was each year (any other long winter week is the All-Star break)
const FEB_BREAK = { '2013-14': 'Sochi Olympic', '2021-22': 'February (All-Star weekend plus the Olympic window the NHL ended up skipping)', '2024-25': '4 Nations Face-Off', '2025-26': 'Milan-Cortina Olympic' };
const tagOf = (a, b) => {
  const k = rel(a, b);
  return k === 'brother vs. brother' ? ' (brother vs. brother)' : k === 'husband vs. wife' ? ' (and it\'s husband vs. wife)' : k === 'in-law' ? ' (in-law edition)'
    : k === 'zac' ? ' (Zac vs. one of the brothers who supposedly run his account)' : '';
};
const recStr = x => x.w + '-' + x.l + (x.t ? '-' + x.t : '');

function welcome(id, mgrs) {
  const i = seasonIds.indexOf(id), prev = seasonIds[i - 1];
  const prevM = prev ? Object.keys(teamNames[prev] || {}) : [];
  const ins = prev ? mgrs.filter(m => !prevM.includes(m)) : [], outs = prev ? prevM.filter(m => !mgrs.includes(m)) : [];
  const parts = [`Welcome to the ${id} season of Rene Rancourt's Day Job!`];
  if (!prev) parts.push('Twelve managers, one trophy, and a long winter ahead.');
  else if (prev === '2019-20') parts.push('Nobody lifted the trophy after the pandemic cut 2019-20 short, so the title is wide open.');
  else if (champOf(prev)) parts.push(`${champOf(prev)} comes in as the defending champion.`);
  if (catSeasons.has(id)) parts.push(`This one is different: a ${words[mgrs.length] || mgrs.length}-team head-to-head categories league, so each week is scored in categories won. A 7-5 win means seven categories to five.`);
  if (id === '2020-21') parts.push('Hockey is back in January with a 56-game NHL schedule, so this one is a sprint.');
  if (prev === '2014-15') parts.push('After a year of categories scoring, the league is back to points and back to 12 teams.');
  if (ins.length === 1 && outs.length === 1) {
    const nm = (teamNames[id] || {})[ins[0]];
    parts.push(`Front-office news: ${ins[0]} takes over the franchise ${outs[0]} ran${nm ? ' and relocates it as ' + nm : ''}. Welcome to your rookie season.`);
  } else {
    const back = ins.filter(m => seasonIds.slice(0, i).some(y => (teamNames[y] || {})[m])), rookies = ins.filter(m => !back.includes(m));
    if (back.length) parts.push(`${back.join(' and ')} ${back.length > 1 ? 'are' : 'is'} back after a year away.`);
    if (rookies.length) parts.push(`${rookies.join(' and ')} ${rookies.length > 1 ? 'join for their rookie seasons' : 'joins for a rookie season'}.`);
    if (outs.length && !back.length && !rookies.length) parts.push(`${outs.join(' and ')} ${outs.length > 1 ? "aren't" : "isn't"} back this year.`);
  }
  return parts.join(' ');
}
function seedsOf(standings) { return Object.fromEntries(standings.map(x => [x.mgr, x.rank])); }
function bracketOf(S) {
  const pw = Object.keys(S.post).map(Number).sort((a, b) => a - b);
  const teams = new Set(); pw.forEach(w => Object.entries(S.post[w]).forEach(([m, g]) => { if (g.type === 'Playoffs') teams.add(m); }));
  const firstPlaying = new Set(Object.entries(S.post[pw[0]] || {}).filter(([, g]) => g.type === 'Playoffs').map(([m]) => m));
  return { pw, teams: [...teams], byes: [...teams].filter(m => !firstPlaying.has(m)) };
}
// Every playoff and consolation game once, for the bracket on the Final page (the page lays out the tree)
function bracketGames(S) {
  const { pw } = bracketOf(S), games = [];
  for (const w of pw) for (const [m, g] of Object.entries(S.post[w])) {
    if (m > g.opp && S.post[w][g.opp]) continue;
    games.push({ w, type: g.type, a: m, b: g.opp, ap: g.p, bp: g.q });
  }
  return { weeks: pw, games };
}
function playoffPicture(S, standings) {
  const { teams, byes } = bracketOf(S), seed = seedsOf(standings);
  const field = teams.slice().sort((a, b) => seed[a] - seed[b]);
  const miss = standings.find(x => x.rank === field.length + 1);
  const leader = standings[0];
  let t = `That wraps the regular season, with ${leader.mgr} on top at ${recStr(leader)}. The ${words[field.length] || field.length}-team playoff field is set: ${field.map(m => m + ' (' + seed[m] + ')').join(', ')}.`;
  if (byes.length) t += ` ${byes.join(' and ')} earn${byes.length > 1 ? '' : 's'} a first-round bye.`;
  if (miss) t += ` ${miss.mgr} just misses out at ${recStr(miss)}.`;
  return t;
}
function cancelledFinish(id, leader) {
  if (id === '2019-20') return `Nobody knew it yet, but this was the last week of the season. The NHL paused on March 12, 2020, and the league never crowned a champion. ${leader.mgr} finishes on top at ${recStr(leader)}.`;
  return `That wraps the regular season, with ${leader.mgr} on top at ${recStr(leader)}.`;
}
function championStory(id, S, regStandings, fin) {
  const seed = seedsOf(regStandings), { pw } = bracketOf(S);
  const champ = fin[0], second = fin[1], third = fin[2], reg1 = regStandings[0];
  const rounds = ['quarterfinals', 'semifinals', 'final'];
  const roundOf = w => rounds[rounds.length - (pw.length - pw.indexOf(w))] || 'playoffs';
  const games = m => pw.map(w => ({ w, g: (S.post[w] || {})[m] })).filter(x => x.g && x.g.type === 'Playoffs');
  const out = [];
  const path = games(champ);
  const finalG = path[path.length - 1];
  const steps = path.map(x => 'beat ' + x.g.opp + ' (' + seed[x.g.opp] + ') in the ' + roundOf(x.w) + (x === finalG ? ', ' + f1(x.g.p) + ' to ' + f1(x.g.q) : ''));
  const lead = seed[champ] >= 4 ? `From the No. ${seed[champ]} seed, ${champ} wins the ${id} championship!` : `${champ} wins the ${id} championship as the No. ${seed[champ]} seed!`;
  out.push(lead + (path.length ? (path.length < pw.length ? ' After a first-round bye, ' + champ : ' ' + champ) + ' ' + (steps.length > 1 ? steps.slice(0, -1).join(', ') + ' and ' + steps[steps.length - 1] : steps[0]) + '.' : ''));
  const third3 = games(third).find(x => roundOf(x.w) === 'final' && x.g.p > x.g.q);
  out.push(`${second} settles for 2nd` + (third3 ? `, and ${third} takes 3rd by beating ${third3.g.opp} ${f1(third3.g.p)} to ${f1(third3.g.q)}.` : `, and ${third} finishes 3rd.`));
  // biggest seed upset of the bracket
  // only games between two teams that were both still alive for the title (not the 3rd/5th/7th place games)
  const out_ = {}; pw.forEach(w => Object.entries(S.post[w] || {}).forEach(([m, g]) => { if (g.type === 'Playoffs' && g.p < g.q) out_[m] = out_[m] ?? w; }));
  const alive = (m, w) => out_[m] === undefined || out_[m] >= w;
  const ups = []; pw.forEach(w => Object.entries(S.post[w] || {}).forEach(([m, g]) => { if (g.type === 'Playoffs' && g.p > g.q && alive(m, w) && alive(g.opp, w) && seed[m] - seed[g.opp] >= 3) ups.push({ w, m, g, gap: seed[m] - seed[g.opp] }); }));
  const up = ups.sort((a, b) => b.gap - a.gap)[0];
  const extra = [];
  if (up && up.m !== champ) extra.push(`Upset of the playoffs: No. ${seed[up.m]} ${up.m} knocks off No. ${seed[up.g.opp]} ${up.g.opp} in the ${roundOf(up.w)}.`);
  if (reg1.mgr === champ) extra.push(`${champ} did it all, winning the regular season at ${recStr(reg1)} too.`);
  else {
    const exit = games(reg1.mgr).find(x => x.g.p < x.g.q);
    extra.push(`${reg1.mgr} won the regular season at ${recStr(reg1)}` + (exit ? ` but fell to ${exit.g.opp} in the ${roundOf(exit.w)}.` : ` and finishes ${ord(S.finals[reg1.mgr])}.`));
  }
  out.push(extra.join(' '));
  out.push(`At the other end, ${fin[fin.length - 1]} finishes ${ord(fin.length)}. See you next season.`);
  return out;
}

// All-time series between two managers through season y, week wk (inclusive)
function seriesOf(a, b, y, wk) {
  const g = series.filter(x => ((x[2] === a && x[4] === b) || (x[2] === b && x[4] === a)) && (x[0] < y || (x[0] === y && x[1] <= wk)));
  let aw = 0, bw = 0, t = 0, run = 0, runBy = null, prevRun = 0, prevBy = null;
  g.forEach((x, i) => {
    const [pa, pb] = x[2] === a ? [x[3], x[5]] : [x[5], x[3]];
    const w = pa > pb ? a : pb > pa ? b : null;
    if (w === a) aw++; else if (w === b) bw++; else t++;
    if (i === g.length - 1) { prevRun = run; prevBy = runBy; }
    if (w && w === runBy) run++; else { runBy = w; run = w ? 1 : 0; }
  });
  return { aw, bw, t, n: g.length, run, runBy, prevRun, prevBy };
}
// One all-time series note for the week, if anything stands out
function seriesNote(decided, y, wk) {
  const notes = [];
  for (const x of decided) {
    const r = seriesOf(x.w, x.l, y, wk);
    if (r.prevBy === x.l && r.prevRun >= 5) notes.push({ pri: 4, t: `${x.w} finally beats ${x.l}, snapping a ${r.prevRun}-game losing streak in the series.` });
    else if (r.bw === 0 && r.aw >= 6) notes.push({ pri: 3, t: `${x.w} is now ${r.aw}-0 all-time against ${x.l}.` });
    else if (r.runBy === x.w && r.run >= 6) notes.push({ pri: 2, t: `${x.w} has now beaten ${x.l} ${r.run} straight times.` });
    else if (r.n >= 10 && r.aw === r.bw) notes.push({ pri: 1, t: `The all-time ${x.w}-${x.l} series is dead even at ${r.aw}-${r.bw}${r.t ? '-' + r.t : ''}.` });
  }
  notes.sort((a, b) => b.pri - a.pri);
  const top = notes[0];
  if (!top) return '';
  return top.pri >= 3 || wk % 3 === 0 ? top.t : ''; // the big ones always, the rest here and there
}
// Real hockey news by date ('offseason' = before week 1); only well-documented events
const NEWS = {
  '2013-14': [['2014-02-15', 'T.J. Oshie turned Sochi into his stage, scoring on four of six shootout tries to beat Russia.'], ['2014-02-23', 'Canada took Olympic gold in Sochi, shutting out Sweden 3-0 in the final.'], ['2014-03-05', 'The Rangers and Lightning swapped captains at the deadline: Martin St. Louis for Ryan Callahan.']],
  '2015-16': [['2016-01-06', 'Columbus and Nashville made a one-for-one blockbuster, Ryan Johansen for Seth Jones.'], ['2016-01-31', 'John Scott, the enforcer the league tried to keep out of the All-Star Game, captained the Pacific to the title and took home MVP.']],
  '2016-17': [['offseason', 'The summer brought two jaw-droppers on the same afternoon: Taylor Hall to New Jersey for Adam Larsson, and P.K. Subban to Nashville for Shea Weber.'], ['2017-01-29', 'The NHL celebrated its 100 greatest players at All-Star weekend in Los Angeles.']],
  '2017-18': [['offseason', 'The Vegas Golden Knights play their first season.'], ['2017-11-05', 'Matt Duchene finally moved, going to Ottawa in a three-team blockbuster with Colorado and Nashville.'], ['2018-02-25', 'With no NHL players in PyeongChang, the Olympic Athletes from Russia beat Germany in overtime for gold.']],
  '2018-19': [['offseason', 'Erik Karlsson was traded from Ottawa to San Jose right before the season.']],
  '2020-21': [['offseason', 'The NHL realigned for one season, with all seven Canadian teams in an all-Canadian North Division.']],
  '2021-22': [['offseason', 'The Seattle Kraken joined the league as team number 32.'], ['2021-11-04', 'Buffalo finally traded Jack Eichel, sending him to Vegas.'], ['2021-12-22', 'With COVID cases piling up, the NHL pulled its players out of the Beijing Olympics.']],
  '2022-23': [['2023-01-30', 'The Islanders landed Bo Horvat from Vancouver.'], ['2023-02-26', 'New Jersey added Timo Meier from San Jose ahead of the deadline.']],
  '2023-24': [['offseason', 'Connor Bedard made his NHL debut in Chicago.']],
  '2024-25': [['2025-01-24', 'Carolina stunned everyone, landing Mikko Rantanen from Colorado in a three-team deal.'], ['2025-02-15', 'Three fights in the first nine seconds of Canada vs. USA set the tone at the 4 Nations Face-Off.'], ['2025-02-20', 'Connor McDavid scored in overtime as Canada beat the USA 3-2 to win the 4 Nations Face-Off.'], ['2025-03-07', 'Carolina flipped Rantanen to Dallas only weeks after getting him.'], ['2025-04-06', 'Alex Ovechkin scored goal 895, passing Wayne Gretzky for the most in NHL history.']],
  '2025-26': [['2026-02-10', 'NHL players are back on Olympic ice for the first time since 2014.']]
};
function newsFor(y, wk, dw) {
  const items = (NEWS[y] || []).filter(([d]) => (d === 'offseason' && wk === 1) || (dw && d !== 'offseason' && dw[0] <= d && d <= dw[1]));
  return items.length ? 'Around the league: ' + items.map(x => x[1]).join(' ') : '';
}
function newsAfter(y, lastEnd) {
  const items = (NEWS[y] || []).filter(([d]) => d !== 'offseason' && lastEnd && d > lastEnd);
  return items.length ? 'Around the league: ' + items.map(x => x[1]).join(' ') : '';
}

const seasonsOut = [];
for (const [id, S] of Object.entries(bySeason)) {
  CAT = catSeasons.has(id);
  const weeksNo = Object.keys(S.games).map(Number).sort((a, b) => a - b);
  const mgrs = Object.keys(S.games[weeksNo[0]]);
  const tot = Object.fromEntries(mgrs.map(m => [m, { w: 0, l: 0, t: 0, pf: 0, pa: 0, res: [] }]));
  const hs = Object.fromEntries(mgrs.map(m => [m, []]));
  const schedule = [], weeks = [];
  let prevLeader = null, prevLast = null;
  for (const wk of weeksNo) {
    const G = S.games[wk], seen = new Set(), matchups = [];
    for (const m of mgrs) {
      const g = G[m]; if (!g || seen.has(m)) continue;
      seen.add(m); seen.add(g.opp);
      matchups.push({ a: m, ap: g.p, b: g.opp, bp: g.q });
      schedule.push([wk, m, g.opp]);
    }
    matchups.sort((x, y) => Math.max(y.ap, y.bp) - Math.max(x.ap, x.bp));
    for (const m of mgrs) {
      const g = G[m], t = tot[m], k = g.p > g.q ? 'W' : g.p < g.q ? 'L' : 'T';
      t[k.toLowerCase()]++; t.pf += g.p; t.pa += g.q; t.res.push(k);
    }
    const top = Math.max(...mgrs.map(m => G[m].p)), hsMgr = mgrs.find(m => G[m].p === top);
    mgrs.filter(m => G[m].p === top).forEach(m => hs[m].push(wk));
    const streakOf = m => { const a = tot[m].res; let n = 0; while (n < a.length && a[a.length - 1 - n] === a[a.length - 1]) n++; return { k: a[a.length - 1], n }; };
    const prevStreak = m => { const a = tot[m].res.slice(0, -1); let n = 0; while (n < a.length && a[a.length - 1 - n] === a[a.length - 1]) n++; return { k: a[a.length - 1], n }; };
    const rank = S.rank[wk], prev = S.rank[wk - 1] || {};
    const standings = mgrs.slice().sort((a, b) => rank[a] - rank[b]).map(m => ({
      rank: rank[m], prev: prev[m] || null, mgr: m, w: tot[m].w, l: tot[m].l, t: tot[m].t,
      pf: Math.round(tot[m].pf * 10) / 10, pa: Math.round(tot[m].pa * 10) / 10, streak: (s => s.k + s.n)(streakOf(m)) }));
    const groups = {};
    for (const m of mgrs) { const s = streakOf(m); if (s.n >= 3 && s.k !== 'T') ((groups[s.k + s.n] = groups[s.k + s.n] || { kind: s.k, n: s.n, mgrs: [] })).mgrs.push(m); }
    const streaks = Object.values(groups).sort((a, b) => (a.kind === b.kind ? b.n - a.n : a.kind === 'W' ? -1 : 1));
    const tallyMap = {};
    for (const m of mgrs) if (hs[m].length) (tallyMap[hs[m].length] = tallyMap[hs[m].length] || []).push({ mgr: m, weeks: hs[m].slice() });
    const highScoreTally = Object.entries(tallyMap).sort((a, b) => b[0] - a[0]).map(([count, entries]) => ({ count: Number(count), entries }));
    const nextG = S.games[wk + 1], next = [];
    if (nextG) { const s2 = new Set(); for (const m of mgrs) if (!s2.has(m)) { s2.add(m); s2.add(nextG[m].opp); next.push([m, nextG[m].opp]); } }

    // Recap, written from the numbers only
    const recap = [], kind = odd[id] && odd[id][wk], dw = (weekDates[id] || {})[wk];
    const days = dw ? Math.round((Date.parse(dw[1]) - Date.parse(dw[0])) / 86400000) + 1 : 7;
    const regWeeks = weeksNo[weeksNo.length - 1];
    if (wk === 1) recap.push(welcome(id, mgrs));
    let context = '';
    if (dw && days > 8 && wk > 1 && covers(dw, '12-25')) context = `A ${words[Math.round(days / 7)] || Math.round(days / 7)}-week matchup over the holidays (${md(dw[0])} to ${md(dw[1])}). `;
    else if (dw && days > 8 && wk > 1) {
      const feb = dw[0].slice(5, 7) === '02' || dw[1].slice(5, 7) === '02';
      const label = feb && FEB_BREAK[id] ? FEB_BREAK[id] : 'All-Star';
      context = `A ${words[Math.round(days / 7)] || Math.round(days / 7)}-week matchup (${md(dw[0])} to ${md(dw[1])}) to cover the ${label} break${kind === 'long' ? ', so the numbers run big' : ''}. `;
    } else if (covers(dw, '12-25')) context = (days < 7 || kind === 'short') ? 'Merry Christmas from the RRDJ desk. The NHL\'s holiday break makes this a short week, so the scores run low. ' : 'Christmas week around the league, and somebody found a little something extra under the tree. ';
    else if (covers(dw, '01-01')) context = `Happy New Year! ${dw[0].slice(0, 4)} goes out and ${dw[1].slice(0, 4)} comes in. `;
    else if (kind === 'long' && wk > 1) context = 'A multi-week period this time, so the scores run high. ';
    else if (kind === 'short') context = 'A short week, so the scores run low. ';
    const hsG = G[hsMgr];
    recap.push(context + (CAT
      ? `${hsMgr} wins the most categories this week with ${f1(top)}` + (hsG.p > hsG.q ? `, beating ${hsG.opp} ${f1(hsG.p)}-${f1(hsG.q)}.` : hsG.p < hsG.q ? ` and somehow still loses to ${hsG.opp}, who took ${f1(hsG.q)}.` : `, and still only ties ${hsG.opp}.`)
      : `${hsMgr} posts the week's high score with ${f1(top)}` + (hsG.p > hsG.q ? ` and beats ${hsG.opp} by ${f1(hsG.p - hsG.q)}.` : hsG.p < hsG.q ? ` and somehow still loses to ${hsG.opp}, who put up ${f1(hsG.q)}.` : `, and still only ties ${hsG.opp}.`)));
    const decided = matchups.filter(x => x.ap !== x.bp).map(x => ({ w: x.ap > x.bp ? x.a : x.b, l: x.ap > x.bp ? x.b : x.a, wp: Math.max(x.ap, x.bp), lp: Math.min(x.ap, x.bp), d: Math.abs(x.ap - x.bp) }));
    const close = decided.slice().sort((a, b) => a.d - b.d)[0], blow = decided.slice().sort((a, b) => b.d - a.d)[0];
    const p2 = [];
    if (close) p2.push((close.d < (CAT ? 2 : 5) ? 'Photo finish' : 'Closest game') + tagOf(close.w, close.l) + `: ${close.w} edges ${close.l} ${f1(close.wp)} to ${f1(close.lp)}.`);
    if (blow && blow !== close) p2.push('Blowout of the week' + tagOf(blow.w, blow.l) + `: ${blow.w} over ${blow.l} by ${f1(blow.d)}${CAT ? ' categories' : ''}.`);
    if (wk > 1) {
      const up = decided.filter(x => prev[x.w] && prev[x.l] && prev[x.w] - prev[x.l] >= 5).sort((a, b) => (prev[b.w] - prev[b.l]) - (prev[a.w] - prev[a.l]))[0];
      if (up) p2.push(`Upset alert: ${up.w}, ${ord(prev[up.w])} coming in, knocks off ${up.l} (${ord(prev[up.l])}).`);
    }
    recap.push(p2.join(' '));
    const p3 = [];
    const hot = mgrs.map(m => ({ m, s: streakOf(m) })).filter(x => x.s.k === 'W' && x.s.n >= 3).sort((a, b) => b.s.n - a.s.n)[0];
    const cold = mgrs.map(m => ({ m, s: streakOf(m) })).filter(x => x.s.k === 'L' && x.s.n >= 3).sort((a, b) => b.s.n - a.s.n)[0];
    const snap = mgrs.map(m => ({ m, s: prevStreak(m), now: streakOf(m) })).filter(x => x.s.n >= 4 && x.now.n === 1 && x.s.k !== x.now.k && x.s.k !== 'T').sort((a, b) => b.s.n - a.s.n)[0];
    if (hot) p3.push(`${hot.m} is rolling with ${hot.s.n} straight wins.`);
    if (snap) p3.push(snap.s.k === 'L' ? `${snap.m} snaps a ${snap.s.n}-game skid.` : `${snap.m}'s ${snap.s.n}-game win streak is over.`);
    if (cold && (!snap || cold.m !== snap.m)) p3.push(`${cold.m} has dropped ${cold.s.n} in a row.`);
    const sn = CAT ? '' : seriesNote(decided, id, wk);
    if (sn) p3.push(sn);
    if (p3.length) recap.push(p3.join(' '));
    const news = newsFor(id, wk, dw);
    if (news) recap.push(news);
    const leader = standings[0], bottom = standings[standings.length - 1].mgr;
    const lastWk = wk === weeksNo[weeksNo.length - 1];
    const half = wk === Math.ceil(regWeeks / 2);
    recap.push(lastWk ? (Object.keys(S.post).length ? playoffPicture(S, standings) : cancelledFinish(id, leader))
      : half ? `Halfway home: ${leader.mgr} leads at ${recStr(leader)}, ${standings[1].mgr} is right behind at ${recStr(standings[1])}, and ${bottom} has work to do in last place.`
      : leader.mgr !== prevLeader && wk > 1 ? `${leader.mgr} takes over 1st at ${leader.w}-${leader.l}${leader.t ? '-' + leader.t : ''}.`
        : `${leader.mgr} leads the way at ${leader.w}-${leader.l}${leader.t ? '-' + leader.t : ''}.` + (bottom !== prevLast && wk > 1 ? ` ${bottom} drops to ${ord(standings.length)}.` : ''));
    prevLeader = leader.mgr; prevLast = bottom;

    weeks.push({ week: wk, start: dw ? dw[0] : undefined, end: dw ? dw[1] : undefined, days: dw ? days : undefined, recap: recap.filter(Boolean), matchups, highScore: CAT ? null : { mgr: hsMgr, pts: top }, standings, streaks, highScoreTally: CAT ? [] : highScoreTally, next });
  }

  // Final standings (week 100)
  const last = weeks[weeks.length - 1];
  if (Object.keys(S.finals).length) {
    const fin = mgrs.slice().sort((a, b) => S.finals[a] - S.finals[b]);
    const regRank = Object.fromEntries(last.standings.map(x => [x.mgr, x.rank]));
    const standings = fin.map(m => Object.assign({}, last.standings.find(x => x.mgr === m), { rank: S.finals[m], prev: regRank[m] }));
    const recap = championStory(id, S, last.standings, fin);
    const late = newsAfter(id, last.end);
    if (late) recap.splice(recap.length - 1, 0, late);
    weeks.push({ week: 100, recap, matchups: [], highScore: null, standings, streaks: last.streaks, highScoreTally: last.highScoreTally, next: [], bracket: bracketGames(S) });
  }
  seasonsOut.push({ id, label: id, source: 'sheet', scoring: CAT ? 'categories' : undefined, teams: teamNames[id] || {}, logos, schedule, weeks });
}

r.seasons = r.seasons.filter(s => s.source !== 'sheet').concat(seasonsOut).sort((a, b) => (a.id < b.id ? -1 : 1));
fs.writeFileSync(reportsFile, JSON.stringify(r, null, 1));
console.log('seasons', r.seasons.map(s => s.id + (s.source === 'sheet' ? ' (sheet, ' + s.weeks.length + ' entries)' : '')).join(', '));
