// Announcer phrasing for the past-season recaps (used by legacy_weeks.js).
// Each slot rotates through its lines in a fixed order, so a line doesn't come back until the rest of its set has
// been used. Openers and endings rotate separately and their set sizes share no factor, so the pairings keep
// changing too. No randomness: the same sheet always produces the same write-ups.
const used = {};
function say(slot, lines) {
  const n = used[slot] = (used[slot] || 0) + 1;
  let h = 7; for (const c of slot) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return lines[(n - 1 + h) % lines.length];
}
const an = n => /^(8|11|18|8\d)(\.|$)/.test(String(n)) ? 'an' : 'a'; // "an 8-game skid", "an 82.7-point win"

const V = {
  // --- season opener (once a season: 13 lines, so no two seasons open the same way)
  welcome: (id, n) => say('welcome', [
    `Welcome to the ${id} season of Rene Rancourt's Day Job!`,
    `Drop the puck: the ${id} season of Rene Rancourt's Day Job is underway!`,
    `Ladies and gentlemen, please rise. The ${id} season is here.`,
    `Here we go again. Season No. ${n} of Rene Rancourt's Day Job starts now.`,
    `The ice is fresh and the ${id} season is on.`,
    `Training camp is over. Welcome to ${id}.`,
    `It's opening night for ${id}!`,
    `Back for another winter: the ${id} season kicks off.`,
    `Puck drop on ${id}. Here's how week 1 went.`,
    `A new season, a clean slate: ${id} begins.`,
    `Sharpen the skates, ${id} is here.`,
    `The anthem's sung and the ${id} season is go.`,
    `The Zamboni has made its last lap. ${id} is underway.`]),
  defending: c => say('defending', [
    `${c} comes in as the defending champion.`,
    `${c} is the champ until somebody says otherwise.`,
    `Everyone is chasing ${c}, the defending champ.`,
    `The target is on ${c}, the defending champion.`,
    `${c} is back to defend the title.`]),

  // --- the week's lead: who had the high score
  hsWin: (x, p, o, d, margin) => say('hsOpen', [
    `${x} lights the lamp for the week's high score, ${p}.`,
    `Top of the scoresheet: ${x} with ${p}.`,
    `${x} goes off for ${p}, the best number on the board.`,
    `The big number this week belongs to ${x}: ${p}.`,
    `${x} fills the net for ${p}, tops in the league.`,
    `Somebody check ${x}'s sticks: ${p}, the high score of the week.`,
    `First star of the week: ${x}, with a league-best ${p}.`,
    `Nobody topped ${x}'s ${p} this week.`,
    `${x} brings the heat with ${p}, best in the league.`]) + ' ' + (margin >= 40 ? say('hsBig', [
    `${o} never stood a chance, falling by ${d}.`,
    `${o} gets buried by ${d}.`,
    `That's ${an(d)} ${d}-point beatdown of ${o}.`,
    `${o} gets run out of the building, ${d} behind.`,
    `${x} beats ${o} by ${d}, and it wasn't pretty.`]) : margin < 10 ? say('hsSmall', [
    `${x} needed most of it, too: ${o} only lost by ${d}.`,
    `${o} made it close, though, losing by just ${d}.`,
    `It still only gets ${x} past ${o} by ${d}.`]) : say('hsMid', [
    `${x} beats ${o} by ${d}.`,
    `That's good for ${an(d)} ${d}-point win over ${o}.`,
    `${o} is on the wrong end of it, by ${d}.`,
    `${x} skates past ${o} by ${d}.`,
    `The win over ${o} comes by ${d}.`,
    `${x} handles ${o} by ${d}.`,
    `${o} falls by ${d}.`])),
  hsTie: (x, p, o) => `${x} posts the week's high score with ${p}, and still only ties ${o}.`,
  catWin: (x, p, o, q) => say('catWin', [
    `${x} wins the most categories this week with ${p}, beating ${o} ${p}-${q}.`,
    `Category king of the week: ${x}, taking ${p} in ${an(p)} ${p}-${q} win over ${o}.`,
    `${x} sweeps up ${p} categories and beats ${o} ${p}-${q}.`,
    `Nobody won more categories than ${x}'s ${p}, good for ${an(p)} ${p}-${q} win over ${o}.`,
    `${x} owns the stat sheet with ${p} categories, beating ${o} ${p}-${q}.`]),
  catTie: (x, p, o) => `${x} wins the most categories this week with ${p}, and still only ties ${o}.`,

  // --- records
  record: (who, pts, when) => say('record', [
    `That's a new league record for a single week, topping ${who}'s ${pts} ${when}. Frame that one.`,
    `Put it in the record book: no one in league history had topped ${who}'s ${pts} ${when}. Until now.`,
    `That's the best week in league history, beating ${who}'s ${pts} ${when}.`]),
  seasonBest: () => say('seasonBest', [' Best score of the season so far.', ' Nobody has scored more in a week all season.', " It's the season high, for now.", ' That sets the high-water mark for the season.']),
  recordLow: (who, pts, rWho, rPts, when) => say('recordLow', [
    `At the other end, ${who}'s ${pts} is the lowest score in league history, under ${rWho}'s ${rPts} ${when}. Woof.`,
    `And a record nobody wants: ${who}'s ${pts} is the lowest week ever, below ${rWho}'s ${rPts} ${when}.`]),

  // --- close game, blowout, upset
  photo: (tag, w, l, a, b) => say('pfLabel', ['Photo finish', 'Down to the wire', 'Squeaker of the week', 'Bang-bang finish', 'Nail-biter of the week', 'Sweaty palms special', 'Too close for comfort'])
    + tag + `: ${w} ` + say('pfVerb', ['edges', 'nips', 'sneaks past', 'holds off', 'survives', 'outlasts']) + ` ${l} ${a} to ${b}.`,
  inches: m => ' ' + say('inches', [
    `A margin of ${m}. Somebody get Toronto on the line for a review.`,
    `That's ${m}. One more shot on goal and it flips.`,
    `Just ${m} in it. Check the replay.`,
    `${m} points. That's a skate blade.`,
    `Decided by ${m}. Brutal.`]),
  closest: (tag, w, l, a, b) => say('clLabel', ['Closest game', 'Tightest one of the week', 'Best game on the card', 'Closest finish'])
    + tag + `: ${w} ` + say('clVerb', ['edges', 'gets past', 'holds off', 'beats', 'tops']) + ` ${l} ${a} to ${b}.`,
  blowout: (tag, w, l, d) => say('boLabel', ['Blowout of the week', 'Woodshed special', 'Mercy rule watch', 'Not close', 'Laugher of the week', 'Runaway of the week', 'One-way traffic'])
    + tag + ': ' + say('boVerb', [`${w} over ${l} by ${d}`, `${w} rolls ${l} by ${d}`, `${w} buries ${l} by ${d}`, `${w} cruises past ${l} by ${d}`, `${w} blows out ${l} by ${d}`, `${w} runs away from ${l}, winning by ${d}`]) + '.',
  pullGoalie: () => ' ' + say('pull', ['Somebody pull the goalie.', 'Call the Zamboni.', 'Mercy.', 'Somebody stop the fight.']),
  upset: (w, wo, l, lo) => say('upLabel', ['Upset alert', 'Stop the presses', 'Shocker', "Didn't see that coming", 'Plot twist', 'Giant-killer of the week']) + ': '
    + say('upVerb', [`${w}, ${wo} coming in, knocks off ${l} (${lo})`, `${wo}-place ${w} takes down ${l}, who came in ${lo}`, `${w} (${wo}) stuns ${lo}-place ${l}`, `${w} sat ${wo} and still beats ${l} (${lo})`]) + '.',

  // --- streaks and starts
  hot: (m, n) => say('hot', [`${m} is rolling with ${n} straight wins.`, `${m} is on a heater: ${n} straight wins.`, `Make it ${n} in a row for ${m}.`, `${m} can't lose right now: ${n} straight.`, `${n} wins in a row for ${m}, and counting.`, `${m} stays hot with ${n} straight wins.`, `The streak is alive: ${m} has won ${n} straight.`, `${m} keeps piling up wins: that's ${n} straight.`, `Who's going to stop ${m}? ${n} wins in a row now.`, `${m} extends the win streak to ${n}.`]),
  cold: (m, n) => say('cold', [`${m} has dropped ${n} in a row.`, `${m}'s skid hits ${n}.`, `Somebody check on ${m}: ${n} straight losses.`, `${m} is in a funk, ${n} losses in a row.`, `Still no answer for ${m}, now ${n} straight losses.`, `${m} can't buy a win: ${n} in a row.`, `The losses keep coming for ${m}: ${n} straight.`, `${m} is stuck in a ${n}-game slide.`, `Rough stretch for ${m}, now ${n} straight losses.`, `${m} looks for answers after loss No. ${n} in a row.`]),
  snapSkid: (m, n) => say('snapSkid', [`${m} snaps ${an(n)} ${n}-game skid.`, `${m} finally wins again, ending ${an(n)} ${n}-game slide.`, `The skid is over: ${m} wins for the first time in ${n + 1} weeks.`, `${m} breaks through, snapping ${n} straight losses.`]),
  snapWin: (m, n) => say('snapWin', [`${m}'s ${n}-game win streak is over.`, `All good things: ${m}'s ${n}-game run comes to an end.`, `${m}'s heater cools off after ${n} straight wins.`, `The ${n}-game win streak ends for ${m}.`]),
  perfect: (m, n) => say('perfect', [`${m} is still perfect at ${n}-0.`, `${n}-0 and counting for ${m}.`, `Still unbeaten: ${m} at ${n}-0.`, `${m} hasn't lost yet: ${n}-0.`]),
  winless: (names, many, n) => say('winless', [`${names} ${many ? 'are' : 'is'} still looking for a first win (0-${n}).`, `Still waiting on win No. 1: ${names}, 0-${n}.`, `0-${n} and counting for ${names}.`]),

  // --- all-time head-to-head notes
  seriesSnap: (w, l, n) => say('serSnap', [`${w} finally beats ${l}, snapping ${an(n)} ${n}-game losing streak in the series.`, `The curse is lifted: ${w} beats ${l} for the first time in ${n + 1} meetings.`, `${w} gets the monkey off the back, ending ${l}'s ${n}-game run in the series.`, `After ${n} straight losses to ${l}, ${w} finally wins one.`, `${l}'s ${n}-game hold on ${w} is over.`]),
  seriesPerfect: (w, l, n) => say('serPerf', [`${w} is now ${n}-0 all-time against ${l}.`, `${l} still hasn't beaten ${w}: ${n}-0 all-time.`, `${w} owns ${l}, ${n}-0 all-time.`, `Make it ${n}-0 all-time for ${w} over ${l}.`]),
  seriesRun: (w, l, n) => say('serRun', [`${w} has now beaten ${l} ${n} straight times.`, `${n} straight wins over ${l} for ${w}.`, `${l} can't solve ${w}: ${n} losses in a row in the series.`, `${w} has ${l}'s number, ${n} straight wins.`]),
  seriesEven: (w, l, r) => say('serEven', [`The all-time ${w}-${l} series is dead even at ${r}.`, `All square: ${w} and ${l} are ${r} all-time.`, `${w} evens the all-time series with ${l} at ${r}.`]),

  // --- defending champ, rematches, last year's storylines
  defenseWin: (c, o) => say('defW', [`Title defense begins: ${c} opens with a win over ${o}.`, `The champ starts where the champ left off: ${c} beats ${o}.`, `${c} opens the title defense by taking down ${o}.`, `No hangover for the defending champ: ${c} beats ${o} in the opener.`]),
  defenseLoss: (c, o) => say('defL', [`Not the start ${c} wanted: the defending champ falls to ${o} in the opener.`, `${o} welcomes the defending champ back with a loss: ${c} drops the opener.`, `Championship hangover? ${c} loses to ${o} in week 1.`, `${o} takes down the defending champ, ${c}, right out of the gate.`]),
  rematchAgain: (c, r, a, b) => say('rmA', [`A rematch of last year's final, and ${c} beats ${r} again, ${a} to ${b}.`, `Last year's final, take two: ${c} wins it again, ${a} to ${b} over ${r}.`, `${r} wanted revenge for last year's final and didn't get it: ${c} wins ${a} to ${b}.`]),
  rematchRevenge: (c, r, a, b) => say('rmR', [`A rematch of last year's final, and this time ${r} gets revenge on ${c}, ${a} to ${b}.`, `Payback: ${r} beats ${c}, last year's champ, ${a} to ${b} in a rematch of the final.`, `${r} has waited all summer for this one, and beats ${c} ${a} to ${b} in a rematch of last year's final.`]),
  lastToTop: (m, o) => say('lastTop', [`Remember ${m} finishing dead last a year ago? ${m} sits ${o} at the turn.`, `From last place a year ago to ${o} at the halfway mark: ${m} is for real.`, `${m} finished at the bottom last season and is ${o} now. What a difference a year makes.`]),
  champTrouble: (c, o) => say('chT', [`The defending champ is in trouble: ${c} is ${o} at the halfway mark.`, `Uneasy lies the crown: ${c}, the defending champ, sits ${o} at the turn.`, `${c} won it all last year and is ${o} at the halfway point.`]),

  // --- standings line
  leaderStill: (m, r) => say('ldS', [`${m} leads the way at ${r}.`, `${m} still sits on top at ${r}.`, `Nobody has caught ${m} yet: 1st at ${r}.`, `${m} keeps the top spot at ${r}.`, `Still ${m}'s league: 1st at ${r}.`, `${m} holds 1st at ${r}.`, `Top of the table: ${m}, ${r}.`, `${m} stays in front at ${r}.`]),
  leaderNew: (m, r) => say('ldN', [`${m} takes over 1st at ${r}.`, `New sheriff in town: ${m} grabs 1st at ${r}.`, `${m} climbs to the top at ${r}.`, `There's a new No. 1: ${m} at ${r}.`, `${m} moves into 1st at ${r}.`]),
  dropsLast: (b, o) => ' ' + say('dropL', [`${b} drops to ${o}.`, `${b} slides into ${o}.`, `${b} falls to the basement.`]),
  halfway: (l, lr, s, sr, b) => say('half', [
    `Halfway home: ${l} leads at ${lr}, ${s} is right behind at ${sr}, and ${b} has work to do in last place.`,
    `At the turn it's ${l} on top at ${lr}, with ${s} chasing at ${sr}. ${b} brings up the rear.`,
    `The midway report: ${l} (${lr}) leads ${s} (${sr}), and ${b} needs a big second half.`,
    `Half a season down. ${l} leads at ${lr}, ${s} sits 2nd at ${sr}, and ${b} is in the basement.`]),

  // --- holidays and breaks
  christmas: () => say('xmas', ['Christmas week around the league, and somebody found a little something extra under the tree. ', "Ho ho hockey: it's Christmas week. ", 'Merry Christmas from the RRDJ desk! ', 'Christmas week, and Santa clearly has favorites. ', "Stockings hung, skates sharpened: it's Christmas week. ", "It's Christmas week, so let's see who got coal. "]),
  christmasShort: () => say('xmasS', ["Merry Christmas from the RRDJ desk. The NHL's holiday break makes this a short week, so the scores run low. ", 'A short holiday week, thanks to the NHL\'s Christmas break, so the scores run low. ', 'The NHL takes its Christmas break, so a short week and low scores. ']),
  newYear: (a, b) => say('ny', [`Happy New Year! ${a} goes out and ${b} comes in. `, `Ring in ${b}! The calendar flips and the games go on. `, `Out with ${a}, in with ${b}. `, `New year, same grind: ${b} is here. `]),
  holidayLong: (n, a, b) => say('holL', [`A ${n}-week matchup over the holidays (${a} to ${b}). `, `The holidays bring a ${n}-week matchup (${a} to ${b}). `, `Long holiday matchup this time: ${n} weeks, ${a} to ${b}. `]),
  breakLong: (n, a, b, label, big) => say('brk', [`A ${n}-week matchup (${a} to ${b}) to cover the ${label} break`, `The ${label} break stretches this one to ${n} weeks (${a} to ${b})`, `${n} weeks in one matchup (${a} to ${b}) for the ${label} break`]) + (big ? ', so the numbers run big. ' : '. '),
  longWeek: () => say('lw', ['A multi-week period this time, so the scores run high. ', 'Extra days this period, so the scores run high. ']),
  shortWeek: () => say('sw', ['A short week, so the scores run low. ', 'Short week, low scores. ']),

  // --- end of the regular season
  playoffField: (l, lr, n, list) => say('pfield', [
    `That wraps the regular season, with ${l} on top at ${lr}. The ${n}-team playoff field is set: ${list}.`,
    `The regular season is in the books, and ${l} finishes 1st at ${lr}. Your ${n}-team playoff field: ${list}.`,
    `${l} takes the regular-season crown at ${lr}. Here's the ${n}-team field: ${list}.`,
    `Regular season, done. ${l} tops the table at ${lr}, and the ${n} playoff teams are ${list}.`]),
  byes: (names, many) => ' ' + say('byes', [`${names} earn${many ? '' : 's'} a first-round bye.`, `${names} get${many ? '' : 's'} to rest up with a first-round bye.`, `First-round byes go to ${names}.`]),
  justMissed: (m, r) => ' ' + say('miss', [`${m} just misses out at ${r}.`, `${m} is the first team out at ${r}.`, `So close for ${m}, who misses the cut at ${r}.`, `${m} finishes one spot short at ${r}.`]),
  champMisses: c => ' ' + say('chM', [`The defending champ ${c} won't get to defend: no playoffs this year.`, `No title defense for ${c}, who misses the playoffs.`, `${c}'s reign ends early: the defending champ misses the playoffs.`]),
  backIn: (names, many) => ' ' + say('back', [`${names} ${many ? 'are' : 'is'} back in the dance after missing last year.`, `${names} ${many ? 'return' : 'returns'} to the playoffs after a year away.`, `Welcome back to the postseason, ${names}.`]),
  playoffRun: (m, o) => ' ' + say('run', [`And ${m} is in for the ${o} straight season.`, `${m} makes it ${o} straight trips to the playoffs.`, `That's the ${o} straight playoff appearance for ${m}.`]),

  // --- the final (once a season: sets of 8 to 12)
  champLow: (c, s, id) => s >= 6 ? say('chLong', [`Nobody saw this coming: No. ${s} seed ${c} wins the ${id} title!`, `Cinderella story: ${c}, seeded No. ${s}, wins the ${id} championship!`, `Bust up your brackets: No. ${s} seed ${c} is the ${id} champion!`])
    : say('chLow', [`From the No. ${s} seed, ${c} wins the ${id} championship!`, `The No. ${s} seed goes all the way: ${c} is your ${id} champion!`, `${c} wins the ${id} title from the No. ${s} seed!`, `No byes, no problem: No. ${s} seed ${c} wins the ${id} championship!`]),
  champTop: (c, s, id) => say('chTop', [`${c} wins the ${id} championship as the No. ${s} seed!`, `${c} is your ${id} champion, from the No. ${s} seed!`, `The No. ${s} seed delivers: ${c} wins the ${id} title!`, `${c} takes the ${id} crown as the No. ${s} seed!`]),
  flourish: () => ' ' + say('flourish', ['Raise the banner!', 'Cue the Rene Rancourt fist pumps.', 'Get the champagne on ice.', 'Hoist it!', 'Somebody fetch a Sharpie for the trophy.', "Parade's at noon.", 'Drinks are on the champ.', 'Fire up the goal horn.', 'Somebody order the rings.', 'Take a lap with it.', 'Ring the bell!', 'That one goes on the banner.']),
  repeat: (c, first, n) => say('repeat', [`Back-to-back! ${c} repeats as champion`, `Two in a row for ${c}`, `${c} does it again`]) + (first ? ', the first repeat in league history' : '') + '.' + (n > 2 ? ` That's title No. ${n}.` : ''),
  titleN: (c, n, list) => say('titleN', [`That's title No. ${n} for ${c} (also ${list}).`, `${c} adds title No. ${n} to go with ${list}.`, `Title No. ${n} for ${c}, after ${list}.`, `${c} is a ${n}-time champ now (also ${list}).`, `Another one for ${c}: title No. ${n}, joining ${list}.`]),
  titleSince: (c, n, last) => say('titleS', [`That's title No. ${n} for ${c}, the first since ${last}.`, `${c} ends a long wait: title No. ${n}, the first since ${last}.`, `The drought is over for ${c}. Title No. ${n}, and the first since ${last}.`]),
  firstTitle: (c, k) => k >= 3 ? say('firstLate', [
    `${c} finally gets a ring. First title, in season No. ${k} in the league.`,
    `${c} breaks through for a first title, ${k} seasons in.`,
    `${k} seasons of trying, and ${c} is finally a champion.`]) : say('first', [
    `It's the first title for ${c}. Get that name on the Cup.`,
    `A first championship for ${c}. Nobody can take this one away.`,
    `${c} joins the champions club for the first time.`,
    `Title No. 1 for ${c}. The first one is always the sweetest.`,
    `Mark it down: ${c}'s first championship.`,
    `${c} is a champion for the first time.`]),
  turnaround: (c, o) => ' ' + say('turn', [`A year ago ${c} finished ${o}. Talk about a turnaround.`, `${c} finished ${o} last season. Worst to first, more or less.`, `Last year: ${o}. This year: champion. Not bad, ${c}.`]),
  runnerAgain: s => ' ' + say('runA', [`${s} comes up one win short in the final for the second straight year.`, `Second straight trip to the final for ${s}, and second straight loss.`, `${s} loses in the final again, two years running.`]),
  podium: (s, t, o, a, b) => say('pod', [
    `${s} settles for 2nd, and ${t} takes 3rd by beating ${o} ${a} to ${b}.`,
    `${s} has to settle for silver, and ${t} grabs the bronze with a ${a}-${b} win over ${o}.`,
    `Runner-up: ${s}. Third place goes to ${t}, ${a} to ${b} over ${o}.`,
    `${s} finishes 2nd, and ${t} beats ${o} ${a} to ${b} for 3rd.`,
    `${s} takes 2nd. The bronze goes to ${t}, topping ${o} ${a} to ${b}.`,
    `${s} goes home with 2nd, and ${t} wins the 3rd-place game over ${o}, ${a} to ${b}.`]),
  podiumNoGame: (s, t) => `${s} settles for 2nd, and ${t} finishes 3rd.`,
  playoffUpset: (m, ms, o, os, round) => say('pUp', [`Upset of the playoffs: No. ${ms} ${m} knocks off No. ${os} ${o} in the ${round}.`, `Biggest shocker of the playoffs: No. ${ms} ${m} over No. ${os} ${o} in the ${round}.`, `Bracket buster: No. ${ms} ${m} sends No. ${os} ${o} home in the ${round}.`, `The ${round} brought the upset of the year, No. ${ms} ${m} over No. ${os} ${o}.`]),
  didItAll: (c, r) => say('all', [`${c} did it all, winning the regular season at ${r} too.`, `${c} also won the regular season at ${r}. A season to remember.`, `Regular-season title (${r}) and the championship: ${c} owned this season.`, `${c} finished 1st in the regular season too, at ${r}.`]),
  regExit: (m, r, o, round) => say('rEx', [`${m} won the regular season at ${r} but fell to ${o} in the ${round}.`, `${m} took the regular season at ${r}, then ran into ${o} in the ${round}.`, `Regular-season champ ${m} (${r}) went out to ${o} in the ${round}.`, `${m} finished 1st at ${r}, only to lose to ${o} in the ${round}.`]),
  regStings: (m, r) => say('rSt', [`${m} won the regular season at ${r}, so that one stings.`, `That's ${m}, the regular-season champ at ${r}, going home early.`, `Ouch for ${m}, who won the regular season at ${r}.`]),
  regPlace: (m, r, o) => `${m} won the regular season at ${r} and finishes ${o}.`,
  seasonEnd: (m, o, id) => say('end', [
    `At the other end, ${m} finishes ${o}. See you next season.`,
    `And at the bottom of the table, ${m} finishes ${o}. That's a wrap on ${id}.`,
    `${m} brings up the rear in ${o}. Lights out on ${id}. See you next season.`,
    `${m} takes ${o}, and there's always next year. Thanks for a great ${id}.`,
    `Last place goes to ${m} (${o}). The ${id} books are closed.`,
    `${m} finishes ${o}, but hope springs eternal. See you in the fall.`,
    `Somebody had to finish ${o}, and this year it's ${m}. Until next season!`,
    `${m} lands in ${o}. That's all for ${id}, folks.`,
    `And ${m} holds down ${o}. Summer starts now.`,
    `${m} closes the book on ${id} in ${o}. See you next season.`,
    `${o} place: ${m}. That's a season. Goodnight, everybody.`,
    `The basement belongs to ${m} this year, in ${o}. On to next season.`])
};
module.exports = { V, an };
