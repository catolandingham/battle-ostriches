# Battle Ostriches rule simulations, 2026-11-07

Bot-versus-bot win rates from the game's own simulators (`sim.js`, `sim3.js`, `simhunt.js`, `simteam.js`), run on Brian's MacBook on 2026-11-07 by a Claude Code subagent. 2000 games per cell, 1000 for 5-player games, so about ±2 points (±3 for 5-player). Bots are weak at the hyena's guessing game and at avoiding a hidden badger, so treat these as rough. Code for every variant is on branch `rules-consistent` or in the session scratchpad; nothing here is live.

Key: o = ostrich, v = vulture, h = hyena, b = honey badger. Bold = under 20% or over 55%.

## What each idea did

- **Ostrich walks 2 (carries 1):** the ostrich wins about 70% of classic, 3-player hyena, 2 vs 2 and 5-player hyena games. Walking 1 restores classic to about 50/50.
- **One-move Pounce (up to 2 when a bird is near):** the hyena falls to 1 to 10%. The old two-step Pounce is better for it (9 to 19% with the other new rules).
- **Kick:** costs the hyena about 4 points in 3-player games and 6 to 15 in 5-player games. The badger cannot be kicked while burrowed.
- **Removing the hidden speed-up after a knock-out:** costs the hyena about 6 points in 3-player and 11 in 5-player games.
- **Badger 2 catches:** badger falls from 23% to 7% (3-player). Adding ambush sight sends it to 41% (3-player), 44% (Hunters), 53% (5-player), above the hyena.
- **Direction hint for hunters:** always on, the hunter wins 97 to 99%; only when no bird is near, the ostrich falls to 2 to 16%. Too strong at this level. A weaker or occasional hint is untested.
- **Carry every other turn, nobody stops on a smashed square:** no measurable change (a few points either way).
- **The hyena's real limit is information:** a test hyena that knows the true bird squares wins 77% (3-player); with the rose dots it does about twice as well as random guessing.

## Today's live rules (main) against the "balanced" set

Balanced (BAL) = walk 1, carry 1, Kick on, old two-step Pounce, speed-up kept, badger 2 catches + sure burrow + ambush sight.

| Mode | main o/v/hunters | BAL o/v/hunters |
|---|---|---|
| Classic | 52 / 48 | 52 / 48 |
| 3-player hyena | 34 / 38 / 21 | 37 / 38 / **16** |
| 3-player badger | 30 / 38 / 25 | 31 / 29 / 31 |
| Hunters (h / b) | 22 / 28 / 22 / 28 | 22 / **19** / **19** / 40 |
| 2 vs 2 | 39 / **61** | 42 / **58** |
| 5-player hyena | 23 / 41 / 36 | 33 / 39 / 26 |
| 5-player badger | **19** / 40 / 42 | **19** / 32 / 48 |

## Direction hint (on today's rules)

| Mode | plain | hint always | hint only when no bird is near |
|---|---|---|---|
| 3-player hyena | 34 / 38 / 21 | **0** / **1** / **99** | **12** / 29 / 52 |
| 3-player badger | 30 / 38 / 25 | **7** / 21 / **68** | **15** / 28 / 49 |
| Hunters | 22 / 28 / 22 / 28 | **0** / **4** / **67** / 29 | **5** / **15** / 40 / 41 |
| 5-player hyena | 23 / 41 / 36 | **0** / 23 / **77** | **13** / 34 / 52 |
| 5-player badger | **19** / 40 / 42 | **4** / 25 / **71** | **15** / 31 / 54 |

## Reading

Today's live rules are the fairest tested: every animal wins 19 to 43% in the hunter games, except the 2 vs 2 vultures (56 to 61% under every version) and the 5-player badger game's ostrich (18 to 19%). Next evidence should come from the recorded family game.

## Rule set R (Brian's choices, 2026-11-07 afternoon)

