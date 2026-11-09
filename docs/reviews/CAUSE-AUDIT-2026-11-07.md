# Battle Ostriches: "never show a result without its cause" audit

Date: 2026-11-07. Repo `/Users/brianhowe/code/battle-ostriches`, branch `main` (clean at start, nothing edited, nothing run).
Method: read the rules (`game.js`, `three.js`, `hunt.js`, `team.js`), the per-viewer builders in `server.js` (`view`, `view3`, `viewH`, `viewT`, `clock3/clockH/clockT`), `ai.js redView`, and the client (`public/ui.js render`, `public/three-ui.js`, `public/catchtext.js`, `public/ring.js`, `public/fx.js`, `public/smash.js`, `public/roles.js`). All findings come from reading code. I did not open a browser, so every "shows today" line says what the code builds, not what a screenshot proved. The one claim worth a quick live check is G1(a) below.

## How to read this

Ratings: **OK** = the player sees what happened and why, near where they look. **WEAK** = shown, but unclear, too brief, or away from where they look. **MISSING** = a visible change with no explanation. **OK (hidden)** = the viewer is not supposed to learn it, so silence is correct.

Viewer words: **Subject** = the animal it happened to. **Cause** = the animal that did it. **Sees** = another player who can see the square. **Blind** = a player who cannot see it.

Modes: **2P** classic (`game.js`), **3P** (`three.js`), **4H** Hunters (`hunt.js`), **2v2** and **2v2+H** (`team.js`). "All" = every mode. Where a row says "hunter modes" it means 3P, 4H, 2v2+H.

Two facts about the client that affect many rows:

* **F1. Pop-ups die at the next state.** Every board pop-up (`pop()` in `three-ui.js`: catch lines, rival line, "HYENA NEAR", sense) is appended inside `#board`, and `render()` in `ui.js` starts with `board.innerHTML=''`. The catch pop is styled to last 3.4 s (`.h3pop.catch`, `three.css`), but the next server state (a bot moves after 0.8 to 1.5 s, `schedAI/sched3/schedH`) wipes it. A catch is usually followed straight away by another animal's move, so the sentence is often on screen for about a second. The persistent leftovers are the HURT tag, the pip chips and the hint line.
* **F2. Nothing reads `timeout`, `lastHunter`, `x.last`, `lost` (except the hint) or `lastAction.type` for stay/pass.** The server records `lastAction = {type:'pass'|'stay', timeout:true}` and hunter `last` objects. The client ignores them. So timeouts, hunter stays and the hunter's own last action produce no text anywhere.

---

## 1. Events by mode

### 1a. Setup and connection (all modes)

| ID | Event | Viewer | What the screen shows today | Rating |
|---|---|---|---|---|
| S1 | Ostrich hides an egg | Subject | Hint "Tap a glowing square to hide an egg (N left). Not on rocks, or on or next to food." (`ui.js` render, `setupEggs`). Glowing legal squares. | OK |
| S1 | | Others | "The ostrich is hiding its eggs…" (2v2: "The ostriches are choosing where to start…"). | OK |
| S2 | Ostrich placed, play starts | All | Hint switches to "YOUR TURN · …" or "<Animal>'s turn…". Vulture opens round 1. | OK |
| S3 | First-turn role card | Each seat | `showCard` from `roles.js`, once per animal per phone. For hunters it says nothing about the rival bump (see G1). | OK for bird cards, WEAK for Hunters-mode cards |
| S4 | Waiting for players | Host/others | Panel "Waiting for your opponent. Send them this link:" or, in hunter modes, "Waiting for: <open seats>. Send them this link:" (`three-ui.js after`). | OK |
| S5 | My own connection drops | Subject | `#log`/`status()`: "Reconnecting… (try N)". | OK |
| S6 | Another human's connection drops | 2P | `#log` "Opponent offline… they can rejoin with the same link." (`ui.js`, `S.joined&&!S.opponent`). | OK |
| S6 | | 3P/4H/2v2/2v2+H | `h3.seats` carries 'on'/'off'/'bot' but the client only uses 'open'. Nothing says a seat is offline; that seat's turns later auto-pass after 10 s (T-rows below). In 3P the bird-to-bird "opponent" flag still prints the 2P log line only for blue/red, never for a missing hunter. | MISSING |
| S7 | Server restarted, game lost | All | Overlay "Game was reset / The server restarted and this game could not be restored." (`gameGone`). | OK |
| S8 | Rematch same/change | All | New state; no text beyond the board resetting. Pop-up counters in `three-ui.js` (`lastCatch`, `hPieces.rv`) persist across a rematch on the same page (see G1(a)). | OK (minor bug) |
| S9 | Game over | Each | `#over` box: 2P "The ostrich kept N egg(s) alive for 30 rounds." / "The ostrich starved in round N." / "The last egg went cold in round N." / "The vulture smashed every egg by round N." Hunter modes: `over/tOver/hOver` in `three-ui.js` (e.g. "The hyena knocked out both birds in round N.", "Both birds were out. Knock-outs: hyena X, badger Y. Tie: the last knock-out wins."). Winner's side differs (e.g. winBy 'starved' means "ostrich out and no eggs left" in hunter modes). | OK |

