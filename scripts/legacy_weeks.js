// Weekly-report entries for past seasons, rebuilt from the sheet (no Fantrax data: no player cards, moves or trades).
// Usage: node legacy_weeks.js <tab.csv> <reports.json>
// For every season in the sheet that reports.json doesn't already hold as a Fantrax season, (re)writes
// seasons[] = { id, label, source: "sheet", logos, schedule, weeks: [...] } with matchups, standings (sheet rank,
// cumulative W-L-T/PF/PA, streak), 3+ streaks, high-score tally, the next week's pairings and a short recap
// written from the numbers. Week 100 is the final-standings entry. Seasons stay sorted by id, so the newest
// (Fantrax) season stays last, which the site treats as the current season.
const fs = require('fs');
const [csvFile, reportsFile] = process.argv.slice(2);
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
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const rel = (a, b) => {
  if (BROTHERS.some(g => g.includes(a) && g.includes(b))) return 'brother vs. brother';
  if ([a, b].includes('Hallie') && [a, b].includes('Will')) return 'husband vs. wife';
  if ([a, b].includes('Hallie') && BROTHERS[0].some(x => [a, b].includes(x))) return 'in-law';
  if ([a, b].includes('Zac') && ['Nick', 'Vin'].some(x => [a, b].includes(x))) return 'zac';
  return null;
};

const bySeason = {};
for (const [season, team, week, opp, place, , pf, pa] of rows) {
  if (fantrax.has(season)) continue;
  const S = bySeason[season] = bySeason[season] || { rank: {}, games: {}, finals: {} };
  const wk = Number(week);
  if (wk === 100) { S.finals[team] = Number(place); continue; }
  if (!opp || pf === '' || pa === '') continue;
  (S.rank[wk] = S.rank[wk] || {})[team] = Number(place);
  (S.games[wk] = S.games[wk] || {})[team] = { opp, p: num(pf), q: num(pa) };
}