R = today's rules plus: every thrown stone wrecks its square (leaves and rock piles safe), nobody stands on a wrecked square, a stone thrown at the ostrich is kicked back onto the vulture's square, a carried egg is not warmed and cools twice as fast, whoever moves onto the other hunter pushes it back 2 (a hyena can stand on a hidden badger), no hidden speed-up, both hunters 2 catches with sure burrow and ambush sight, the old two-step Pounce (the bot combines both readings). No Kick, no direction hint.

| Mode | today o/v/hunters | R o/v/hunters |
|---|---|---|
| Classic | 52 / 48 | 45 / **55** |
| 3-player hyena | 34 / 38 / 21 | 33 / 45 / **13** |
| 3-player badger | 30 / 38 / 25 | 31 / 27 / 36 |
| Hunters (h / b) | 22 / 28 / 22 / 28 | **15** / **18** / 22 / 44 |
| 2 vs 2 | 39 / **61** | **30** / **70** |
| 5-player hyena | 23 / 41 / 36 | 26 / 49 / 26 |
| 5-player badger | **19** / 40 / 42 | **16** / 38 / 45 |

- Grenades: 1.4 to 5.2 wrecked squares per game; the ostrich is boxed in (0 or 1 walk squares) on under 1.5% of turns; boxing decides at most about 8% of the vulture's wins.
- The vulture's gain comes from the double-speed cooling: without it, classic is 51/49 and 2 vs 2 is 42/58.
- The kicked-back stone changes nothing measurable (the bot vulture stops throwing at the ostrich).
- The hyena stays viable without the speed-up: 13% (3-player), 22% (Hunters), 26% (5-player).

## Rule set R2 and the badger "dug in" announcement (2026-11-07, later afternoon)

R2 = R with a carried egg not warmed but cooling at normal speed. R2a = R2 plus "The honey badger dug in!" to everyone, with the square shown to birds within 2 (bird bots avoid it). R2b = R2a plus ambush sight only on the first turn after digging in.

| Mode | today | R2 | R2a | R2b |
|---|---|---|---|---|
| Classic o/v | 52/48 | 46/54 | 45/55 | 46/54 |
| 3-player hyena o/v/h | 34/38/21 | 35/42/**14** | 36/43/**13** | 32/45/**14** |
| 3-player badger o/v/b | 30/38/25 | 32/26/36 | 30/**56**/**5** | 30/**59**/**4** |
| Hunters o/v/h/b | 22/28/22/28 | **17**/**19**/24/40 | 20/36/27/**15** | 20/39/27/**11** |
| 2 vs 2 o/v | 39/**61** | 33/**67** | 33/**67** | 33/**67** |
| 5-player hyena o/v/h | 23/41/36 | 26/48/25 | 27/46/26 | 28/46/26 |
| 5-player badger o/v/b | **19**/40/42 | **16**/35/48 | 28/**67**/**6** | 30/**66**/**4** |

- The cooling speed barely matters (at most 1 point); not warming a carried egg at all is what helps the vulture. With carrying warming the egg as today: classic 51/49, 2 vs 2 42/58.
- The announcement's effect depends on how often birds react. With bird bots reacting about 35% of the time, R2a puts the badger near a fair share: about 26% (3-player), 33% (Hunters), 34% (5-player). Bots that always react sink it to 4 to 15%.

## One round number for food and warmth (2026-11-07, evening)

Base: R2a (carried egg not warmed; badger "dug in" announcement, bird bots reacting about 35%; everything else as R). N = food every N turns and each egg warmed at least every N rounds. The ostrich bot now hides its nest near a leaf (against a passive vulture it then survives 99 to 100%, so losses come from the rules, not bad routing).

