# Hints inventory: moments a new player first needs a new action or rule

Written 2026-11-27 for the "Did you know?" hints (`public/play-hints.js`). Source of the ask: Brian, 2026-11-27 (quoted in the PR).
All hint lines are new player-facing words and are **pending Brian's yes**. Numbers in a line come from the rules object the server puts on every view (`state.rules`, built by `Roles.rulesFromModules()` in `public/roles.js` from `game.js` CONFIG, `three.js` T3, `hunt.js` TH, `team.js` TM) or from `state.cfg`. None is typed into a line.

## What already exists (read first, built on, not duplicated)

| System | Where | What it does today | What this work does with it |
|---|---|---|---|
| Start-of-game cards | `public/tutorial.js` `linesFor`/`offer`, `public/ui.js` `maybeCard`/`showCard`, `Roles.roleCard` | 3 intro cards, then a role card once per animal and mode (`bo_tut_*`, `bo_card_*`) | Untouched (another builder owns it) |
| Just-in-time tips | `tutorial.js` `TUT.tip(id,text)`, called in `ui.js` render (about lines 597 to 609) | One line in `#tipbar`, once per id (`bo_tip_<id>`), 5 s, no close button, master off switch `bo_tips_off`. Ids: `hit`, `stone`, `spotted`, `sniff`, `throwtip`, `warm`, `food`, `carry`, `kick`, `marks`. Most are ostrich-only. | This is the system we build on: same once-only localStorage habit, same `bo_tips_off` switch. Six of its ids (`kick`, `warm`, `food`, `carry`, `sniff`, `throwtip`) are covered by the new table, so `TUT.tip` is wrapped to step aside for them while hints are on, and for every id while hints are off. The outcome tips `hit`, `stone`, `spotted`, `marks` stay as they are. |
| First-time guides | `ui.js` `G`/`gGet`/`gSet` (keys `bo_g_*`), status line text "Sit on eggs to warm them.", "Egg cooling. Go back.", "Hungry! Go eat." | Replace the status line the first time (switch `bo_hs_off`) | Left alone. The hints switch also sets/clears `bo_hs_off` and `bo_g_*` so one switch governs everything. |
| Coach marks | `ui.js` `COACH`, `coachNow()` | `coachNow()` begins with `return null;` so it is switched off in code | Not revived |
| Hunter alerts | `ring.js` `hunterAlerts`, `three-ui.js` near lines | "Hyena near!" / "Badger near!" status lines | Not touched; the "hunter" hint adds the rule once |
| Sense hint cloud | `sense-hint.js`, `three-ui.js` 354 to 363 | Draws the dashed bird outline and "Bird near." / "Nothing near." | Not touched; the "sense" hint explains it once |

## How a hint decides to show

- Trigger runs on the player's own state (`UI._S()`), at the end of each paint (`HINTS.check(S)`, one line at the end of `render` in `ui.js`).
- Only on the player's own turn (`S.phase==='play'`, `S.myTurn`), never when an eliminated bird is watching (`S.god`), never in the simple game (`S.simple`).
- Waits while an announcement is up or queued (`STATUS_QUEUE.state()`), a cutaway plays (`CUTAWAYS.busy()`/`flushing`), or a card, the Pass & Play hand-over, the intro, or the rules is open.
- At most one per turn; once per hint per animal (`bo_hint_<animal>_<id>`).
- Computer players never see one (they have no phone and no `UI`). Pass & Play: it shows on whatever view is on the phone, after the hand-over card is gone.

## Modes and roles

Modes: `'2'` classic, `'3'` ostrich + vulture + hunter, `'4'` 2 vs 2, `'4h'` Hunters, `'5'` 2 vs 2 + hunter. Mode comes from `modeOf(S)` (same rule as `tutorial.js`). Animal comes from `Roles.animal(h3.mySeat || S.role, kind)`.

