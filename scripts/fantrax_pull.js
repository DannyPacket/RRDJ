// Run in the built-in browser's javascript_tool on any fantrax.com page (user signed in).
// Replace __PERIOD__ with the scoring period number, __LOCK__ with the period's first puck drop in Eastern
// time ('YYYY-MM-DDTHH:MM', from nhl_lock.js) and __CUTOFF__ with the week's cutoff for moves and trades: the NEXT
// period's first puck drop, or the time of the refresh if that comes first. The first run also defines
//   window.fxPull(period, lock, cutoff) -> raw data for one period (same object this script returns)
//   window.fxWeekEntry(out, prevOut)  -> the weeks[] entry for the league site's reports.json
//                                        (prevOut = fxPull(period - 1), or null for week 1)
//   window.fxTradeTracker(out)        -> the season-level tradeTracker object for reports.json
// so later periods can be pulled in the same page without pasting this file again.
const LEAGUE = 'd20e0igqmtuaa2jh';
const IDS = {
  hnvvy6pcmtuaa33v: 'Danny', ns80vxh6mtz6iqau: 'Hallie', '1v899j7zmtw7rac7': 'Jefe',
  ilpzva83mtuef1ht: 'Joe', d0x1fv12mtzohm6p: 'Nick', p9k0201pmu3aycu2: 'Ronnie',
  uwlkagzzmu45ox4n: 'Steve', '5222gmnumtz2rq3c': 'Tim', i8i4px0rmtxm1js5: 'Tom',
  '5h8hjqlvmu1b8csm': 'Vin', ghf0f50ymu1ifmzz: 'Will', bnbq2ko5mu19lo8l: 'Zac'
};
const who = (teamId, fallback) => IDS[teamId] || ('UNKNOWN:' + teamId + ':' + (fallback || ''));