| Mode | N=10 walk 1 | N=10 walk 2 | N=15 walk 1 | N=15 walk 2 |
|---|---|---|---|---|
| Classic o/v | **9**/**91** | 34/**66** | 38/**62** | **63**/37 |
| 3-player hyena o/v/h | **10**/**74**/**12** | 31/**57**/**7** | 28/51/**14** | 53/37/**6** |
| 3-player badger o/v/b | **8**/**65**/24 | 24/49/24 | 24/42/29 | 45/28/23 |
| Hunters o/v/h/b | **4**/**51**/**18**/27 | 20/38/**15**/27 | **10**/33/23/34 | 30/25/**15**/29 |
| 2 vs 2 o/v | **6**/**94** | **9**/**91** | **19**/**81** | 53/47 |
| 5-player hyena o/v/h | **5**/**78**/**17** | 25/**56**/**19** | **15**/**59**/25 | 54/32/**15** |
| 5-player badger o/v/b | **3**/**74**/23 | **12**/51/37 | **9**/**56**/35 | 35/26/40 |

- Fairest: N=15 with the ostrich walking 2. It is the only variant that brings the 2 vs 2 vultures below 81% (to 47%). Left over: the hyena is too weak (6% 3-player, 15% Hunters and 5-player) and the classic ostrich a little strong (63%).
- Even at N=15 the ostrich eats about twice a game (games last about 28 rounds).
- The 2 vs 2 problem is about mobility, not food or warmth: with walk 1 the vultures win 81 to 94% at any N.
- Next idea to test: the hyena also walks 2, keeping the two-step Pounce.

## Everyone moves 2 (2026-11-07, evening) — the fairest set tested

E1 = ostrich walks 2 (carries 1), vulture flies 2, hyena walks 2 with the two-step Pounce, badger walks 2 with dig-in, ambush sight and the "dug in" announcement; a 2-square walk needs a free middle square; food and warmth every 15; carried egg not warmed; grenades, kicked-back stone, consistent pushes, 2 catches, no speed-up, no Kick.

| Mode | today | E1 (N=15) | no Pounce step | no ambush sight | E1 N=12 | E1 N=10 |
|---|---|---|---|---|---|---|
| Classic o/v | 52/48 | **63**/37 | **63**/38 | **64**/36 | 48/52 | 31/**69** |
| 3-player hyena o/v/h | 34/38/21 | 37/29/30 | 48/45/**2** | 37/27/32 | 28/37/31 | 24/43/28 |
| 3-player badger o/v/b | 30/38/25 | 45/28/22 | 45/29/22 | 48/46/**2** | 36/37/23 | 28/42/27 |
| Hunters o/v/h/b | 22/28/22/28 | **18**/**17**/34/32 | 28/29/**14**/29 | 27/23/37/**13** | **12**/20/35/33 | **9**/26/33/32 |
| 2 vs 2 o/v | 39/**61** | 54/46 | 53/47 | 51/49 | 33/**67** | **10**/**90** |
| 5-player hyena o/v/h | 23/41/36 | 35/**18**/47 | **60**/33/**6** | 34/20/46 | 27/26/47 | **18**/38/44 |
| 5-player badger o/v/b | 19/40/42 | 32/26/43 | 30/25/45 | 53/42/**5** | **21**/35/45 | **13**/42/45 |

- The badger moves on 66 to 76% of its turns and digs in on the rest: it plays like a hunter.
- Both the hyena's two-step Pounce and the badger's ambush sight are essential at walk 2.
- Tighter food and warmth (12 or 10) break 2 vs 2 and Hunters.

## Everyone moves 2 plus the Kick (2026-11-07, night)

Base E1 with universal rules: a pushed animal never eats where it lands; only the landing square counts on 2-square moves; a badger bursting out pushes the hyena back the way it came; a vulture wrecking its own square hops to the nearest open square, farthest from the ostrich.

