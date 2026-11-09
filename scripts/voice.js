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

  // last season in a sentence (real results), then a summer rumor (clearly tongue-in-cheek)
  lastSeason: (c, r, a, b, last) => say('lastS', [
    `Quick refresher: ${c} beat ${r} ${a} to ${b} in last year's final, and ${last} finished in the basement.`,
    `Last we saw this league, ${c} was beating ${r} ${a} to ${b} for the title and ${last} was stuck in last place.`,
    `When we left off, ${c} had just knocked off ${r} ${a}-${b} in the final, while ${last} brought up the rear.`,
    `Previously on Rene Rancourt's Day Job: ${c} over ${r}, ${a} to ${b}, in the final. ${last} finished last.`]),
  summerChamp: (c, team, r) => say('summer', [
    `Word around the league is ${c} spent the summer taking the trophy to every backyard barbecue that would have it.`,
    `Sources say ${c} has watched the replay of that final more times than is healthy.`,
    `${c} reportedly had the ${team || 'team'} logo printed on a golf shirt. Several golf shirts.`,
    `Rumor has it ${c}'s name in the league group chat has been "Champ" since April.`,
    `${r} has been heard muttering about that final all summer.`,
    `The trophy, we're told, spent July on ${c}'s mantel, right next to the TV.`,
    `${c} has been signing every text "Defending Champ" since the spring.`,
    `Over the summer, ${c} tried to get the league to rename the trophy "the ${c} Cup." The motion failed.`,
    `${c} reportedly framed the final box score and hung it in the hallway.`,
    `The rest of the league spent the summer plotting how to knock off ${c}.`,
    `Our sources can neither confirm nor deny that ${c} drank something out of the trophy this summer.`,
    `${c} claims the title has "barely come up" since spring. Everyone else says otherwise.`,
    `${c} spent the offseason telling anyone who'd listen how the ${team || 'title'} run came together.`]),
  takeoverStory: (n, o) => ' ' + say('takeS', [
    `${o} handed over the keys this summer, and ${n} wasted no time ordering new jerseys.`,
    `Word is ${n} has already redecorated the ${o} era out of the war room.`,
    `${o} leaves big skates to fill. ${n} says the rebuild is already done.`,
    `The front office has a new voice: ${n} promises to restore the franchise to glory. Bold.`]),
  rookieStory: (names, many) => ' ' + say('rookS', [
    `${names} spent the summer cramming prospect rankings, we're told.`,
    `${names} ${many ? 'show' : 'shows'} up with a fresh notebook and a lot of confidence.`,
    `Rookie hazing is scheduled for week 2. Welcome, ${names}.`]),
  returnStory: (names, many) => ' ' + say('retS', [
    `${names} ${many ? 'swear' : 'swears'} the year off was "a rebuild, not a retirement."`,
    `${names} couldn't stay away. Nobody ever really leaves this league.`,
    `Rested and dangerous, says ${names}.`]),
  departStory: (names, many) => ' ' + say('depS', [
    `${names} ${many ? 'hang' : 'hangs'} up the skates. The league will miss the trash talk.`,
    `So long to ${names}. The group chat just got a little quieter.`,
    `${names} ${many ? 'head' : 'heads'} into fantasy retirement. The jersey isn't going to the rafters, but still.`]),

  // --- the week's intro (every week after the first): where we are, a calendar hook, the headline story
  intro: wk => say('intro', [
    `Week ${wk} is in the books, so let's get to it.`,
    `Welcome back to the RRDJ desk. Week ${wk} is final, and there's plenty to unpack.`,
    `Good evening, and welcome to the week ${wk} wrap.`,
    `Pull up a chair: week ${wk} is done, and it left a mark on the standings.`,
    `Another week, another pile of storylines. Here's how week ${wk} played out.`,
    `Week ${wk} has wrapped up around the league, and we've got the highlights.`,
    `That's the final horn on week ${wk}. Let's go around the league.`,
    `Welcome back. Week ${wk} is in the rearview, and it didn't disappoint.`,
    `From the RRDJ studio, it's your week ${wk} roundup.`]),
  halloween: () => say('hallo', ['Halloween week brought a few frights, and not just at the front door.', 'It was Halloween week, and a few lineups looked like they showed up in costume.', 'Trick or treat: Halloween week handed out both around the league.']),
  thanksgiving: () => say('thanks', ['Thanksgiving week, so some managers have more to be thankful for than others.', "It's Thanksgiving week. Pass the gravy and the box scores.", 'Thanksgiving week around the league: a few teams feasted, a few got carved up.']),
  valentine: () => say('valen', ["Valentine's week, and not everybody felt the love.", "It was Valentine's week. Some teams got roses, others got heartbreak.", "Valentine's week around the league, and a few matchups were anything but sweet."]),
  stPat: () => say('stpat', ["St. Patrick's week: a few managers found the pot of gold, others are still looking for it.", "It was St. Patrick's week, and luck played its part.", "St. Patrick's week, and the luck of the Irish wasn't evenly shared."]),
  topTie: (n, rec, list) => say('topTie', [`It's crowded at the top: ${n} teams are ${rec}, ${list}.`, `We have a logjam up top, with ${list} all sitting at ${rec}.`, `${n} teams share the best record in the league at ${rec}: ${list}.`, `The top of the table is a ${n}-way tie at ${rec} between ${list}.`]),
  newTop: m => say('newTop', [`And we have a new No. 1: ${m}.`, `The big headline: ${m} is your new league leader.`, `There's a new team on top, and it's ${m}.`]),
  scoringHigh: a => say('scHi', [`The goal lights were busy, too: the league averaged ${a} a team, the best week of the season.`, `Scoring was way up across the board, ${a} per team, the highest-scoring week so far.`, `It was a big week on the scoresheet: ${a} per team, a season high.`]),
  scoringLow: a => say('scLo', [`Scoring dried up, though: the league averaged just ${a} a team, the lowest of the season.`, `It was a grind on the scoresheet, ${a} per team, the quietest week so far.`, `The goalies won this week: the league averaged only ${a} a team, a season low.`]),
  tradeTease: (n, monday) => say('trTease', [`${monday ? 'And the trade market woke up before Monday puck drop' : n > 1 ? 'And the trade market was busy' : 'And we have a trade to break down'}, so stick around.`, `Plus, ${n > 1 ? n + ' trades' : 'a trade'} to get to${monday ? (n > 1 ? ', one of them' : ',') + ' hot off the Monday-morning wire' : ''}.`, `Stay tuned for the trade${n > 1 ? 's' : ''} at the end.`]),
  upsetWeek: n => say('upWk', [`The standings got shaken up, with ${n} upsets on the card.`, `Underdogs had a big week: ${n} upsets.`, `Expect the unexpected: ${n} teams knocked off somebody well above them.`]),

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
  // streak milestones: 6, 8, then every other week from 10
  winMile: (m, n) => n === 6 ? say('w6', [`Six straight for ${m}. That's officially a streak.`, `${m} has won six in a row and is starting to look dangerous.`, `Six straight wins for ${m}. The rest of the league has noticed.`])
    : n === 8 ? say('w8', [`Eight in a row for ${m}! Somebody stop this team.`, `${m} is up to eight straight wins. That's two months without a loss.`, `Eight straight for ${m}, and nobody has an answer.`])
    : say('w10', [`Double digits! ${m} has won ${n} straight.`, `${n} straight wins for ${m}. This is getting silly.`, `${m}'s win streak hits ${n}. Book the parade?`, `Make that ${n} in a row for ${m}. Unreal.`]),
  lossMile: (m, n) => n === 6 ? say('l6', [`Six straight losses for ${m}. Time to shake up the lines?`, `${m} has dropped six in a row. Somebody check the goalie's equipment.`, `Six in a row now for ${m}, and not the good kind.`])
    : n === 8 ? say('l8', [`Eight straight losses for ${m}. Is there a trade deadline in this league?`, `${m} has lost eight straight. It's getting dark out there.`, `Eight in a row for ${m}. Somebody bring snacks.`])
    : say('l10', [`${m} has lost ${n} straight. Double digits, and not the fun kind.`, `${n} losses in a row for ${m}. Nowhere to go but up.`, `${m}'s skid reaches ${n}. Somebody send help.`]),
  streakRecord: (kind, beat, m, n, y) => ' ' + (beat
    ? `That's the longest ${kind} streak in league history, passing ${m}'s ${n} in ${y}.`
    : `That ties ${m}'s ${n} in ${y} for the longest ${kind} streak in league history.`),
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

  // --- player of the week, close calls, upsets, points race (from the user's own write-ups)
  playerOfWeek: (p, nhl, pts, m) => say('pow', [
    `Player of the week: ${p}${nhl ? ' (' + nhl + ')' : ''} put up ${pts} for ${m}.`,
    `${p} carried ${m} with ${pts} points.`,
    `First star on the ice: ${p}, ${pts} points for ${m}.`,
    `Nobody on the ice did more than ${p}: ${pts} points for ${m}.`,
    `The best performance of the week belonged to ${p}: ${pts} for ${m}.`]),
  hsCount: (m, n, tied, leader, ln) => ' ' + (tied ? say('hsTie', [`That's high score No. ${n} for ${m}, tying ${tied} for the most on the season.`, `${m} picks up high score No. ${n}, now tied with ${tied} for the league lead.`])
    : leader === m ? say('hsLead', [`That's ${n} high scores on the season for ${m}, the most in the league.`, `${m} now has ${n} weekly high scores, tops in the league.`])
    : say('hsChase', [`That's high score No. ${n} for ${m}, chasing ${leader} (${ln}).`, `${m} picks up high score No. ${n}; ${leader} still leads with ${ln}.`])),
  closeCalls: list => say('cc', [`Other close calls: ${list}.`, `A few more nail-biters: ${list}.`, `Also coming down to the wire: ${list}.`, `More sweaty finishes: ${list}.`]),
  upsets: list => say('ups', [`Upsets all over the board: ${list}.`, `Chaos in the standings: ${list}.`, `The underdogs ate this week: ${list}.`]),
  seasonLow: (m, pts) => ' ' + say('sLow', [`${m}'s ${pts} is the lowest score of the season so far.`, `Rough one for ${m}: ${pts} is the season low.`, `${m} posts the season's lowest score, ${pts}. Moving on.`]),
  pointsRace: (a, b, c, x, y, z) => say('pr', [
    `Looking at points, ${a[0]} leads the league with ${a[1]} so far, followed by ${b[0]} (${b[1]}) and ${c[0]} (${c[1]}). On the other end, ${x[0]} has been scored on the most (${x[1]}), followed by ${y[0]} (${y[1]}) and ${z[0]} (${z[1]}).`,
    `Points check: ${a[0]} (${a[1]}), ${b[0]} (${b[1]}) and ${c[0]} (${c[1]}) have scored the most, while ${x[0]} (${x[1]}), ${y[0]} (${y[1]}) and ${z[0]} (${z[1]}) have given up the most.`]),
  // --- substance on the games (the analyst's angle: how good a score really was)
  allPlay: (x, k, all) => ' ' + (k === all ? say('apAll', [`That number would have beaten every team in the league this week.`, `Nobody in the league could have stayed with that score this week.`, `Run it against the whole league and ${x} goes ${all}-0.`])
    : say('apMost', [`That would have beaten ${k} teams this week.`, `Play it against the whole league and it wins ${k} of ${all}.`])),
  mgrBest: (x, d) => ' ' + say('mgrBest', [`It's ${x}'s best week of the season, by ${d}.`, `${x} tops a previous season best by ${d}.`, `A new season high for ${x}, ${d} better than anything before it.`]),
  starResult: (m, won, o, close) => ' ' + (won ? (close ? say('stWc', [`${m} needed every one of them to get past ${o}.`, `Good thing, too: ${m} only got by ${o} by a hair.`]) : say('stW', [`${m} rode that to a win over ${o}.`, `It powered ${m} past ${o}.`, `${m} cashed it in for a win over ${o}.`]))
    : say('stL', [`It wasn't enough: ${m} still fell to ${o}.`, `The bad news for ${m}: a loss to ${o} anyway.`, `${m} lost to ${o} regardless. Tough one.`])),
  worstPlayer: (p, nhl, pts, m, via) => say('wst', [`The other side of the coin: ${p} (${nhl}) went ${pts} for ${m}${via}.`, `Least valuable player: ${p} (${nhl}), ${pts} for ${m}${via}.`, `On the wrong end of the stat sheet, ${p} (${nhl}) put up ${pts} for ${m}${via}.`]),
  toughLuck: (l, p, k, w) => say('tl', [`Tough-luck loss of the week: ${l}'s ${p} would have beaten ${k} teams, but ran into ${w}.`, `Hard-luck story: ${l} put up ${p}, good enough to beat ${k} teams this week, and still lost to ${w}.`, `${l} deserved better: ${p} beats ${k} teams most weeks, just not ${w} this week.`]),
  wonUgly: (w, p, r) => say('ugly', [`${w} won ugly, with ${p}, only the ${r}-best score of the week. A win's a win.`, `Style points don't count: ${w} won with ${p}, just the ${r}-best score of the week.`, `${w} grinds one out with ${p}, the ${r}-best score on the board. They all count the same.`]),
  loserBest: (l, p) => ' ' + say('lBest', [`${l} put up a season-high ${p} and still lost.`, `That's a season best for ${l}, too, in a losing effort.`, `${l}'s ${p} was a season high. Wrong week for it.`]),
  // --- standings paragraph
  standLead: (m, rec, gap, s, srec, isNew) => (isNew ? say('stNewLd', [`${m} takes over 1st at ${rec}`, `${m} moves to the top at ${rec}`, `${m} climbs into 1st at ${rec}`]) : say('stLd', [`${m} holds 1st at ${rec}`, `${m} stays on top at ${rec}`, `${m} keeps the top spot at ${rec}`, `${m} remains the team to beat at ${rec}`]))
    + (gap ? ', ' + gap + ' clear of ' + s + ' (' + srec + ').' : '.'),
  standTie: (m, rec, others, isNew, many) => { const are = many ? 'are' : 'is'; return say(isNew ? 'stTieN' : 'stTie', isNew
    ? [`${m} takes over 1st, but only on points for: ${others} ${are} also ${rec}.`, `${m} moves into 1st on the points-for tiebreaker, level at ${rec} with ${others}.`]
    : [`${m} holds 1st on points for, but ${others} ${are} right there at ${rec} too.`, `${m} keeps the top spot only on the tiebreaker, with ${others} also ${rec}.`, `It's ${m} in 1st by points for. ${others} ${are} level at ${rec}.`]); },
  chasers: (list, rec) => { const one = !/ and |,/.test(list); return ' ' + say('chase', [`${list} ${one ? 'sits' : 'sit'} a game back at ${rec}.`, `One game back: ${list}, at ${rec}.`, `${list} ${one ? 'lurks' : 'lurk'} a game off the pace at ${rec}.`]); },
  climber: (m, d, o) => ' ' + say('climb', [`Biggest mover: ${m}, up ${d} spots to ${o}.`, `${m} jumps ${d} spots to ${o}.`, `${m} is climbing, up ${d} to ${o}.`]),
  faller: (m, d, o) => ' ' + say('fall', [`${m} slides ${d} spots to ${o}.`, `Going the other way, ${m} drops ${d} to ${o}.`, `${m} tumbles ${d} spots to ${o}.`]),
  basement: (m, rec, isNew) => ' ' + (isNew ? say('baseN', [`${m} drops into the basement at ${rec}.`, `${m} falls to last at ${rec}.`, `${m} slides into 12th at ${rec}.`]) : say('base', [`${m} is still in the basement at ${rec}.`, `${m} props up the table at ${rec}.`, `${m} remains in last at ${rec}.`])),
  pfLuck: (m, pf, o) => ' ' + say('pfL', [`Keep an eye on ${m}: the league's most points for (${pf}) but only ${o} in the standings, so the luck should turn.`, `${m} leads the league in points for (${pf}) and sits ${o}. The record doesn't tell the whole story.`, `Nobody has scored more than ${m} (${pf}), yet ${m} is ${o}. That won't last.`]),
  // --- look-ahead and sign-off
  undercard: (a, b, tag, h2h) => ' ' + say('under', [`Also on the card: ${a} vs. ${b}${tag}.${h2h}`, `Don't sleep on ${a} vs. ${b}${tag}.${h2h}`, `Keep an eye on ${a} against ${b}${tag}.${h2h}`]),
  streakLine: (m, n, kind, o) => ' ' + (kind === 'W' ? say('slW', [`${m} puts a ${n}-game win streak on the line against ${o}.`, `Can ${o} cool off ${m}? The streak is at ${n}.`]) : say('slL', [`${m} tries to stop a ${n}-game skid against ${o}.`, `${m} needs a win badly, ${n} straight losses heading into ${o}.`])),
  signoff: () => ' ' + say('signoff', ["That's the week. Set those lineups, and we'll see you at puck drop.", "That's all from the desk. Check your goalie starts.", "We'll do it all again next week. Good luck out there.", 'Back to you in the studio.', "That's a wrap. Enjoy the games.", "That'll do it for this week. Don't forget your lineups.", 'See you next week, same time, same place.']),
  // --- the wire and trades
  tradeLead: (a, ag, b, bg, monday) => say('trLead', [`${monday ? 'Monday-morning blockbuster: ' : 'Trade alert! '}${a} lands ${ag} from ${b}, and ${b} gets ${bg} in return.`, `${monday ? 'Before the puck dropped on Monday, the phones lit up: ' : 'The phones were ringing: '}${a} picks up ${ag}, sending ${bg} to ${b}.`, `${monday ? 'Late breaking, Monday morning: ' : 'Deal done: '}${b} sends ${ag} to ${a} for ${bg}.`]),
  tradeTrail: (p, steps) => ` ${p} has had quite a week: ${steps}.`,
  flashback: (w, l, wp, lp, y) => say('flash', [`Flashback: the last time these two met in the playoffs, ${w} sent ${l} home, ${wp} to ${lp} in ${y}.`, `${l} hasn't forgotten the ${y} playoffs, when ${w} won their meeting ${wp} to ${lp}.`, `Remember ${y}? ${w} beat ${l} ${wp} to ${lp} in the playoffs.`]),
  goalieShop: list => ' ' + say('gShop', [`Goalie shopping was the theme: ${list}.`, `A run on goalies, too: ${list}.`, `The crease was in demand: ${list}.`]),
  busiest: (m, n, adds) => ' ' + say('busy', [`${m} was the busiest manager, with ${n} moves, adding ${adds}.`, `${m} worked the phones hardest: ${n} moves, adding ${adds}.`, `Nobody was busier than ${m}: ${n} moves in all, bringing in ${adds}.`]),
  // --- the wire and trades (short forms)
  wire: (n, busiest, bn) => say('wire', [`${n} moves on the wire this week${bn > 2 ? ', with ' + busiest + ' the busiest (' + bn + ')' : ''}.`, `Free agency saw ${n} moves${bn > 2 ? ', ' + bn + ' of them from ' + busiest : ''}.`, `A ${n}-move week on the waiver wire${bn > 2 ? ', led by ' + busiest + ' with ' + bn : ''}.`]),
  wireQuiet: () => say('wireQ', ['A quiet week on the wire.', 'Nobody touched the waiver wire this week.']),
  bestPickup: (m, p, nhl, pts) => ' ' + say('pick', [`Pick of the week: ${m} grabbed ${p}${nhl ? ' (' + nhl + ')' : ''}, who put up ${pts} for ${m} over the next four weeks.`, `Turned out to be a steal: ${p} gave ${m} ${pts} points over the next month.`, `${m} added ${p} and got ${pts} points out of it over the next four weeks.`]),
  tradeAlert: (a, ag, b, bg) => say('trade', [`Trade alert! ${a} gets ${ag}, ${b} gets ${bg}.`, `Blockbuster: ${a} lands ${ag}, sending ${bg} to ${b}.`, `The phones were ringing: ${a} picks up ${ag} from ${b} for ${bg}.`]),
  // --- playoff race and next week
  bubble: (a, ar, arec, b, brec, g, left) => { const half = g % 1 ? (Math.floor(g) ? Math.floor(g) + ' and a half' : 'half a') : '', edge = g === 0 ? 'nothing but a tiebreaker' : g === 1 ? 'a one-game edge' : half ? (Math.floor(g) ? 'a ' + Math.floor(g) + '-and-a-half-game edge' : 'a half-game edge') : g + '-game edge', gap = g === 0 ? 'nothing but a tiebreaker' : g === 1 ? 'one game' : half ? half + (Math.floor(g) ? ' games' : ' game') : g + ' games'; return say('bub', [
    `The race for the last playoff spot: ${a} (${ar}, ${arec}) holds ${edge} over ${b} (${brec}) with ${left} to go.`,
    `Bubble watch: ${a} sits ${ar} at ${arec}, ${g === 0 ? 'level with' : gap + ' ahead of'} ${b} (${brec}), with ${left} left.`,
    `Keep an eye on the cut line: ${a} (${arec}) and ${b} (${brec}) are separated by ${gap} with ${left} remaining.`]); },
  preview: (a, ar, b, br, h2h) => say('prev', [`Matchup of the week: ${a} (${ar}) vs ${b} (${br}).${h2h}`, `The big one next week: ${a} (${ar}) takes on ${b} (${br}).${h2h}`, `Circle this one: ${a} (${ar}) vs ${b} (${br}).${h2h}`, `Next week's headliner: ${a} (${ar}) against ${b} (${br}).${h2h}`]),
  // --- season in review (Final page)
  reviewRecords: (hsM, hsN, hiM, hiP, hiW, stM, stN) => say('rev1', [
    `The season in review: ${hsM} piled up ${hsN} weekly high scores, the most in the league. The biggest single week belonged to ${hiM} with ${hiP} in week ${hiW}${stN >= 5 ? ', and ' + stM + ' put together the longest win streak at ' + stN + ' straight' : ''}.`,
    `Looking back on the year: ${hsN} high scores for ${hsM}, a season-best ${hiP} from ${hiM} in week ${hiW}${stN >= 5 ? ', and a ' + stN + '-game win streak from ' + stM : ''}.`]),
  reviewPlayers: (top, second) => say('rev2', [`MVP of the year: ${top.name}, with ${top.pts} points for ${top.mgr}${second ? ', just ahead of ' + second.name + ' (' + second.pts + ' for ' + second.mgr + ')' : ''}.`, `Nobody scored more for their manager than ${top.name}: ${top.pts} for ${top.mgr}${second ? '. ' + second.name + ' was next with ' + second.pts + ' for ' + second.mgr : ''}.`]),
  reviewPickup: (p) => ' ' + say('rev3', [`Best pickup of the year: ${p.name}, added by ${p.mgr} in week ${p.week}, went on to score ${p.pts} for ${p.mgr}.`, `The waiver steal of the season: ${p.mgr} grabbed ${p.name} in week ${p.week} and got ${p.pts} points the rest of the way.`]),
  reviewTrade: (w, wp, l, lp) => ' ' + say('rev4', [`Trade of the year went to ${w}: ${wp} points from the deal to ${l}'s ${lp}.`, `On the trade front, ${w} came out ahead, ${wp} to ${lp} over ${l}.`]),
  reviewWire: (m, n) => ' ' + say('rev5', [`Busiest manager on the wire: ${m}, with ${n} moves.`, `${m} wore out the waiver wire with ${n} moves.`]),

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
    `The basement belongs to ${m} this year, in ${o}. On to next season.`]) + ' ' + say('draft', ['Next stop: the draft table.', 'See you at the draft.', 'Mock drafts start now.', 'The draft room awaits.'])
};
module.exports = { V, an };