### 1b. Core bird events (game.js rules, shown in every mode)

| ID | Event | Viewer | What the screen shows today | Rating |
|---|---|---|---|---|
| M1 | Ostrich steps | Subject | Piece moves; hint resets. | OK |
| M1 | | Vulture/Sees | Piece appears on the new square (birds always see each other). Classic theme draws no trail; themed skins tween the sprite only for ostrich and vulture (`fx.js sprite`). The cause (the other player's turn) is obvious. | OK |
| M2 | Ostrich sits | Subject | Button "Sit · N left", ring refills ("Stand on the egg to refill it" tip). | OK |
| M2 | | Vulture | Ostrich simply does not move. Because classic has no "stay" action, no move on the ostrich's turn means it is on an egg (a rule-level hint, not a UI one). | OK (hidden) |
| M2 | Sit limit (3 in a row) | Subject | Hint "You sat 3 turns in a row. Step off this turn."; Sit button "Sit · step off first". | OK |
| M3 | Ostrich carries egg | Subject | "Carry selected. Tap a glowing square. This does not end your turn." Egg ring follows the ostrich (`.carry` + `warmRing`). | OK |
| M3 | | Vulture | Tooltip "The ostrich (carrying something)", small egg icon next to the ostrich. | OK |
| M3 | | Vulture, found-egg marker | If the egg was already found, the yellow "found egg" icon on that square just disappears (`carry` deletes the `spotted` mark). No words. | WEAK |
| M4 | Carried egg set down automatically after the vulture's turn (`dropCarried`) | Subject | The carry icon disappears and a normal egg ring appears on the ostrich's square. No text. The only mention is the one-time tip "Carry egg: move it 1 square to hide it again." | WEAK |
| M4 | | Vulture | Carry icon disappears. | WEAK |
| M5 | Vulture flies and sniffs | Subject | Pop "Egg nearby!" / "No egg nearby", wave on the square, green "?" squares, banner of the same words (`ui.js` snpop, `BO.sniffAnnounce`). | OK |
| M5 | | Ostrich/Sees | Vulture piece moves. Pop "Vulture smells an egg nearby" only on a yes (`showSniffPop` hides the "no"). Squares around the vulture get the `snseen` outline. | OK |
| M5 | | 2v2 ostriches | `sniff` is not sent to ostriches at all in `viewT`. They see the vulture move, nothing else. | OK (hidden) |
| M6 | Vulture lands on an unguarded egg | Subject | Banner/pop "Found egg!"; yellow egg icon; hint "You found an egg. Smash it: tap Throw stone, then your square." (or "You found an egg, but you have no stone. Get one, then come back."). | OK |
| M6 | | Ostrich | On its next turn hint prefix "The vulture found an egg! Move it or sit on it."; egg gets the `found` ring; sound "warn". Shown only when `newTurn&&S.myTurn`. | OK |
| M6 | | Vulture lands on the ostrich's guarded egg | No find, no mark. Vulture gets the sniff yes only. | OK (hidden) |
| M7 | Vulture lands on a rock pile (refill) | Subject | HUD "Vulture stones 1/1" changes at once; text "Picked up a stone." appears only while the OSTRICH is taking its turn (`ui.js`, `la.refill`, `!S.myTurn`). By the vulture's next turn the last action is the ostrich's, so the sentence is gone. Rock piles glow when empty-handed (`rockcall`). | WEAK |
| M7 | | Ostrich | Vulture stones counter in the HUD changes 0/1 to 1/1 with no words; the vulture is standing on the rock icon. | WEAK |
| M8 | Stone thrown, misses | Subject | Stone arcs, thud, grey stone mark, count 1/1 to 0/1, "Miss." (`ui.js` ev). First-time tip explains the mark. | OK |
| M8 | | Ostrich | "The stone missed." on its next turn, same animation (`smash.js`), stone mark stays. | OK |
| M9 | Stone thrown at the ostrich's square (bounce) | Subject | Animation then "EGG SAFE" or "NO EGG" overlay 2 s (`smash.js reveal`), "Bounced! Egg under ostrich." / "Bounced! No egg." | OK |
| M9 | | Ostrich | Same overlay and text. | OK |
| M10 | Stone smashes an egg | Both | "💥 Smash!" banner, crack animation, red X on the square, eggs-left counter drops, ostrich ev "💥 An egg was smashed!". Smashed square blocks stepping (tip, `nope` text). | OK |
| M11 | Egg goes cold | Ostrich | Banner "An egg went cold."; ring had counted down to 0; one-time loud warning at 8 rounds ("Egg cooling — N rounds left!"). The egg just vanishes: no marker where it was. Same sentence repeats as the first line of the NEXT ostrich turn (`ev` uses stale `S.lastCold`). | WEAK |
| M11 | | Vulture | Banner "An egg went cold." and eggs-left drops. Banner is skipped if an egg also went cold the round before (`lastCold` compared as a count, not a round). | OK (rare miss) |
| M12 | Ostrich eats a leaf | Subject | Banner "Ate the leaf. Hunger restored."; cell pulse `ate`; HUD back to 13. | OK |
| M12 | | Vulture/others | HUD food number jumps back up. No words (banner is for `blue` only). | WEAK |
| M13 | Hunger ticks down, hungry warnings | Subject | HUD number turns `low` at 3; hard-stop guide "You're hungry! Go eat (N left)"; banner "Leaf in N steps · N left" when the route is tight; "Hungry! N left, no open path to a leaf". | OK |
| M13 | Starved (2P) | Both | Game over "The ostrich starved in round N." | OK |
| M14 | Last rounds | Both | Banner "⏳ Final 3 rounds!" / "⏳ Last round!"; win text above. | OK |
| M15 | Tap a square that is not legal | Subject | Hint nudge. Specific texts: no stone ("No stone. Land on a rock pile to pick one up."), too far ("Too far. Fly up to 2 squares: tap a glowing square."), smashed ("…smashed squares are blocked"), carry onto egg/food/rock/stone ("Carry 1 square: tap a glowing square (not onto an egg, food, rocks, a stone mark, or a smashed square)."), carry onto food ("Can't carry egg and food"), out of turn ("Wait, it's the Vulture's turn."). | OK |
| M15 | Tap a square held by your own teammate (2v2/2v2+H) | Subject | Square is not glowing (`flyTargets` and `ostrichMoves` drop the mate's square). Tapping gives "Too far. Fly up to 2 squares…" or "Step 1 square: tap a glowing square next to you (smashed squares are blocked)." Both are wrong reasons. | WEAK |
| M16 | Found-egg marker / green "maybe" squares disappear when the vulture throws, passes or loses a turn (`g.sniff=null`) | Vulture | The green "?" squares vanish with no text. | WEAK |

### 1c. Hunter modes: what hunters and birds see of each other

| ID | Event | Viewer | What the screen shows today | Rating |
|---|---|---|---|---|
| H1 | A hunter comes within 2 squares of a bird (3P `hunterSeenBy`, 4H `HU.seen`, team `hunterSeenBy`) | Bird (Sees) | Hunter piece appears; pop "HYENA NEAR" or "BADGER NEAR" for 1.8 s (`three-ui.js warnNear`, `ring.js hunterNearLabel`). Tooltip on the piece: "Hyena! It catches a bird by landing on it (or if you step onto it)". | OK |
| H1 | | Bird farther than 2 | Nothing (correct). | OK (hidden) |
| H2 | A hunter leaves view (it moved out of range) | Bird | The piece disappears. No line. | WEAK |
| H3 | Hunter sense (yes/no within 2) | Hunter | Rose dots on possible squares (`maybird`), pop "Bird may be here." / "Still close." / "Nothing near", sound. | OK |
| H3 | | Birds | Nothing (correct: sense is the hunter's secret). | OK (hidden) |
| H4 | Hyena pounce (extra 1-square step after a yes sense) | Hunter | Banner "POUNCE: land on the bird to catch it."; hint "POUNCE: a bird is within 2. Land on it to catch it — this extra move is still your turn."; tag "CAN CATCH"; button "Stop". | OK |
| H4 | | Bird that sees the hyena | Hyena piece hops one square, then (next state) hops again in the same turn. Hint stays "Hyena's turn…". Nobody says why it moved twice. | WEAK |
| H4 | | Other hunter (4H) that sees it | Same two hops, no text. | WEAK |
| H5 | Badger burrows (stay still; 3P 15 percent / 4H 30 percent / team 40 percent of digs need a second still turn) | Badger | Mound icon, tag "BURROWED"; first dig on tough ground: tag "TOUGH GROUND" and tip "Tough ground: stay still once more to burrow"; button "Burrow"/"Finish"/"Stay". | OK |
| H5 | | Bird/rival that saw it | The badger piece vanishes (`seen` returns false for a burrowed badger). No line, so a bird cannot tell "dug in here" from "walked off". | WEAK |
| H6 | Burrowed badger moves and pops up | Badger | Mound turns into the animal. | OK |
| H6 | | Bird within 2 | Badger appears; "BADGER NEAR" pop. If it lands on a bird: catch line (H8). | OK |
| H7 | Hunter moves 1 square (no catch) | Birds who see it | Piece moves. | OK |
| H8 | **Hurt (non-lethal catch)**, hunter lands on a bird | Subject | Pop "The hyena caught you! Hurt: one more catch and you're out." (`catchtext.js catchLine`, red pop 3.4 s but see F1), claw on the square, pink pulse on the landing square (`h3kb`), permanent "HURT" tag + pink outline on the piece (`markHurt`), pip on the chip. No line says the bird was pushed. | WEAK |
| H8 | | Cause (hunter) | Pop "Caught the ostrich! One more catch knocks it out.", claw, a ghost bird shown on the catch square (`foundnow`), sound. The hunter is not told where the bird went (`to` withheld). | OK |
| H8 | | Other bird (3P/2v2) | Pop "The hyena caught the ostrich."; pulse on where it landed (`to` is sent to birds); pip changes. | OK |
| H8 | | Other bird / other hunter (4H) | Same sentence; no `at`/`to`, so no square marked (hidden info, correct). | OK |
| H8 | | Bird far from the action (4H) | Sentence "The hyena caught the ostrich." tells them it happened; that is allowed (public pips). | OK |
| H9 | Knock-back: caught bird slides 2 squares (stops early at the edge, a piece, the hunter, or a smashed square for the ostrich; can be 0 squares) | Subject | Piece jumps; pulse on the landing square for 1.4 s. Words never say "pushed back", how far, or that it was blocked. | WEAK |
| H9 | | Others | Bird piece jumps; only the sentence in H8. | WEAK |
| H10 | Caught bird loses its next turn (`skip`). Consumed at once for the vulture; right after the vulture's move for the ostrich. The ostrich "stays": no warmth, hunger still drops, round still counts | Subject | Hint "Caught! You lost this turn. <X>'s turn…" while `lost.round>=S.round-1` (`three-ui.js hint/tHint`). Chip tooltip "HURT · loses its next turn" until consumed. Hunger and cooling effects are not mentioned. | OK for the turn, WEAK for hunger/egg effects |
| H10 | | Others | Turn order jumps past the bird; no "skipped" line. Only the chip tooltip (tap) says "loses its next turn". | WEAK |
| H10 | | Cause (hunter) | Not told the bird will skip its turn. | WEAK |
| H11 | Carried egg dropped where the ostrich was caught | Subject | Carry icon disappears, egg ring appears on the old square. No text (`catchLine` has nothing about eggs). | MISSING |
| H11 | | Hunter | Hunter is standing on that square. Nothing. | OK (hidden) |
| H12 | Bird walks onto a hunter (`lastCatch.walked`) | Subject | "You walked into the hidden hyena! The hyena caught you! Hurt…" The word "hidden" is printed even when the hunter was in plain view, which is possible because stepping onto a visible hunter is a legal move. | OK (WEAK wording when visible) |
| H12 | | Hunter | Normal catch pop. It did not move, so the catch is a surprise on its own turn view. | OK |
| H13 | **Knock-out (second hyena catch, or first badger catch)** | Subject | Pop "The hyena knocked you out."; claw; piece leaves the board; god view with hint "You're out (knocked out). Watching the board — no moves."; chip shows "OUT". | OK |
| H13 | | Hunter | Pop "Ostrich knocked out!" and sound. | OK |
| H13 | | Others | Pop "The hyena knocked out the ostrich." plus 4 s banner "The ostrich is out." (2v2: "Ostrich 1 is out."). | OK |
| H14 | Starved out (3P/4H/2v2: ostrich out, game goes on) | Subject | Hint "You're out (starved). Watching the board — no moves." | OK |
| H14 | | Others | Banner "The ostrich is out." for 4 s. The cause "starved" is not in the banner (`CatchText.outLine` has no cause; no `lastCatch` exists). Only the chip tooltip, on tap, says "OUT (starved)". In the 4H and 2v2 modes a hunter's KO tally does not change either. | WEAK |
| H15 | **Speed boost starts (3P, 2v2+H only): after the first bird is out, the hunter moves 2 squares a turn** (`T3.boost`, `TM.boost`; none in 4H) | Hunter | Hint adds "(boost!)" ("Tap a glowing square to move 2 (boost!)"); chip shows "⚡2". | WEAK (appears in the hint, not announced) |
| H15 | | Birds | The chip number changes from "1" to "⚡2" (tooltip says "boost after the first knock-out" only on tap). The hunter then covers 2 squares (3 with a hyena pounce) in a turn. No announcement at the moment of the knock-out. | MISSING |
| H16 | **Rival shove: badger moves onto the hyena in Hunters mode** (`hunt.js hunterMove`, `rival`). Hyena slides 2 squares away in the badger's direction, nobody hurt | Cause (badger) | Pop "Badger shoved the hyena back 2!" (`hPieces`, `rv.by==='badger'`). Pink pulse on the hyena's landing square (`rv.to` goes to hunters only). Tooltip on the hyena (tap/hover only): "Your rival, the Hyena. If it moves onto you, you are knocked back 2. If you move onto it, you bounce back 2." Not on the role card. Does not say "nobody is hurt". | WEAK |
| H16 | | Subject (hyena) | Same pop; piece jumps 2 squares; sound none. | WEAK |
| H16 | | Birds that see either hunter | The same pop, but no square marked (`rv.to` null). | WEAK |
| H16 | | Birds that cannot see either hunter | They also get the pop (`rival` is in everyone's `h3`, drawn for everyone). They learn that the hunters are together somewhere, which no bird is otherwise told. | WEAK (leak) |
| H17 | **Rival bounce: hyena moves onto the badger** | Cause (hyena) | Pop "Hyena bounced off the badger!"; pulse where the hyena landed. The hyena ends 2 squares back, so it never reaches the badger's square. Its pounce for the turn is cancelled (`endHunter`), unannounced. | WEAK |
| H17 | | Subject (badger) | Same pop. A burrowed badger is forced out of its burrow (`y.burrowed=false`); the mound turns into the animal with no line. | WEAK |
| H17 | | Birds | As in H16. | WEAK |
| H18 | Rival event is the first one this page sees | Hunters and birds | **Silent.** `hPieces` (`three-ui.js` line 117) sets `fresh = hPieces.rv !== undefined`; `hPieces.rv` is undefined until the first rival event, so the first one is treated as "already seen" and no pop, no pulse is drawn. | MISSING (bug) |
| H19 | Rival bump near an edge or piece (push stops early; can end 1 square away, or on the badger's own square) | Hunters | Pop still says "back 2". | WEAK |
| H20 | KO scoreboard and tie-break (4H) | All | Chips show each hunter's KO number (`hChips`); tooltip "Knock-outs: N". End text names the tie rule. Nothing says which hunter earned the KO at the time except the catch line ("The badger knocked out the ostrich."). | OK |
| H21 | Hunters win/end variants | All | See S9. | OK |

### 1d. Clock, auto-moves, teams

| ID | Event | Viewer | What the screen shows today | Rating |
|---|---|---|---|---|
| T1 | **Shot clock runs out on the ostrich** (3P `clock3`, 4H `clockH`, team `clockT`: 10 s; `timeout()` -> `ostrichStay`: no sit, no warmth, hunger still drops, round advances) | Subject | The bar and "10s" countdown reach 0 (`three-ui.js clock`); then the state shows the ostrich unmoved and "<X>'s turn…". No sentence. `lastAction.timeout` is set by the server and never read. | WEAK (cause only if they watched the bar) |
| T1 | | Others | Ostrich piece did not move; turn passes. Nothing says it timed out. | MISSING |
| T2 | Shot clock runs out on the vulture (`lastAction={type:'pass',timeout:true}`, `g.sniff=null`) | Subject | Same as T1. The green "?" squares also disappear. | WEAK |
| T2 | | Others | Vulture did not move; no line. | MISSING |
| T3 | Shot clock runs out on a hunter (`hunterStay`) | Hyena | Piece stays; if it was pouncing, the extra move is skipped (`'skip'`). No line. | WEAK |
| T3 | | Badger | Time-out becomes a BURROW (`hunterStay` digs for a badger), so the badger may vanish without the player having chosen it. No line. | MISSING |
| T3 | | Birds | A hunter that did not move; a badger that vanishes. | MISSING |
| T4 | Host turns the timer display off (`showTimers:false`, body class `timers-off`) | All | Bar is hidden but the clock still expires turns (`server.js timersOn` comment). Auto-moves become fully invisible. | MISSING |
| T4 | Host stops the clock (`room.clock===false`) | All | No clock, no auto-moves. | OK |
| T5 | Out player watches (god view) | Out bird | Board shows every animal, eggs with warm rings; hint "You're out (…). Watching the board — no moves." | OK |
| T6 | Teammate's sniff (2v2): other vulture sees it | Vulture | Square gets "👃!" or "👃", tooltip "Your teammate sniffed here: an egg is on or next to this square". | OK |
| T7 | Either ostrich warms any egg (2v2) | Both ostriches | A ring refills on the partner's egg; no line. | WEAK |
| T8 | Both vultures caught in the same round (2v2) | Subject | `g.lost` holds one record, so only the last-caught seat gets "Caught! You lost this turn." | WEAK (rare) |
| T9 | Birds' `lastAction.type` ('sit'/'carry') in the vulture's view (`ai.js redView`, `viewT` `la`) | Vulture | Data only; the UI never draws it. | OK (note for a future UI) |

---

## 2. Gaps ranked (how often it happens in a normal game, times how confusing)

Ranking basis: frequency per game in the mode (F) times how likely the player is to think the game is broken or unfair (C), both 1 to 5. Product in brackets.

**G1. Rival shove and bounce, Hunters mode [F3 x C5 = 15, goes first as asked].** Rows H16 to H19. Brian's own example. Four separate problems stack up:
 (a) Bug: the first rival event of every page load shows nothing at all (`hPieces.rv` starts undefined, so `fresh` is false; the same check should mirror the catch code, `lastCatch!==0||(prev&&prev.h3)`). It also ignores a rematch on the same page, because the counter is not reset.
 (b) The sentence is a pop-up inside the board and is erased by the next state (F1), usually under 2 seconds with a computer next in turn.
 (c) The words say what moved, not that nobody is hurt or why ("Badger shoved the hyena back 2!"). The rule is only in a tooltip on the rival piece and is missing from the Hunter role cards (`roles.js hunter`).
 (d) Every bird gets the sentence, even birds who cannot see either hunter, which tells them the hunters are standing together.
 Fix: "Show it to the two hunters and to birds who can see one of them. Keep it up until the next turn starts. Say: 'The badger ran into the hyena. Nobody is hurt. The hyena slid back 2 squares.' Add one line about it on both hunter cards. Fix the first-time bug."

**G2. Shot-clock time-outs are silent in every timed mode [F4 x C4 = 16].** Rows T1 to T4. Phones go quiet or players look away; the ostrich stays still, loses its warming, or a badger digs in on its own. Fix: "Put one line on everyone's screen: 'Time ran out, so the ostrich stayed where it was.' / 'The vulture ran out of time and passed.' / 'The badger ran out of time and dug in.' Say it to the player themselves in the hint too."

**G3. Speed boost after the first knock-out is never announced [F4 x C4 = 16] (3P and 2v2+H).** Row H15. Birds watch the hunter suddenly cover 2 squares (3 with a pounce). Fix: "When the first bird goes out, tell everyone: 'A bird is out, so the hyena now moves 2 squares each turn.' Leave the ⚡2 chip."

**G4. Catch: bird is pushed, turn is lost, egg is dropped, and the sentence vanishes [F4 x C3 = 12].** Rows H8 to H11. Fix: "Keep the catch sentence on screen until the bird's next turn and add the three things that happened: 'The hyena caught you and pushed you back 2 squares. You skip your next turn. Your egg was left on the square where you were caught.' Tell the hunter 'It skips its next turn.'"

**G5. Hyena pounce looks like two moves for no reason [F3 x C3 = 9].** Row H4. Fix: "When the hyena takes its second step, show to birds who can see it: 'The hyena smells a bird close by, so it gets one more step.'"

**G6. Burrow: the badger vanishes in front of a bird [F3 x C3 = 9].** Row H5. Fix: "To birds who just saw it disappear: 'The badger is out of sight. It may have dug in, or it may have walked away.' (This does not give away which.)" Also tell a badger whose burrow was broken by a hyena: "The hyena bumped you out of your burrow."

**G7. Carried egg is put down by itself, and the vulture's found-egg marker disappears [F4 x C2 = 8].** Rows M3, M4. Fix: "When the vulture's turn ends: 'Your egg was set down here.' When a found egg is carried away: show to the vulture 'The ostrich moved the egg you found.'"

**G8. Out banner does not say why [F2 x C3 = 6].** Row H14. Fix: "Make the line say 'The ostrich starved.' when that is the reason, as the catch line already does for knock-outs."

**G9. A player who left is not shown in 3-, 4- and 5-player games [F2 x C4 = 8].** Row S6. Fix: "Use the seat list the server already sends: show 'The hyena player is offline. Their turns will pass.'"

**G10. Teammate square refused with the wrong reason [F3 x C2 = 6] (2v2).** Row M15. Fix: "If the tapped square holds your teammate, say 'Your teammate is on that square.'"

**G11. Stone pickup and food refill have no words for the other player and vanish for the actor [F4 x C2 = 8].** Rows M7, M12. Fix: "Show 'The vulture picked up a stone.' and 'The ostrich ate a leaf.' to both players for one turn."

**G12. Cold egg: no marker and a stale repeat [F3 x C2 = 6].** Row M11. Fix: "When an egg goes cold, flash 'This egg went cold' on its square for a moment, and show the sentence once."

**G13. Other small ones.** "Walked into the hidden hyena" printed when the hunter was in plain view (H12): say "walked into the hyena" and add "hidden" only if it was. A hunter leaving view (H2): optional. Hunters-mode role card lacks the rival rule (G1 fix covers it). Two-vultures-caught record (T8) is rare.

---

## 3. Hidden-information notes (what is correct silence, what leaks)

* Correct silence: sense result (hunter only), burrowed badger's position, bird position to hunters after a knock-back (`to` withheld), `at` hidden from birds that were not caught (3P/team) and from everyone but the two parties (4H), egg positions to the vulture, a vulture's sniff to ostriches in 2v2.
* Leak, shown on screen: the rival pop-up (G1d). Birds who cannot see either hunter learn the hunters are together.
* Leak, data only (never drawn): `redView`/`viewT` send the vulture the ostrich's last action type ('sit', 'carry', 'step'), which reveals whether the ostrich is on an egg. The client does not display it today; a future UI line built from `lastAction` must not repeat it.
* `h3.lost` and the pip counts are public by design.

## 4. Counts

Events checked (distinct event IDs above): S1 to S9 (9), M1 to M16 (16, with M15 split into two kinds of refusal), H1 to H21 (21), T1 to T9 (9) = 55 events, 103 viewer-level rows. Rows ending in a single rating: 49 OK, 29 WEAK, 8 MISSING, 6 OK (hidden); the other 11 rows carry a mixed rating (for example OK for one part and WEAK for another).

Files read: `game.js`, `three.js`, `hunt.js`, `team.js`, `server.js`, `ai.js` (redView), `huntai.js`, `public/ui.js`, `public/three-ui.js`, `public/catchtext.js`, `public/ring.js`, `public/fx.js`, `public/smash.js`, `public/roles.js`, `public/three.css`, `docs/PLAN-2026-11-06.md` (T6 and D36 already name "finish show the cause before the result" but list only stone pickup, carry, burrow and cold egg; none of the rows above G4 to G6 are in it).