| Mode | E1 no Kick N=15 | Kick N=15 | Kick N=13 | Kick N=12 |
|---|---|---|---|---|
| Classic o/v | **61**/39 | **61**/39 | 50/50 | 46/54 |
| 3-player hyena o/v/h | 36/28/32 | 38/30/23 | 31/36/22 | 28/39/23 |
| 3-player badger o/v/b | 44/31/21 | 44/32/**19** | 37/36/20 | 34/36/23 |
| Hunters o/v/h/b | **17**/**16**/34/32 | **8**/**18**/34/39 | **7**/24/31/38 | **7**/26/32/35 |
| 2 vs 2 o/v | 52/48 | 53/47 | 40/**60** | 31/**69** |
| 5-player hyena o/v/h | 36/21/43 | 39/27/34 | 32/27/40 | 31/32/37 |
| 5-player badger o/v/b | 30/24/46 | 33/26/42 | 28/30/42 | 25/33/42 |

- Dropping "a caught bird misses its next turn" changes the hunters' win rates by 0 to 4 points (within noise).
- The Kick barely matters in classic and 2 vs 2, helps a little in 3-player and 5-player hyena games, and sinks the Hunters ostrich from 17% to 7 to 9%: the hyena reaches 3 squares (walk 2 plus Pounce), so a 2-square kick does not protect the ostrich from it.
- Ostriches kick about 4 to 5 times a game in hunter games, almost never in classic and 2 vs 2.
- Food and warmth at 13 makes classic 50/50 but 2 vs 2 60/40 for the vultures; 14 untested.
- Proposed next test: a kick that pushes 3, food and warmth at 14 and 15, no sit limit with sitting visible and a turtling ostrich bot.

## 3-square Kick, no sit limit, turtling (2026-11-07, night)

Base: everyone moves 2 + Kick + no missed turn + universal rules; Kick pushes 3 (others 2); anyone may pass over a wrecked square; no sit limit, sitting visible. S = normal ostrich bot, T = turtle bot (sit on one egg near a leaf, kick anything adjacent, leave only to eat).

| Mode | S N=14 | S N=15 | T N=14 | T N=15 |
|---|---|---|---|---|
| Classic o/v | 43/**57** | 55/45 | **72**/28 | **62**/38 |
| 3-player hyena o/v/h | 33/35/28 | 35/35/27 | **7**/**57**/35 | **6**/**57**/37 |
| 3-player badger o/v/b | 44/38/**14** | 46/36/**13** | 46/34/**19** | 47/32/**18** |
| Hunters o/v/h/b | **14**/21/34/31 | **15**/**17**/36/33 | **4**/32/36/28 | **5**/30/38/27 |
| 2 vs 2 o/v | 36/**64** | 52/48 | 49/51 | 51/49 |
| 5-player hyena o/v/h | 32/34/35 | 37/30/34 | **5**/41/53 | **7**/42/51 |
| 5-player badger o/v/b | 34/34/32 | 37/33/30 | 22/34/44 | 22/33/45 |

- Fairest: normal play at N=15. Left over: the 3-player badger (13%, the 3-square kick puts it out of reach), the Hunters ostrich (15%) and vulture (17%).
- Turtling beats a lone vulture (classic 62 to 72%) but is crushed by a hyena (5 to 7%); not too strong overall.
- Next to test: the honey badger is pushed only 1 by a kick; hunters cannot see each other; a side wins when its goal is met even if knocked out.

## Badger kick 2, goals count when out, leaf and rock camping, ties (2026-11-07, night)

Base: normal play at N=15 (everyone moves 2, Kick, no missed turn, universal rules, pass over wrecked squares, no sit limit, hunters see each other within 2), plus: Kick pushes hyena and vulture 3, honey badger 2; a side wins when its goal is met even if knocked out; stones on an empty leaf or rock pile are used up harmlessly; in Hunters a 1-1 knock-out split is a tie. L-NO = badger cannot dig in on a leaf or rock pile; L-YES = it can.