async function fx(method, data) {
  const r = await fetch('/fxpa/req?leagueId=' + LEAGUE, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgs: [{ method, data: Object.assign({ leagueId: LEAGUE }, data) }] })
  });
  const j = await r.json();
  const resp = j.responses[0];
  if (resp.pageError) throw new Error(method + ': ' + resp.pageError.code);
  return resp.data;
}

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const isoOf = s => { const m = s && s.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/); return m ? m[3] + '-' + String(MONTHS[m[1]]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0') : null; };
function parseCaptionDates(sub) {
  // "(Mon Oct 19, 2026 - Sun Oct 25, 2026)"
  const m = [...sub.matchAll(/[A-Z][a-z]{2} \d{1,2}, \d{4}/g)].map(x => isoOf(x[0]));
  return { start: m[0], end: m[m.length - 1] };
}

// Top/bottom players for a period, by ROSTER LOCK = puck drop of the period's first NHL game, in Eastern time
// (dates.lock, 'YYYY-MM-DDTHH:MM', from the NHL schedule; Fantrax transaction times are Eastern too). Fantrax only says who owns a player now, so we start from
// today's rosters and undo every claim / drop / trade back to the lock, newest first.
//  - Every player on a roster at the lock counts for that manager for the WHOLE period (all his games),
//    even if he was dropped or traded during the week. A note says what happened ("Dropped Thu Oct 22 ·
//    picked up by Vin Fri Oct 23", "Traded to Tim Tue Oct 20").
//  - The top and bottom cards use ONLY players on a roster at the lock.
//  - Separately, `fa` per position = the best player who was NOT on a roster at the lock (unowned all week, or
//    picked up mid-week), shown as a small note on the high card, but only if he outscored the top card. Never for lows.
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayName = iso => { const [y, m, d] = iso.split('-').map(Number), x = new Date(Date.UTC(y, m - 1, d)); return DOW[x.getUTCDay()] + ' ' + MON[x.getUTCMonth()] + ' ' + x.getUTCDate(); };
const stamp = s => { const iso = isoOf(s), m = s && s.match(/(\d{1,2}):(\d{2})\s*([AP]M)/); if (!iso) return null; const h = m ? +m[1] % 12 + (m[3] === 'PM' ? 12 : 0) : 0; return iso + 'T' + String(h).padStart(2, '0') + ':' + (m ? m[2] : '00'); };
async function statFor(name, id, isG, start, end) {
  const d = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', searchName: name, positionOrGroup: isG ? 'POS_201' : 'HOCKEY_SKATING', startDate: start, endDate: end, timeframeTypeCode: 'BY_DATE', pageNumber: '1', maxResultsPerPage: '50' });
  const hc = d.tableHeader.cells, iF = hc.findIndex(c => c.key === 'fpts'), iGP = hc.findIndex(c => c.shortName === 'GP');
  const row = d.statsTable.find(x => x.scorer.scorerId === id);
  return row ? { id, name: row.scorer.name, nhl: row.scorer.teamShortName, pos: row.scorer.posShortNames, fpts: parseFloat(row.cells[iF].content), gp: parseInt(row.cells[iGP].content) || 0, isG } : null;
}
async function rosterPlayers(dates, sk, gl, groups, trades) {
  const events = [];
  for (const g of groups) for (const i of g.items) if (i.executed !== false && (i.code === 'CLAIM' || i.code === 'DROP'))
    events.push({ t: stamp(g.date), id: i.scorerId, p: i, kind: i.code === 'CLAIM' ? (i.claim === 'WW' ? 'waiver' : 'fa') : 'drop', before: i.code === 'CLAIM' ? null : g.mgr, after: i.code === 'CLAIM' ? g.mgr : null });
  for (const g of Object.values(trades)) for (const m of g.moves) if (m.executed !== false && m.scorerId)
    events.push({ t: stamp(g.date), id: m.scorerId, p: m, kind: 'trade', before: m.from, after: m.to });
  events.sort((a, b) => (a.t < b.t ? 1 : a.t > b.t ? -1 : 0)); // newest first
  const owner = {}, byId = {};
  for (const p of [...sk, ...gl]) { owner[p.id] = p.mgr; byId[p.id] = p; }
  const lockT = dates.lock || (dates.start + 'T12:00'), pEnd = dates.end + 'T23:59';
  let i = 0;
  for (; i < events.length && events[i].t > pEnd; i++) owner[events[i].id] = events[i].before;
  const afterLock = []; // this period's moves after the lock, newest first
  for (; i < events.length && events[i].t >= lockT; i++) { afterLock.push(events[i]); owner[events[i].id] = events[i].before; }
  const lockOwner = Object.fromEntries(Object.entries(owner).filter(([, m]) => m));
  const chrono = afterLock.slice().reverse();
  // Free agents picked up after the lock (not on any roster at the lock): first pickup in the period.
  const pickups = {};
  for (const e of chrono) if ((e.kind === 'fa' || e.kind === 'waiver') && !lockOwner[e.id] && !pickups[e.id]) pickups[e.id] = e;
  // Full-period stats for everyone involved who isn't on a roster today.
  const meta = id => { const e = events.find(x => x.id === id); return e ? { name: e.p.player, pos: e.p.pos } : {}; };
  for (const id of [...Object.keys(lockOwner), ...Object.keys(pickups)]) {
    if (byId[id]) continue;
    const m = meta(id); if (!m.name) continue;
    const s = await statFor(m.name, id, (m.pos || '').split(',').includes('G'), dates.start, dates.end);
    if (s) byId[id] = s;
  }
  const noteFor = id => chrono.filter(e => e.id === id).map(e =>
    e.kind === 'drop' ? 'Dropped ' + dayName(e.t.slice(0, 10))
      : e.kind === 'trade' ? 'Traded to ' + e.after + ' ' + dayName(e.t.slice(0, 10))
        : 'picked up by ' + e.after + ' ' + dayName(e.t.slice(0, 10))).join(' · ').replace(/^p/, 'P') || null;
  const rostered = Object.keys(lockOwner).filter(id => byId[id]).map(id => Object.assign({}, byId[id], { mgr: lockOwner[id], note: noteFor(id) }));
  const freeAgents = Object.keys(pickups).filter(id => byId[id]).map(id => Object.assign({}, byId[id], { mgr: pickups[id].after, fa: true,
    note: (pickups[id].kind === 'waiver' ? 'Waiver claim ' : 'Free agent pickup ') + dayName(pickups[id].t.slice(0, 10)) }));
  const isD = p => (p.pos || '').split(',').includes('D'), isG = p => p.isG || (p.pos || '').split(',').includes('G');
  const played = a => a.filter(p => p.gp >= 1).sort((a, b) => b.fpts - a.fpts);
  // Best scorers league-wide (top 60 per group by fantasy points) to find unowned free agents.
  const leaders = async pos => { const d = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', positionOrGroup: pos, startDate: dates.start, endDate: dates.end, timeframeTypeCode: 'BY_DATE', sortType: 'SCORE', pageNumber: '1', maxResultsPerPage: '60' }); const hc = d.tableHeader.cells, iF = hc.findIndex(c => c.key === 'fpts'), iGP = hc.findIndex(c => c.shortName === 'GP'); return d.statsTable.map(r => ({ id: r.scorer.scorerId, name: r.scorer.name, nhl: r.scorer.teamShortName, pos: r.scorer.posShortNames, fpts: parseFloat(r.cells[iF].content), gp: parseInt(r.cells[iGP].content) || 0, isG: pos === 'POS_201' })); };
  const offRoster = {};
  for (const p of freeAgents) offRoster[p.id] = p;
  for (const p of [...await leaders('HOCKEY_SKATING'), ...await leaders('POS_201')]) if (!lockOwner[p.id] && !offRoster[p.id]) offRoster[p.id] = Object.assign(p, { fa: true, mgr: null, note: 'Unowned free agent' });
  const group = f => { const hi = played(rostered.filter(f)), lo = played(rostered.filter(f)); const best = played(Object.values(offRoster).filter(f))[0]; return { top: hi.slice(0, 3), bottom: lo.slice(-3).reverse(), fa: best && hi[0] && best.fpts > hi[0].fpts ? best : null }; };
  return {
    players: { F: group(p => !isG(p) && !isD(p)), D: group(p => !isG(p) && isD(p)), G: group(isG) },
    rosterCheck: {
      lockRostered: rostered.length,
      notOnRosterNow: rostered.filter(p => !sk.concat(gl).some(c => c.id === p.id)).map(p => p.name + ' (' + p.mgr + ')'),
      pickedUpAfterLock: freeAgents.map(p => p.name + ' (' + p.mgr + ', ' + p.note + ')')
    }
  };
}


window.fxPull = async function (PERIOD, LOCK, CUTOFF) {
  const out = { period: PERIOD };

  // 1. Schedule: scores for every period up to PERIOD (to catch stat corrections), and this period's dates.
  const sched = await fx('getStandings', { view: 'SCHEDULE' });
  out.unknownTeams = Object.entries(sched.fantasyTeamInfo).filter(([id]) => !IDS[id]).map(([id, t]) => id + '=' + t.name);
  out.teamNames = Object.fromEntries(Object.entries(sched.fantasyTeamInfo).map(([id, t]) => [who(id), t.name]));
  out.teamLogos = Object.fromEntries(Object.entries(sched.fantasyTeamInfo).map(([id, t]) => [who(id), t.logoUrl512]));
  out.weeks = {};
  sched.tableList.slice(0, PERIOD).forEach((t, i) => {
    out.weeks[i + 1] = t.rows.map(r => {
      const c = r.cells;
      return [who(c[0].teamId, c[0].content), parseFloat(c[1].content), who(c[2].teamId, c[2].content), parseFloat(c[3].content)];
    });
  });
  // Next period's pairings (for the recap's look-ahead).
  out.next = sched.tableList[PERIOD] ? sched.tableList[PERIOD].rows.map(r => [who(r.cells[0].teamId, r.cells[0].content), who(r.cells[2].teamId, r.cells[2].content)]) : [];
  const cap = sched.tableList[PERIOD - 1];
  out.dates = Object.assign({ caption: cap.subCaption }, parseCaptionDates(cap.subCaption));
  const [y1, m1, d1] = out.dates.start.split('-').map(Number), [y2, m2, d2] = out.dates.end.split('-').map(Number);
  out.dates.lock = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(LOCK || '') ? LOCK : null;
  if (!out.dates.lock) out.warning = 'no roster-lock time given; using noon on ' + out.dates.start;
  // Moves and trades belong to the week from this period's puck drop up to the next one (the user's rule,
  // 2026-11-02), so a Monday-morning trade lands in the week that just ended. Without a lock, fall back to Mon-Sun.
  out.dates.cutoff = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(CUTOFF || '') ? CUTOFF : out.dates.end + 'T23:59';
  const winFrom = out.dates.lock || out.dates.start + 'T00:00';
  out.dates.days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
  const periodStart = p => sched.tableList[p - 1] && parseCaptionDates(sched.tableList[p - 1].subCaption).start;
  const inRange = s => { const t = stamp(s); return !!t && t >= winFrom && t < out.dates.cutoff; };

  // 2. Standings as of PERIOD (rank, W-L-T, PF, PA, streak).
  const st = await fx('getStandings', { view: 'REGULAR_SEASON', timeframeType: 'BY_PERIOD', timeStartType: 'FROM_SEASON_START', period: String(PERIOD) });
  const sh = st.tableList[0].header.cells.map(c => c.key);
  out.standings = st.tableList[0].rows.map(rw => {
    const c = k => rw.cells[sh.indexOf(k)].content;
    return { rank: +rw.fixedCells[0].content, mgr: who(rw.fixedCells[1].teamId), w: +c('win'), l: +c('loss'), t: +c('tie'), pf: parseFloat(String(c('pointsFor')).replace(/,/g, '')), pa: parseFloat(String(c('pointsAgainst')).replace(/,/g, '')), streak: c('streak') };
  });

  // 3. Owned players over the period's dates, GP >= 1, top/bottom 3 for F / D / G.
  async function players(pos) {
    const d = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL_TAKEN', positionOrGroup: pos, startDate: out.dates.start, endDate: out.dates.end, timeframeTypeCode: 'BY_DATE', pageNumber: '1', maxResultsPerPage: '500' });
    const hc = d.tableHeader.cells, iF = hc.findIndex(c => c.key === 'fpts'), iGP = hc.findIndex(c => c.shortName === 'GP');
    if (d.paginatedResultSet.totalNumPages > 1) out.warning = 'player list had more than one page';
    return d.statsTable.map(r => {
      const oc = r.cells.find(c => c.teamId);
      return { id: r.scorer.scorerId, name: r.scorer.name, nhl: r.scorer.teamShortName, pos: r.scorer.posShortNames, mgr: oc ? who(oc.teamId, oc.toolTip) : 'NONE', fpts: parseFloat(r.cells[iF].content), gp: parseInt(r.cells[iGP].content) || 0, isG: pos === 'POS_201' };
    });
  }
  const sk = await players('HOCKEY_SKATING'), gl = await players('POS_201'); // today's rosters; step 7 rewinds to the lock

  // 4. Adds/drops processed between this period's puck drop and the cutoff, grouped by transaction. Lineup changes left out.
  const tx = await fx('getTransactionDetailsHistory', { maxResultsPerPage: '500' });
  const groups = []; let cur = null;
  for (const r of tx.table.rows) {
    const team = r.cells.find(c => c.key === 'team'), date = r.cells.find(c => c.key === 'date');
    if (team || date || !cur || cur.id !== r.txSetId) { cur = { id: r.txSetId, mgr: team ? who(team.teamId, team.content) : (cur && cur.mgr), date: date ? date.content : (cur && cur.date), items: [] }; groups.push(cur); }
    cur.items.push({ type: r.transactionType, code: r.transactionCode, claim: r.claimType, player: r.scorer.name, scorerId: r.scorer.scorerId, nhl: r.scorer.teamShortName, pos: r.scorer.posShortNames, executed: r.executed });
  }
  groups.forEach(g => { g.items = g.items.filter(i => i.code !== 'LINEUP_CHANGE'); });
  out.transactions = groups.filter(g => inRange(g.date) && g.items.length && g.items.some(i => i.executed !== false));
  out.txTotalAvailable = tx.paginatedResultSet.totalNumResults;
  out.league = tx.miscData && tx.miscData.heading;

  // 5. Trades (Fantrax's separate Trade tab). One trade = one txSetId; each row is a player moving from -> to.
  const tr = await fx('getTransactionDetailsHistory', { view: 'TRADE', maxResultsPerPage: '500' });
  const trades = {}; let lastDate = null;
  for (const r of tr.table.rows) {
    const f = r.cells.find(c => c.key === 'from'), t = r.cells.find(c => c.key === 'to'), d = r.cells.find(c => c.key === 'date'), wk = r.cells.find(c => c.key === 'week');
    if (d) lastDate = d.content;
    const g = trades[r.txSetId] = trades[r.txSetId] || { id: r.txSetId, date: lastDate, effectivePeriod: wk ? +wk.content : null, moves: [] };
    g.moves.push({ player: r.scorer ? r.scorer.name : '(pick or other)', scorerId: r.scorer && r.scorer.scorerId, nhl: r.scorer && r.scorer.teamShortName, pos: r.scorer && r.scorer.posShortNames, from: f ? who(f.teamId, f.content) : '?', to: t ? who(t.teamId, t.content) : '?', executed: r.executed });
  }
  out.trades = Object.values(trades).filter(g => inRange(g.date));

  // 6. Trade tracker: every trade so far, with each moved player's fantasy points from the day the trade was
  //    takes effect through the end of PERIOD, stopping early on the day the receiving team later drops him, or the
  //    day before a later trade of him takes effect. Pure point value (not whether he was in the starting lineup).
  async function pointsFor(m, start, end) {
    const pos = m.pos && m.pos.split(',').includes('G') ? 'POS_201' : 'HOCKEY_SKATING';
    const d = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', searchName: m.player, positionOrGroup: pos, startDate: start, endDate: end, timeframeTypeCode: 'BY_DATE', pageNumber: '1', maxResultsPerPage: '50' });
    const hc = d.tableHeader.cells, iF = hc.findIndex(c => c.key === 'fpts'), iGP = hc.findIndex(c => c.shortName === 'GP');
    const row = d.statsTable.find(x => x.scorer.scorerId === m.scorerId);
    if (!row) return { pts: null, gp: null, note: 'not found' };
    return { pts: parseFloat(row.cells[iF].content), gp: parseInt(row.cells[iGP].content) || 0 };
  }
  // A trade counts from the start of the period it takes effect in (Fantrax's "week" column), never before the day it
  // was processed. When a player is traded on again, his old team keeps him through the day before that next trade
  // takes effect (usually the end of the period), and his new team starts the day after: no overlap, no gap (the
  // user's rule, 2026-11-28, from McNabb going Danny -> Vin -> Tom).
  const dayBefore = iso => new Date(Date.parse(iso + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
  const effectiveFrom = g => { const p = isoOf(g.date), e = periodStart(g.effectivePeriod); return e && e > p ? e : p; };
  out.tradeTracker = [];
  for (const g of Object.values(trades)) {
    if (g.moves.every(m => m.executed === false)) continue;
    const trIso = isoOf(g.date);
    if (!trIso || stamp(g.date) >= out.dates.cutoff) continue; // trade made after this week's cutoff
    const from = effectiveFrom(g);
    const early = from > out.dates.end; // takes effect after this period (e.g. processed after Sunday, effective next week): nothing counted yet
    const t = { id: g.id, date: g.date, effectivePeriod: g.effectivePeriod, countedFrom: from, through: out.dates.end, moves: [] };
    for (const m of g.moves) {
      // Did the receiving team let him go later? Earliest later drop by that team, or later trade away from it.
      const leaves = [
        ...groups.filter(x => x.mgr === m.to && x.items.some(i => i.code === 'DROP' && i.player === m.player && i.executed !== false)).map(x => isoOf(x.date)),
        ...Object.values(trades).filter(x => x !== g && isoOf(x.date) > trIso && x.moves.some(mv => mv.player === m.player && mv.from === m.to && mv.executed !== false)).map(x => dayBefore(effectiveFrom(x)))
      ].filter(x => x && x >= from).sort();
      const end = leaves[0] && leaves[0] < out.dates.end ? leaves[0] : out.dates.end;
      const r = early ? { pts: 0, gp: 0 } : m.scorerId ? await pointsFor(m, from, end) : { pts: null, gp: null, note: 'no player id' };
      t.moves.push(Object.assign({}, m, r, { through: end, left: leaves[0] && leaves[0] <= out.dates.end ? leaves[0] : undefined }));
    }
    out.tradeTracker.push(t);
  }

  // 7. Top/bottom players by Monday roster lock (see rosterPlayers above).
  Object.assign(out, await rosterPlayers(out.dates, sk, gl, groups, trades));
  return out;
};

// ---- Converters to the league site's reports.json shapes ----
const slash = p => (p || '').split(',').join('/');
const pl = p => ({ name: p.name || p.player, nhl: p.nhl, pos: slash(p.pos) });
const r1 = n => Math.round(n * 10) / 10;

window.fxWeekEntry = function (out, prevOut) {
  const N = out.period;
  const games = out.weeks[N];
  const matchups = games.map(([a, ap, b, bp]) => ({ a, ap, b, bp })).sort((x, y) => Math.max(y.ap, y.bp) - Math.max(x.ap, x.bp));
  const topOf = wk => out.weeks[wk].flatMap(([a, ap, b, bp]) => [[a, ap], [b, bp]]).sort((x, y) => y[1] - x[1])[0];
  const [hsM, hsP] = topOf(N);
  // Season tally of weekly high scores through N.
  const wins = {};
  for (let k = 1; k <= N; k++) { const [m] = topOf(k); (wins[m] = wins[m] || []).push(k); }
  const byCount = {};
  Object.entries(wins).forEach(([mgr, weeks]) => (byCount[weeks.length] = byCount[weeks.length] || []).push({ mgr, weeks }));
  const highScoreTally = Object.keys(byCount).map(Number).sort((a, b) => b - a)
    .map(count => ({ count, entries: byCount[count].sort((a, b) => a.weeks[0] - b.weeks[0]) }));
  const prevRank = Object.fromEntries((prevOut ? prevOut.standings : []).map(s => [s.mgr, s.rank]));
  const standings = out.standings.map(s => {
    const m = (s.streak || '').match(/(\d+)\s*\((\w)\)/);
    return { rank: s.rank, prev: prevRank[s.mgr] || null, mgr: s.mgr, w: s.w, l: s.l, t: s.t, pf: s.pf, pa: s.pa, streak: m ? m[2] + m[1] : '' };
  });
  const sb = {};
  standings.forEach(s => { const k = s.streak[0], n = +s.streak.slice(1); if (n >= 3) { const key = k + n; (sb[key] = sb[key] || { kind: k, n, mgrs: [] }).mgrs.push(s.mgr); } });
  const streaks = Object.values(sb).sort((a, b) => (a.kind === b.kind ? b.n - a.n : a.kind === 'W' ? -1 : 1));
  const card = p => p && Object.assign({ name: p.name, nhl: p.nhl, pts: p.fpts, mgr: p.mgr }, p.note ? { note: p.note } : {});
  const players = {
    high: { F: card(out.players.F.top[0]), D: card(out.players.D.top[0]), G: card(out.players.G.top[0]) },
    low: { F: card(out.players.F.bottom[0]), D: card(out.players.D.bottom[0]), G: card(out.players.G.bottom[0]) },
    faHigh: { F: card(out.players.F.fa), D: card(out.players.D.fa), G: card(out.players.G.fa) }
  };
  const trades = out.trades.filter(t => t.moves.some(m => m.executed !== false)).map(t => {
    const sides = {};
    t.moves.forEach(m => (sides[m.to] = sides[m.to] || { mgr: m.to, gets: [] }).gets.push(pl(m)));
    return { date: isoOf(t.date), sides: Object.values(sides) };
  });
  const moves = [];
  out.transactions.slice().reverse().forEach(g => {
    const adds = g.items.filter(i => i.code === 'CLAIM' && i.executed !== false), drops = g.items.filter(i => i.code === 'DROP' && i.executed !== false);
    const n = Math.max(adds.length, drops.length);
    for (let i = 0; i < n; i++) {
      const a = adds[i], d = drops[i];
      moves.push({ mgr: g.mgr, add: a ? Object.assign(pl(a), a.claim === 'WW' ? { note: 'waivers' } : {}) : null, drop: d ? pl(d) : null });
    }
  });
  moves.sort((x, y) => x.mgr.localeCompare(y.mgr));
  return { week: N, start: out.dates.start, end: out.dates.end, days: out.dates.days, recap: [], matchups, highScore: { mgr: hsM, pts: hsP }, standings, streaks, players, highScoreTally, trades, moves, next: out.next };
};

window.fxTradeTracker = function (out) {
  return {
    asOfWeek: out.period, through: out.dates.end,
    trades: out.tradeTracker.map(t => {
      const sides = {};
      t.moves.forEach(m => (sides[m.to] = sides[m.to] || { mgr: m.to, gets: [] }).gets.push(Object.assign(pl(m), { pts: m.pts == null ? null : r1(m.pts), gp: m.gp }, m.left ? { left: m.left } : {})));
      return { date: isoOf(t.date), countedFrom: t.countedFrom, sides: Object.values(sides) };
    })
  };
};

// The trade tracker week by week (the user's request, 2026-11-09): each traded player's fantasy points, games and
// stat line in every week since the trade, so each week's page shows the totals as of that week and that week's
// change. Same window as fxTradeTracker: from the day the trade went through until the receiving team let him go.
// Every stat the league scores (all added 2026-11-18 at the user's request, so a stat line adds up to the fantasy points;
// goalies can score too: Shesterkin had a goal and an assist in week 1)
const STAT_KEYS = { skater: ['G', 'A', '+/-', 'SOG', 'PPG', 'PPA', 'SHG', 'SHA', 'FOW', 'Hit', 'Blk', 'GWG', 'PIM'],
  goalie: ['W', 'OL', 'GA', 'SV', 'SHO', 'G', 'A', 'PPG', 'PPA', 'SHG', 'SHA', 'PIM'] };
async function weekStats(m, start, end) {
  const isG = m.pos && m.pos.split(',').includes('G');
  const d = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', searchName: m.player, positionOrGroup: isG ? 'POS_201' : 'HOCKEY_SKATING', startDate: start, endDate: end, timeframeTypeCode: 'BY_DATE', pageNumber: '1', maxResultsPerPage: '50' });
  const hc = d.tableHeader.cells, row = d.statsTable.find(x => x.scorer.scorerId === m.scorerId);
  if (!row) return null;
  const col = name => hc.findIndex(c => c.shortName === name && /#/.test(c.key || ''));
  const num = i => (i < 0 ? 0 : parseFloat(String(row.cells[i].content).replace(/,/g, '')) || 0);
  const stats = {};
  for (const k of STAT_KEYS[isG ? 'goalie' : 'skater']) stats[k] = num(col(k));
  return { pts: r1(num(hc.findIndex(c => c.key === 'fpts'))), gp: num(col('GP')), stats };
}
window.fxTradeTrackerWeekly = async function (out) {
  const sched = await fx('getStandings', { view: 'SCHEDULE' });
  const weeks = sched.tableList.slice(0, out.period).map((t, i) => Object.assign({ week: i + 1 }, parseCaptionDates(t.subCaption)));
  const base = fxTradeTracker(out);
  base.byWeek = true;
  for (const [ti, t] of out.tradeTracker.entries()) {
    for (const m of t.moves) {
      if (!m.scorerId || m.executed === false) continue;
      const p = base.trades[ti].sides.find(sd => sd.mgr === m.to).gets.find(g => g.name === m.player);
      const until = m.left && m.left < out.dates.end ? m.left : out.dates.end;
      p.byWeek = {}; p.gpByWeek = {}; p.statsByWeek = {};
      for (const w of weeks) {
        const s = t.countedFrom > w.start ? t.countedFrom : w.start, e = until < w.end ? until : w.end;
        if (s > e) continue;
        const r = await weekStats(m, s, e);
        if (!r) continue;
        p.byWeek[w.week] = r.pts; p.gpByWeek[w.week] = r.gp; p.statsByWeek[w.week] = r.stats;
      }
    }
  }
  return base;
};

// The week's stat line for each top/bottom player card (the user's request, 2026-11-09): GP plus the same stat keys
// as the trade tracker, over the week's dates. Adds `stats` to every card in entry.players (high, low, faHigh).
window.fxCardStats = async function (entry) {
  for (const kind of ['high', 'low', 'faHigh']) for (const pos of ['F', 'D', 'G']) {
    const c = entry.players[kind] && entry.players[kind][pos];
    if (!c) continue;
    const isG = pos === 'G';
    const d = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', searchName: c.name, positionOrGroup: isG ? 'POS_201' : 'HOCKEY_SKATING', startDate: entry.start, endDate: entry.end, timeframeTypeCode: 'BY_DATE', pageNumber: '1', maxResultsPerPage: '50' });
    const hc = d.tableHeader.cells, rows = d.statsTable.filter(x => x.scorer.name === c.name), row = rows.find(x => x.scorer.teamShortName === c.nhl) || rows[0];
    if (!row) continue;
    const col = name => hc.findIndex(x => x.shortName === name && /#/.test(x.key || ''));
    const num = i => (i < 0 ? 0 : parseFloat(String(row.cells[i].content).replace(/,/g, '')) || 0);
    c.stats = { GP: num(col('GP')) };
    for (const k of STAT_KEYS[isG ? 'goalie' : 'skater']) c.stats[k] = num(col(k));
  }
  return entry;
};

// Where each top/bottom card's player sat in his manager's lineup that period (the user's request, 2026-11-18):
// Fantrax's period roster gives statusId 1 Active, 2 Bench, 3 Inj Res. Adds `slot` ("Active"/"Bench"/"IR") to each card
// with a manager. A player no longer on that period's roster (rare) gets no slot.
window.fxCardSlots = async function (entry) {
  const SLOT = { 1: 'Active', 2: 'Bench', 3: 'IR' }, teamOf = Object.fromEntries(Object.entries(IDS).map(([id, m]) => [m, id])), rosters = {};
  for (const kind of ['high', 'low', 'faHigh']) for (const pos of ['F', 'D', 'G']) {
    const c = entry.players[kind] && entry.players[kind][pos];
    if (!c || !c.mgr || !teamOf[c.mgr]) continue;
    if (!rosters[c.mgr]) {
      const d = await fx('getTeamRosterInfo', { teamId: teamOf[c.mgr], period: String(entry.week) });
      rosters[c.mgr] = (d.tables || []).flatMap(t => t.rows || []).filter(r => r.scorer);
    }
    const r = rosters[c.mgr].find(x => x.scorer.name === c.name);
    if (r && SLOT[r.statusId]) c.slot = SLOT[r.statusId];
  }
  return entry;
};

// The same top/bottom cards counting only players in an Active lineup slot that period (the site's Max | Active toggle,
// the user's request 2026-11-18). Adds entry.players.active = { high: {F, D, G}, low: {F, D, G} }, each card with name,
// nhl, pts, mgr, stats (STAT_KEYS) and slot "Active"; GP >= 1. Pages through the whole player pool (about 16 pages of 500):
// "ALL_TAKEN" only knows current rosters, and players dropped since would be missed.
window.fxActiveCards = async function (entry) {
  const slot = {};
  for (const [tid, mgr] of Object.entries(IDS)) {
    const d = await fx('getTeamRosterInfo', { teamId: tid, period: String(entry.week) });
    for (const r of (d.tables || []).flatMap(t => t.rows || [])) if (r.scorer) slot[r.scorer.scorerId] = { mgr, status: r.statusId };
  }
  const need = new Set(Object.keys(slot).filter(k => slot[k].status === '1')), found = new Set(), pl = [];
  for (const grp of ['HOCKEY_SKATING', 'POS_201']) {
    let pages = 1;
    for (let pg = 1; pg <= pages; pg++) {
      const t = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', positionOrGroup: grp, startDate: entry.start, endDate: entry.end, timeframeTypeCode: 'BY_DATE', pageNumber: String(pg), maxResultsPerPage: '500', sortType: 'SCORE' });
      pages = (t.paginatedResultSet && t.paginatedResultSet.totalNumPages) || 1;
      const hc = t.tableHeader.cells, col = n => hc.findIndex(x => x.shortName === n && /#/.test(x.key || '')), iF = hc.findIndex(c => c.key === 'fpts');
      for (const r of t.statsTable) {
        const sc = r.scorer;
        if (!need.has(sc.scorerId)) continue;
        found.add(sc.scorerId);
        const num = i => (i < 0 ? 0 : parseFloat(String(r.cells[i].content).replace(/,/g, '')) || 0), isG = grp === 'POS_201';
        const stats = { GP: num(col('GP')) };
        for (const k of STAT_KEYS[isG ? 'goalie' : 'skater']) stats[k] = num(col(k));
        if (!stats.GP) continue;
        const pos = isG ? 'G' : (sc.posShortNames || '').split(',').every(p => p === 'D') ? 'D' : 'F';
        pl.push({ name: sc.name, nhl: sc.teamShortName, pos, pts: num(iF), mgr: slot[sc.scorerId].mgr, stats, slot: 'Active' });
      }
      if ([...need].every(x => found.has(x))) break;
    }
  }
  const act = { high: {}, low: {} };
  for (const p of ['F', 'D', 'G']) {
    const g = pl.filter(x => x.pos === p).sort((a, b) => b.pts - a.pts);
    const strip = x => x && { name: x.name, nhl: x.nhl, pts: x.pts, mgr: x.mgr, stats: x.stats, slot: 'Active' };
    act.high[p] = strip(g[0]); act.low[p] = strip(g[g.length - 1]);
  }
  entry.players.active = act;
  return entry;
};

// The site's Insights tab, Fantrax part (the user's request, 2026-11-18). Rebuilds the whole season each week:
//   bench: { week: { mgr: { actual, optimal, left, missed: [[name, nhl, pos, pts]], sat: [[...]] } } }
//     optimal = the best full lineup from that week's Active + Bench players (slot counts below, by eligibility). Every slot
//     gets filled when the roster can fill it, so both goalie spots are always started even on a negative week (the user's
//     rule, 2026-11-18). actual = the Active players' points (matches the official score within about 0.5).
//     missed / sat carry the lineup slot (C, LW, RW, D, G) so the site can pair the swaps by position.
//   wire: { through, hits: [{mgr, name, nhl, pos, date, waiver, dropped, activeWeeks, pts}],
//           gone: [{mgr, name, nhl, pos, date, after, gp, by, byDate}] }
//     hits = each pickup's points in that manager's Active lineup from the pickup week until he dropped him;
//     gone = each drop's points after the drop (any team), and who picked him up next.
// weeks = [[week, 'YYYY-MM-DD' start, end], ...] for every finished week; through = the last week's end date.
// Paste the result into reports.json -> the season's `insights` ({ built, bench, wire }).
window.fxInsights = async function (weeks, through) {
  const SLOTS = { 206: 3, 203: 3, 204: 3, 202: 4, 201: 2 }, POS = { 206: 'C', 203: 'LW', 204: 'RW', 202: 'D', 201: 'G' }, r1 = x => Math.round(x * 10) / 10;
  const best = players => { // greedy by points with augmenting paths: optimal for slot matching
    const inSlot = {}, chosen = new Set();
    for (const s in SLOTS) inSlot[s] = [];
    const place = (p, seen) => {
      for (const s of p.elig) {
        if (!SLOTS[s] || seen.has(s)) continue;
        seen.add(s);
        if (inSlot[s].length < SLOTS[s]) { inSlot[s].push(p); return true; }
        for (const q of inSlot[s]) if (place(q, seen)) { inSlot[s] = inSlot[s].filter(x => x !== q); inSlot[s].push(p); return true; }
      }
      return false;
    };
    // greedy over every player (negatives too) = the best lineup with every fillable slot filled (a matroid basis)
    for (const p of players.slice().sort((a, b) => b.pts - a.pts)) if (place(p, new Set())) chosen.add(p);
    for (const s in inSlot) for (const p of inSlot[s]) p.optSlot = s;
    return Object.values(inSlot).flat();
  };
  const bench = {}, act = {};
  for (const [wk, start, end] of weeks) {
    const ros = {};
    for (const [tid, mgr] of Object.entries(IDS)) {
      const d = await fx('getTeamRosterInfo', { teamId: tid, period: String(wk) });
      ros[mgr] = (d.tables || []).flatMap(t => t.rows || []).filter(r => r.scorer && (r.statusId === '1' || r.statusId === '2'))
        .map(r => ({ id: r.scorer.scorerId, name: r.scorer.name, nhl: r.scorer.teamShortName, status: r.statusId, slot: r.posId, elig: (r.eligiblePosIds || []).filter(x => SLOTS[x]) }));
    }
    const need = new Set(Object.values(ros).flat().map(p => p.id)), pts = {}, found = new Set();
    for (const grp of ['HOCKEY_SKATING', 'POS_201']) {
      let pages = 1;
      for (let pg = 1; pg <= pages; pg++) {
        const t = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', positionOrGroup: grp, startDate: start, endDate: end, timeframeTypeCode: 'BY_DATE', pageNumber: String(pg), maxResultsPerPage: '500', sortType: 'SCORE' });
        pages = t.paginatedResultSet.totalNumPages;
        const iF = t.tableHeader.cells.findIndex(c => c.key === 'fpts');
        for (const r of t.statsTable) if (need.has(r.scorer.scorerId)) { pts[r.scorer.scorerId] = parseFloat(String(r.cells[iF].content).replace(/,/g, '')) || 0; found.add(r.scorer.scorerId); }
        if ([...need].every(x => found.has(x))) break;
      }
    }
    bench[wk] = {};
    for (const [m, ps] of Object.entries(ros)) {
      ps.forEach(p => { p.pts = pts[p.id] || 0; });
      const on = ps.filter(p => p.status === '1'), opt = best(ps);
      const actual = on.reduce((a, p) => a + p.pts, 0), optimal = opt.reduce((a, p) => a + p.pts, 0);
      bench[wk][m] = { actual: r1(actual), optimal: r1(optimal), left: r1(optimal - actual),
        missed: opt.filter(p => p.status !== '1').sort((a, b) => b.pts - a.pts).map(p => [p.name, p.nhl, POS[p.optSlot] || '', r1(p.pts)]),
        sat: on.filter(p => !opt.includes(p)).sort((a, b) => a.pts - b.pts).map(p => [p.name, p.nhl, POS[p.slot] || '', r1(p.pts)]) };
      for (const p of on) (act[m + '|' + p.id] = act[m + '|' + p.id] || []).push([wk, p.pts]);
    }
  }
  // every add and drop, with a sortable time stamp
  const tsOf = s => { const d = isoOf(s), m = s && s.match(/(\d{1,2}):(\d{2})\s*([AP]M)/); return d ? d + 'T' + String(m ? +m[1] % 12 + (m[3] === 'PM' ? 12 : 0) : 0).padStart(2, '0') + ':' + (m ? m[2] : '00') : null; };
  const tx = await fx('getTransactionDetailsHistory', { maxResultsPerPage: '500' });
  const groups = []; let cur = null;
  for (const r of tx.table.rows) {
    const team = r.cells.find(c => c.key === 'team'), date = r.cells.find(c => c.key === 'date');
    if (team || date || !cur || cur.id !== r.txSetId) { cur = { id: r.txSetId, mgr: team ? IDS[team.teamId] : (cur && cur.mgr), date: date ? date.content : (cur && cur.date), items: [] }; groups.push(cur); }
    cur.items.push({ code: r.transactionCode, claim: r.claimType, name: r.scorer.name, id: r.scorer.scorerId, nhl: r.scorer.teamShortName, pos: (r.scorer.posShortNames || '').replace(/,/g, '/'), executed: r.executed });
  }
  const moves = [];
  for (const g of groups) for (const i of g.items) if (i.executed !== false && (i.code === 'CLAIM' || i.code === 'DROP'))
    moves.push({ kind: i.code, mgr: g.mgr, date: isoOf(g.date), t: tsOf(g.date), waiver: i.claim === 'WW', id: i.id, name: i.name, nhl: i.nhl, pos: i.pos });
  const weekOf = d => { for (const [wk, , e] of weeks) if (d <= e) return wk; return weeks.length + 1; };
  const next = (list, after) => list.filter(x => x.t > after).sort((a, b) => (a.t < b.t ? -1 : 1))[0];
  const hits = moves.filter(x => x.kind === 'CLAIM').map(m => {
    const drop = next(moves.filter(x => x.kind === 'DROP' && x.mgr === m.mgr && x.id === m.id), m.t);
    const w0 = weekOf(m.date), w1 = drop ? weekOf(drop.date) : 99, wks = (act[m.mgr + '|' + m.id] || []).filter(([wk]) => wk >= w0 && wk <= w1);
    return { mgr: m.mgr, name: m.name, nhl: m.nhl, pos: m.pos, date: m.date, waiver: m.waiver, dropped: drop ? drop.date : null, activeWeeks: wks.length, pts: r1(wks.reduce((a, x) => a + x[1], 0)) };
  });
  const gone = [];
  for (const d of moves.filter(x => x.kind === 'DROP' && x.date < through)) {
    const s = new Date(d.date + 'T12:00:00Z'); s.setUTCDate(s.getUTCDate() + 1);
    const t = await fx('getPlayerStats', { statusOrTeamFilter: 'ALL', searchName: d.name, positionOrGroup: d.pos.split('/').includes('G') ? 'POS_201' : 'HOCKEY_SKATING', startDate: s.toISOString().slice(0, 10), endDate: through, timeframeTypeCode: 'BY_DATE', pageNumber: '1', maxResultsPerPage: '20' });
    const iF = t.tableHeader.cells.findIndex(c => c.key === 'fpts'), iGP = t.tableHeader.cells.findIndex(c => c.shortName === 'GP'), row = t.statsTable.find(r => r.scorer.scorerId === d.id);
    const pick = next(moves.filter(x => x.kind === 'CLAIM' && x.id === d.id), d.t);
    gone.push({ mgr: d.mgr, name: d.name, nhl: d.nhl, pos: d.pos, date: d.date, after: row ? parseFloat(String(row.cells[iF].content).replace(/,/g, '')) || 0 : 0, gp: row ? parseInt(row.cells[iGP].content) || 0 : 0, by: pick ? pick.mgr : null, byDate: pick ? pick.date : null });
  }
  return { built: new Date().toISOString().slice(0, 10), bench, wire: { through, hits, gone } };
};

window.__out = await window.fxPull(__PERIOD__, '__LOCK__', '__CUTOFF__');
window.__out;