const seasonsOut = [];
for (const [id, S] of Object.entries(bySeason)) {
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
    const recap = [], kind = odd[id] && odd[id][wk];
    const hsG = G[hsMgr];
    recap.push((kind === 'long' ? 'A multi-week period this time, so the scores run high. ' : kind === 'short' ? 'A short week, so the scores run low. ' : '') +
      `${hsMgr} posts the week's high score with ${f1(top)}` + (hsG.p > hsG.q ? ` and beats ${hsG.opp} by ${f1(hsG.p - hsG.q)}.` : hsG.p < hsG.q ? ` and somehow still loses to ${hsG.opp}, who put up ${f1(hsG.q)}.` : `, and still only ties ${hsG.opp}.`));
    const decided = matchups.filter(x => x.ap !== x.bp).map(x => ({ w: x.ap > x.bp ? x.a : x.b, l: x.ap > x.bp ? x.b : x.a, wp: Math.max(x.ap, x.bp), lp: Math.min(x.ap, x.bp), d: Math.abs(x.ap - x.bp) }));
    const close = decided.slice().sort((a, b) => a.d - b.d)[0], blow = decided.slice().sort((a, b) => b.d - a.d)[0];
    const p2 = [];
    if (close) p2.push((close.d < 5 ? 'Photo finish: ' : 'Closest game: ') + `${close.w} edges ${close.l} ${f1(close.wp)} to ${f1(close.lp)}.`);
    if (blow && blow !== close) p2.push(`Blowout of the week: ${blow.w} over ${blow.l} by ${f1(blow.d)}.`);
    if (wk > 1) {
      const up = decided.filter(x => prev[x.w] && prev[x.l] && prev[x.w] - prev[x.l] >= 5).sort((a, b) => (prev[b.w] - prev[b.l]) - (prev[a.w] - prev[a.l]))[0];
      if (up) p2.push(`Upset alert: ${up.w}, ${ord(prev[up.w])} coming in, knocks off ${up.l} (${ord(prev[up.l])}).`);
    }
    recap.push(p2.join(' '));
    const p3 = [];
    const fam = decided.map(x => ({ x, k: rel(x.w, x.l) })).find(y => y.k);
    if (fam) {
      const { x, k } = fam;
      p3.push(k === 'brother vs. brother' ? `Brother vs. brother goes to ${x.w}, ${f1(x.wp)} to ${f1(x.lp)}.`
        : k === 'husband vs. wife' ? `Household bragging rights go to ${x.w} this week, ${f1(x.wp)} to ${f1(x.lp)}.`
          : k === 'in-law' ? `In-law showdown: ${x.w} gets the better of ${x.l}, ${f1(x.wp)} to ${f1(x.lp)}.`
            : `${x.w} beats ${x.l} ${f1(x.wp)} to ${f1(x.lp)}. Somebody check who set Zac's lineup.`);
    }
    const hot = mgrs.map(m => ({ m, s: streakOf(m) })).filter(x => x.s.k === 'W' && x.s.n >= 3).sort((a, b) => b.s.n - a.s.n)[0];
    const cold = mgrs.map(m => ({ m, s: streakOf(m) })).filter(x => x.s.k === 'L' && x.s.n >= 3).sort((a, b) => b.s.n - a.s.n)[0];
    const snap = mgrs.map(m => ({ m, s: prevStreak(m), now: streakOf(m) })).filter(x => x.s.n >= 4 && x.now.n === 1 && x.s.k !== x.now.k && x.s.k !== 'T').sort((a, b) => b.s.n - a.s.n)[0];
    if (hot) p3.push(`${hot.m} is rolling with ${hot.s.n} straight wins.`);
    if (snap) p3.push(snap.s.k === 'L' ? `${snap.m} snaps a ${snap.s.n}-game skid.` : `${snap.m}'s ${snap.s.n}-game win streak is over.`);
    if (cold && (!snap || cold.m !== snap.m)) p3.push(`${cold.m} has dropped ${cold.s.n} in a row.`);
    if (p3.length) recap.push(p3.join(' '));
    const leader = standings[0], bottom = standings[standings.length - 1].mgr;
    const lastWk = wk === weeksNo[weeksNo.length - 1];
    recap.push(lastWk ? `That wraps the regular season, with ${leader.mgr} on top at ${leader.w}-${leader.l}${leader.t ? '-' + leader.t : ''}.`
      : leader.mgr !== prevLeader && wk > 1 ? `${leader.mgr} takes over 1st at ${leader.w}-${leader.l}${leader.t ? '-' + leader.t : ''}.`
        : `${leader.mgr} leads the way at ${leader.w}-${leader.l}${leader.t ? '-' + leader.t : ''}.` + (bottom !== prevLast && wk > 1 ? ` ${bottom} drops to 12th.` : ''));
    prevLeader = leader.mgr; prevLast = bottom;

    weeks.push({ week: wk, recap: recap.filter(Boolean), matchups, highScore: { mgr: hsMgr, pts: top }, standings, streaks, highScoreTally, next });
  }

  // Final standings (week 100)
  const last = weeks[weeks.length - 1];
  if (Object.keys(S.finals).length) {
    const fin = mgrs.slice().sort((a, b) => S.finals[a] - S.finals[b]);
    const regRank = Object.fromEntries(last.standings.map(x => [x.mgr, x.rank]));
    const standings = fin.map(m => Object.assign({}, last.standings.find(x => x.mgr === m), { rank: S.finals[m], prev: regRank[m] }));
    const top3 = fin.slice(0, 3), reg1 = last.standings[0];
    const recap = [`${top3[0]} wins the ${id} championship. ${top3[1]} finishes 2nd and ${top3[2]} 3rd.`,
      reg1.mgr === top3[0] ? `${reg1.mgr} did it all, winning the regular season at ${reg1.w}-${reg1.l} too.`
        : `${reg1.mgr} won the regular season at ${reg1.w}-${reg1.l} but finishes ${ord(S.finals[reg1.mgr])} once the playoffs are done.`,
      `At the other end, ${fin[fin.length - 1]} finishes 12th.`];
    weeks.push({ week: 100, recap, matchups: [], highScore: null, standings, streaks: last.streaks, highScoreTally: last.highScoreTally, next: [] });
  }
  seasonsOut.push({ id, label: id, source: 'sheet', logos, schedule, weeks });
}

r.seasons = r.seasons.filter(s => s.source !== 'sheet').concat(seasonsOut).sort((a, b) => (a.id < b.id ? -1 : 1));
fs.writeFileSync(reportsFile, JSON.stringify(r, null, 1));
console.log('seasons', r.seasons.map(s => s.id + (s.source === 'sheet' ? ' (sheet, ' + s.weeks.length + ' entries)' : '')).join(', '));