| Mode | L-NO | L-YES |
|---|---|---|
| Classic o/v | 53/47 | 54/47 |
| 3-player hyena o/v/h | 39/36/25 | 38/36/26 |
| 3-player badger o/v/b | 46/42/**12** | 40/38/22 |
| Hunters o/v/h/b / ties | **14**/25/**15**/**13** / 33 | **16**/20/**17**/**14** / 33 |
| 2 vs 2 o/v | 51/49 | 50/50 |
| 5-player hyena o/v/h | 35/30/34 | 37/29/35 |
| 5-player badger o/v/b | 41/27/32 | 32/33/35 |

- Camping (L-YES) is moderate and mostly fair: the badger camps on 12 to 18% of its turns, and 11 to 18% of its catches happen on a leaf or rock pile.
- The 2-square badger kick alone does not fix the 3-player badger (12%); camping lifts it to 22%. It needs 4 catches to win, which is structurally hard.
- A 1-1 tie ends about a third of Hunters games. Proposed tie-break: more catches overall, an exact match is a tie.
- Proposed next: "your square works first" (eat, refill or find before a catch) and "a caught bird always gets a chance to run" (cannot be caught again before its next turn).

## Hide the knockback square, wrap-around kick, catch tie-break (2026-11-07, late)

Base L-YES plus the wrap-around kick and the Hunters tie-break (knock-outs, then catches, then tie). V = "the hunter needs a moment" after a catch; W = hunters never learn where a caught bird lands (the rule kept).

| Mode | V | W (kept) |
|---|---|---|
| Classic o/v | 54/46 | **57**/43 |
| 3-player hyena o/v/h | 41/40/**18** | 42/36/22 |
| 3-player badger o/v/b | 46/36/**18** | 48/34/**18** |
| Hunters o/v/h/b / ties | **16**/21/20/24 / 18 | **14**/21/23/24 / 17 |
| 2 vs 2 o/v | 52/48 | 49/51 |
| 5-player hyena o/v/h | 44/33/23 | 40/28/32 |
| 5-player badger o/v/b | 38/34/28 | 36/28/36 |

- "Your square works first" already holds in the engine.
- The catch tie-break halves Hunters ties (33% to about 17%).
- The wrap-around kick fires about once a game in hunter modes and costs the hunters 3 to 4 points in 3-player games.
- The 3-player badger (18%) is the remaining weak spot.

## Rulebook v2 (2026-11-07, late night)

| Mode | Ostrich side | Vulture side | Hunter(s) | Draws / ties |
|---|---|---|---|---|
| Classic | 52 | 48 | — | 0% |
| 3-player hyena | 44 | 45 | **7** | 4% |
| 3-player badger | 41 | 40 | **15** | 5% |
| Hunters (o/v/hyena/badger) | **21** / 26 / **14** / 22 | | | 16% |
| 2 vs 2 | 51 | 49 | — | 0% |
| 5-player hyena | 55 | 44 | **0** | 1% |
| 5-player badger | 48 | 48 | **1** | 3% |

The hunter's goal (knock out every bird) is nearly unreachable once a caught bird scrambles to a random square. Proposed: the first side to reach its goal wins, the hunter's goal being one bird knocked out (one ostrich and one vulture in 5-player games); to be simulated.

## The hunter's goal (2026-11-07, late night)

First side to reach its goal wins. ALL = every bird knocked out; FIRST = one bird (3-player) or one ostrich and one vulture (5-player); CATCHES-N = N catches in total.

| Cell | ALL | FIRST | CATCHES-3 | CATCHES-4 |
|---|---|---|---|---|
| 3-player hyena o/v/h | 43/43/**12** | **10**/35/54 | 27/39/34 | 40/47/**11** |
| 3-player badger o/v/b | 43/39/**14** | **11**/30/**59** | 27/34/38 | 41/41/**15** |
| 5-player hyena o/v/h | 53/46/**1** | 46/41/**13** | | |
| 5-player badger o/v/b | 50/46/**1** | 39/38/23 | | |

Chosen: 3-player games, the hunter wins on its 3rd catch; 5-player games, FIRST.