| Animal | Seats | Modes |
|---|---|---|
| Ostrich | `blue` (2, 3, 4h), `o1`/`o2` (4, 5) | 2, 3, 4, 4h, 5 |
| Vulture | `red` (2, 3, 4h), `v1`/`v2` (4, 5) | 2, 3, 4, 4h, 5 |
| Hyena | `hunter` with kind hyena (3, 5), seat `hyena` (4h) | 3, 4h, 5 |
| Badger | `hunter` with kind badger (3, 5), seat `badger` (4h) | 3, 4h, 5 |

## The moments

The full table at the end of this file is the authoritative list of lines. The per-role tables here give the trigger and file/line for each rule moment; the two older "wrecked" rows are now the `mWreck` mark.

"Built" means it is in the TABLE in `public/play-hints.js` this round. "Not built" is on the list for a later round (Brian can pick).
Server field names: view builders are in `server.js`: `view()` (classic, lines 41 to 63), `view3()` (122 to 156), `viewT()` (397 to 440), `viewH()` (501 to 535). Rules: `game.js` (kick 229 to 234, sit/carry 255 to 257, `coldIn` 475, marks 314/341/401), `hunt.js` (rival push 204, burst 220 to 225).

### Ostrich

| Id | Moment | Exact trigger | Modes | Hint line (pending) | Built |
|---|---|---|---|---|---|
| kick | An animal is 1 square away and can be kicked | `S.can.kick` (server: `kickTargets(g).length>0` on your turn; `server.js` 59, 152, 434, 530) | all | Did you know? As the Ostrich, you can kick an animal that's 1 square away. Tap Kick to push it {rules.cfg.kick} squares. (4h adds "({kickBadger} for a badger)") | yes |
| hunter | A hunter comes into view | `h3.hunter` (modes 3, 5) or a `h3.hunters` entry with `me:false` (4h), set only inside `see` range | 3, 4h, 5 | Did you know? You only see a hunter within {see} squares. If it lands on your square it catches you, and {ko} catches knock you out. | yes |
| caught | You were just caught (first time) | `h3.lastCatch.bird === h3.mySeat \|\| S.role` | 3, 4h, 5 | Did you know? When a hunter catches you, you are set down {cfg.scramble} squares away. {ko} catches knock you out. | yes |
| cool | One of your eggs is half way to cold and you are not on it | `S.eggs[i].coldIn <= ceil(rules.cfg.warmth/2)`, alive, not carried, `pos` not your square, `mine!==false` (`ui.js` 386 to 398 uses a fixed 8 for its own guide) | all | Did you know? An egg goes cold if you don't stand on it for {warmth} rounds. The number on an egg is how many rounds it has left. Walk back to warm it. | yes |
| mateCool | A teammate's egg is half way to cold | same, `mine===false`, `h3.team` | 4, 5 | Did you know? You can warm your teammate's eggs too. Stand on one before its number runs out. | yes |
| food | You are half way to starving | `S.hungerLeft <= ceil(rules.cfg.food/2)` | all | Did you know? You must step on a leaf every {food} turns or you starve. You have {hungerLeft} turns left. | yes |
| found | The vulture found one of your eggs | `S.marks[key(egg.pos)]==='spotted'` on an alive egg | all | Did you know? A filled egg means the vulture found it. It stays found until you carry it to a new square. | yes |
| carry | You stand on an egg and may carry it | `S.onEgg && S.can.carry` | all but simple | Did you know? You can carry an egg {carryWalk} square to hide it somewhere new. Tap Carry, then a square. | yes |
| sit | You stand on an egg and may sit | `S.onEgg && S.can.sit` | all | Did you know? Tap Sit to stay on your egg and keep it warm. Anyone who can see you can see you sitting. | yes |
| bounce | The vulture is close enough to throw at you | `cheb(S.ostrich, S.vulture) <= rules.cfg.throwRange` | all | Did you know? A stone thrown at your square is kicked back at the vulture. Eggs on the squares next to you are not protected. | yes |
| wrecked | A wrecked square appears | any `S.marks[k]` is `'hit'` or `'stone'` | all | Did you know? A wrecked square is out for good. Nobody can land on it. | yes |
| leaf-close | A leaf is within walking distance and you are hungry | `cfg.foods` within `rules.cfg.walk` of you | all | (folded into `food`) | no |
| egg-on-leaf | Carry is blocked next to a leaf | `ui.js` 359 shake when carry target is within 1 of food | all | "Eggs can't go onto or next to a leaf." | not built |
| burst-pushed | A badger bursts out under the hyena (4h) | `hunt.js` 220 `canBurst` | 4h | n/a (hunters' side) | not built |

### Vulture

| Id | Moment | Exact trigger | Modes | Hint line (pending) | Built |
|---|---|---|---|---|---|
| fly | First turn, can fly | `S.fly.length>0` (classic `view()` `pub.fly`, team `viewT` 440) | all | Did you know? Tap a square to fly up to {fly} squares. Every landing sniffs for an egg {smell} square away. | yes |
| sniff | A sniff result is showing | `S.sniff` non-null (`ui.js` 501 to 505) | all | Did you know? "Egg nearby" means an egg is within {smell} square of where you landed, but not which square. A dashed egg marks where one may be. | yes |
| mateSniff | Your teammate's sniff shows on your board | `h3.mateSniff` (`viewT` 414, drawn `three-ui.js` 100) | 4, 5 | Did you know? You and your teammate share every sniff. Your teammate's answer shows on your board too. | yes |
| onEgg | You landed on a found egg | `S.marks[key(S.vulture)]==='spotted' && S.stones>0` (`ui.js` 594) | all | Did you know? Landing on an egg finds it. Tap Throw on your own square to smash it. | yes |
| throw | You can throw | `S.stones>0 && S.throw.length>0` | all | Did you know? Tap Throw to drop your stone on your square or {throwRange} square away. It wrecks the square and smashes any egg there. | yes |
| noStone | Out of stones | `S.stones<1` | all | Did you know? You are out of stones. Land on a rock pile to pick up another. | yes |
| kicked | An ostrich is next to you | `cheb(S.vulture, S.ostrich)<=1` (birds always see each other) | all | Did you know? An ostrich next to you can kick you {kick} squares straight away from it. Fly out of its reach if you can. | yes |
| hunter | A hunter comes into view | as ostrich | 3, 4h, 5 | Did you know? You only see a hunter within {see} squares. If it lands on your square it catches you, and {ko} catches knock you out. | yes |
| caught | You were just caught | as ostrich | 3, 4h, 5 | Did you know? When a hunter catches you, you are set down {scramble} squares away. {ko} catches knock you out. | yes |
| eat | The ostrich is half way to starving | `S.hungerLeft <= ceil(food/2)` (public number) | all | Did you know? The ostrich starves if it does not eat every {food} turns. The leaf number at the top is its turns left. | yes |
| wrecked | A wrecked square appears | as ostrich | all | Did you know? A wrecked square is out for good. Nobody can land on it. | yes |
| rocks-near | A rock pile is in reach while out of stones | `cfg.rocks` within `fly` | all | (folded into `noStone`) | no |
| found-team | A teammate found an egg | `viewT` found marks shared (rules text "Vultures on the same team see each other's found eggs") | 4, 5 | Not built (needs a "first found by teammate" flag the server does not send) | not built |

### Hyena and Badger (hunters)

| Id | Moment | Exact trigger | Modes | Hint line (pending) | Built |
|---|---|---|---|---|---|
| walk | First turn | `S.hmoves.length>0` (`server.js` 138, 424, 517) | 3, 4h, 5 | Did you know? Tap a square to walk up to {walk} squares. Land on a bird and you catch it. {ko} catches knock a bird out. | yes (hyena and badger) |
| sense | You are told yes or no | `S.sense!=null` on your turn (`three-ui.js` 354) | 3, 4h, 5 | Did you know? Each time you move you learn yes or no: is a bird within {sense} squares? It does not say which way. A dashed bird outline shows where one may be. | yes |
| pounce | Hyena may move again after a miss | `S.pounce` truthy | 3, 4h, 5 (hyena) | Did you know? You smelled a bird and missed, so you may move {pounce} more. That's a pounce. Tap Stay to skip it. | yes |
| burrow | Badger may hide | `!S.burrowed`, animal badger (card line: "Tap Burrow to hide. Birds within 2 squares see where.") | 3, 4h, 5 | Did you know? Tap Burrow to hide. Birds within {see} squares see where. | yes |
| ambush | Burrowed badger sees a bird next to it | `S.burrowed && S.seenBirds.length` (`three-ui.js` 349) | 3, 4h, 5 | Did you know? A burrowed badger sees the exact square of any bird next to it. | yes |
| rival | The other hunter is next to you | 4h only: `h3.hunters` entry with `me:false` within 1 (`hunt.js` 204) | 4h | Did you know? If you move onto the other hunter, you push it away. (No number: the push distance is `TH.rivalKnock`, which is not in `state.rules`.) | yes |
| caught | You knocked a bird out | `h3.lastCatch.ko` | 3, 4h, 5 | Did you know? {ko} catches knock a bird out. (mode 3 adds the {boost}-square move after a knock-out) | yes |
| burst | Badger burrowed on the hyena's square | `S.canBurst` (`server.js` 517, `hunt.js` 220) | 4h | Not built: rare, and the rules text does not describe it yet | not built |
| bird-lands-on-you | A bird landing on an unseen hunter catches it | rules text | 3, 4h, 5 | Not built: it is the bird's move, the hunter cannot act on it | not built |

## Moments no hint is built for (and why)

- Round 1 setup (place eggs, place ostrich): the role card and `G` guides already cover it, and it is not "first round play".
- The end of the game: covered by the end card.
- Timer, sound, theme: settings, not rules.
- A hunter knocked out, a bird eliminated and watching (`S.god`): hints stop; the watcher is not taking turns.

## The switch and who gets hints

- On for a new player: no game finished yet in this animal (`bo_hints_done_<animal>` unset). A game finishing (`S.phase==='over'`) sets it.
- Off after that unless switched on. The choice is `bo_hints` = `on` or `off`; a choice wins over the default.
- Labels read like Timer and Sound: "Hints on" / "Hints off", in the in-game "..." menu (`#menuHints`) and the home gear menu (`#hintsBtn2`).
- Switching on again clears every `bo_hint_*`, `bo_tip_*` and `bo_g_*` key so the hints can show once more. Switching off sets `bo_tips_off` and `bo_hs_off` so the older tips and guides are silent too.
- `bo_tips_off='1'` (set by the test suites) always wins and turns hints off.

## Added 2026-11-27 (Brian): every mark, every scenario, and a way back in

Brian's addition: "reminders on like what the different shadings make, and just really kind of explanations for pretty much every scenario", plus a way to see an explanation again any time.

### Marks and shadings (kind `mark` in the table)

Each is explained the first time it is on the player's screen (their own turn, or while waiting), once per role. Detection reads the board that `ui.js` render draws (classes and `data-tags`; lines 508 to 544).

| What you see | Selector | Who | Meaning in the line |
|---|---|---|---|
| Highlighted (lit/gray) squares | `.cell.legal` (not `.target`) | everyone | where you can go or fly this turn |
| YOU tag | `.youtag` | everyone | which animal is yours |
| Marked throw squares | `.cell.target` | vulture | where a stone can go |
| Glowing rock pile | `.cell.rockcall` | vulture | where to pick up a stone |
| Dashed egg in a corner | `.cmark.cm-egg:not(.is)` | vulture | an egg may be there |
| Filled egg | `.cell.spotted`, `.cmark.cm-egg.is` | vulture | an egg was found there |
| Yes / no flash after landing | `.cell.snyes`, `.cell.snno` | vulture | egg within smell range or not |
| Striped (hatched) squares | `.cell.sense` (`senserange.js`) | vulture: smell range; ostrich: how far a hunter is seen; hunters: sense range | how far your sense reaches |
| Fogged squares | `.cell.fog` | birds, hunter modes | a hunter there is hidden |
| Number on an egg | `.wnum` | ostrich | rounds left before cold |
| Small own egg | `.ic-myegg` | ostrich | one of your eggs |
| X | `.cell.hit`, `.cell.stone` | everyone | wrecked, nobody can land |
| Leaf | `data-tags~=food` | everyone | food for the ostrich |
| Rock pile | `data-tags~=rock` | everyone | where the vulture gets a stone |
| Dashed bird outline | `.cell.maybird` | hunters | a bird may be there |
| Mound | `.pc.bur` | everyone | a burrowed badger |
| Hearts in the strip | `.heart` | everyone | catches a bird can still take |
| Scratch marks in the strip | `.claws` | everyone | catches a hunter has made |
| Leaf, stone, egg counters | `#stats .hh/.hs/.he` | everyone | food turns left, stones held, eggs alive |
| Round counter | `#roundsLeft` | everyone | round out of the total, and who that favors |
| Timer | `#timerToggle` | everyone | the turn timer |

### Scenarios (kind `scene`)

Waiting for your turn; a computer player's turn; after a cutaway (flag set when `CUTAWAYS.busy()/flushing` was seen; line is the least certain claim in the table); an egg broken or gone cold (ostrich and vulture lines differ); the last rounds (`round >= rules.cfg.rounds - 2`); your teammate knocked out (`h3.birds[mate].out`); you are out and watching (`S.god`).
Not built: a teammate "in trouble" before a knock-out (the server sends no catch count for the teammate to the other bird in 4 vs 4; only `h3.birds[...].catches` in the 5-player strip), and the setup phase (egg and ostrich placement), which the role card covers.

### The way back in (reminders)

- Tap a mark on the board (any square that is not a move or throw square) or a counter at the top, and its explanation appears again. Works any time, with hints off, after all first-round hints are done. It does not mark a hint as seen and does not count as the one pop-up of the turn. Code: `onTap` in `play-hints.js`, one capture-phase click listener. The older tooltip bar line for the same tap is cleared so one tap shows one explanation.
- The Marks legend in How to play (`index.html`) is unchanged.
- Not built: a separate "?" button. The tap-a-mark way covers the same ground without another control.

## Full table (every line pending Brian's yes)

Wording lives in the TABLE in `public/play-hints.js`; a change is a one-line edit. {n} numbers below are the rules numbers shown with the current rules (the lines build them from `state.rules`).

| Role | Id | Kind | Line (pending Brian's yes) |
|---|---|---|---|
| ostrich | kick | rule | Did you know? As the Ostrich, you can kick an animal that's 1 square away. Tap Kick to push it 3 squares. |
| ostrich, vulture | hunter | rule | Did you know? You only see a hunter within 2 squares. If it lands on your square it catches you, and 2 catches knock you out. |
| ostrich, vulture | caught | rule | Did you know? When a hunter catches you, you are set down 3 squares away. 2 catches knock you out. |
| ostrich | cool | rule | Did you know? An egg goes cold if you don't stand on it for 15 rounds. The number on an egg is how many rounds it has left. Walk back to warm it. |
| ostrich | mateCool | rule | Did you know? You can warm your teammate's eggs too. Stand on one before its number runs out. |
| ostrich | food | rule | Did you know? You must step on a leaf every 15 turns or you starve. You have 7 turns left. |
| ostrich | found | rule | Did you know? A filled egg means the vulture found it. It stays found until you carry it to a new square. |
| ostrich | carry | rule | Did you know? You can carry an egg 1 square to hide it somewhere new. Tap Carry, then a square. |
| ostrich | sit | rule | Did you know? Tap Sit to stay on your egg and keep it warm. Anyone who can see you can see you sitting. |
| ostrich | bounce | rule | Did you know? A stone thrown at your square is kicked back at the vulture. Eggs on the squares next to you are not protected. |
| vulture | fly | rule | Did you know? Tap a square to fly up to 2 squares. Every landing sniffs for an egg 1 square away. |
| vulture | sniff | rule | Did you know? "Egg nearby" means an egg is within 1 square of where you landed, but not which square. A dashed egg marks where one may be. |
| vulture | mateSniff | rule | Did you know? You and your teammate share every sniff. Your teammate's answer shows on your board too. |
| vulture | onEgg | rule | Did you know? Landing on an egg finds it. Tap Throw on your own square to smash it. |
| vulture | throw | rule | Did you know? Tap Throw to drop your stone on your square or 1 square away. It wrecks the square and smashes any egg there. |
| vulture | noStone | rule | Did you know? You are out of stones. Land on a rock pile to pick up another. |
| vulture | kicked | rule | Did you know? An ostrich next to you can kick you 3 squares straight away from it. Fly out of its reach if you can. |
| vulture | eat | rule | Did you know? The ostrich starves if it does not eat every 15 turns. The leaf number at the top is its turns left. |
| hyena, badger | walk | rule | Did you know? Tap a square to walk up to 2 squares. Land on a bird and you catch it. 2 catches knock a bird out. |
| hyena, badger | sense | rule | Did you know? Each time you move you learn yes or no: is a bird within 2 squares? It does not say which way. A dashed bird outline shows where one may be. |
| hyena | pounce | rule | Did you know? You smelled a bird and missed, so you may move 1 square more. That's a pounce. Tap Stay to skip it. |
| hyena, badger | rival | rule | Did you know? If you move onto the other hunter, you push it away. |
| hyena | caught | rule | Did you know? 2 catches knock a bird out. After a knock-out you move 3 squares, with no pounce. |
| badger | burrow | rule | Did you know? Tap Burrow to hide. Birds within 2 squares see where. |
| badger | ambush | rule | Did you know? A burrowed badger sees the exact square of any bird next to it. |
| badger | caught | rule | Did you know? 2 catches knock a bird out. After a knock-out you move 3 squares. |
| ostrich, hyena, badger | mLegal | mark | Did you know? Highlighted squares are where you can go this turn. Tap one to go there. |
| vulture | mLegal | mark | Did you know? Highlighted squares are where you can fly this turn. Tap one to go there. |
| everyone | mYou | mark | Did you know? The YOU tag shows which animal is yours. |
| vulture | mTarget | mark | Did you know? Marked squares are where you can throw your stone. Tap one to throw. |
| vulture | mRockCall | mark | Did you know? A glowing rock pile is where you can pick up a stone. You hold up to 1. |
| vulture | mDashed | mark | Did you know? A dashed egg in a corner means an egg may be on that square. You do not know yet. |
| vulture | mFilled | mark | Did you know? A filled egg means you found an egg on that square. It stays found until the ostrich moves it. |
| vulture | mFlash | mark | Did you know? After you land, the squares around you flash. A yes flash means an egg is within 1 square. A no flash means there is none. |
| ostrich | mStripes | mark | Did you know? Striped squares are as far as you can see a hunter: 2 squares around you. Past the stripes a hunter stays hidden. |
| vulture | mStripes | mark | Did you know? Striped squares are as far as your landing sniffs: 1 square around you. |
| hyena, badger | mStripes | mark | Did you know? Striped squares are as far as you can sense a bird: 2 squares around you (just the squares next to you when burrowed). |
| ostrich, vulture | mFog | mark | Did you know? Squares farther than 2 squares from you are fogged: a hunter standing there is hidden from you. |
| ostrich | mEggNum | mark | Did you know? The number on an egg is how many rounds it has left before it goes cold. Standing on it sets it back to 15. |
| ostrich | mMyEgg | mark | Did you know? A small egg in a corner is one of your eggs. Only you can see where they are. |
| everyone | mWreck | mark | Did you know? An X marks a wrecked square. It is out for good: nobody can land on it. |
| ostrich | mFood | mark | Did you know? A leaf is food. Step on one to eat and fill your food count back up. |
| vulture, hyena, badger | mFood | mark | Did you know? A leaf is food for the ostrich. If it does not reach one in time, it starves. |
| ostrich, hyena, badger | mRock | mark | Did you know? A rock pile is where the vulture picks up a stone to throw. |
| vulture | mRock | mark | Did you know? A rock pile gives you a stone. Land on one to pick up a stone (you hold up to 1). |
| hyena, badger | mMayBird | mark | Did you know? A dashed bird outline marks a square where a bird may be. It is a guess from your sense, not a sighting. |
| ostrich, vulture, hyena | mMound | mark | Did you know? A mound is a badger that burrowed. A bird within 2 squares sees where it dug in. |
| badger | mMound | mark | Did you know? The mound is you, burrowed. Move to come back up. |
| everyone | mHearts | mark | Did you know? Each heart is one catch a bird can still take. A caught bird loses a heart, and with none left it is knocked out. |
| everyone | mClaws | mark | Did you know? Each set of scratches on a hunter is one catch it has made. |
| ostrich | mFoodChip | mark | Did you know? The leaf number at the top is how many turns you have left to eat. |
| vulture, hyena, badger | mFoodChip | mark | Did you know? The leaf number at the top is how many turns the ostrich has left to eat. |
| everyone | mStoneChip | mark | Did you know? The stone number at the top is the stones the vulture holds, out of the most it can hold (1). |
| everyone | mEggChip | mark | Did you know? The egg number at the top is the eggs still alive, out of the eggs at the start. |
| ostrich | mRound | mark | Did you know? The round counter at the top shows the round out of 30. You win if an egg is still alive at the end. |
| vulture | mRound | mark | Did you know? The round counter at the top shows the round out of 30. If an egg lasts all 30 rounds, you lose. |
| hyena, badger | mRound | mark | Did you know? The round counter at the top shows the round out of 30. If an egg lasts all 30 rounds, the hunters lose. |
| everyone | sTimer | scene | Did you know? Each turn has a timer of 10 seconds. When it runs out, your turn ends. Only the host can turn the timer off, with the clock button at the top. |
| everyone | sWait | scene | Did you know? When it is not your turn, the other players move. The line above the board says whose turn it is. |
| everyone | sBot | scene | Did you know? A computer player takes its turn by itself, by the same rules as you. |
| everyone | sCutaway | scene | Did you know? The short cartoon shows what just happened. The board now shows where everyone is. |
| ostrich | sEggGone | scene | Did you know? A broken or cold egg is gone for good. You win if any egg is still alive after round 30. |
| vulture | sEggGone | scene | Did you know? Every broken or cold egg counts toward your win. You win when every egg is broken or cold. |
| ostrich | sLast | scene | Did you know? These are the last rounds. Keep one egg alive until round 30 and you win. |
| vulture | sLast | scene | Did you know? Only a few rounds are left. If an egg lasts until round 30, you lose. |
| hyena, badger | sLast | scene | Did you know? Only a few rounds are left. If an egg lasts until round 30, the hunters lose. |
| ostrich, vulture | sMateOut | scene | Did you know? Your teammate was knocked out. You play on, and your team's goal is the same. |
| ostrich, vulture | sOut | scene | Did you know? You are out, but you can keep watching. You now see the whole board. |
