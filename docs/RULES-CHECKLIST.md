# Rules checklist

Standing rules for Battle Ostriches as of `main` on 2026-11-13. A later dated line in `docs/project/DECISIONS-2026-11-08.md` or `docs/project/DECISIONS-2026-11-11.md` wins over the rulebook when they disagree. There is no `AGENTS.md` and no `CLAUDE.md`.

"Automated" means a named check already in the repo, or a check added in `robots/`. "Judgment only" means a person still has to look.

## Counts

| | |
|---|---|
| Standing rules | 48 |
| Automated (a named check exists) | 27 |
| Judgment only | 21 |

## Decided 2026-11-13

Brian answered the cleanup list. The code and the rulebook now follow these.

1. A 3-player hunter wins at 3 catches. The live setting is `catches:3`.
2. Big moments use the 2026-11-11 timing: Look out! for 1 second, then the cartoon, then 0.6 seconds per square, then "Tap to go on."
3. The kick preview does not say "may stop early".
4. The hyena walks 2, plus 1 more square on a pounce. The old "walks 1" line is marked superseded.
5. "Badger speed boost" is not a separate rule. The guard locks a walk of 2. Old notes do define a related phrase: a hidden speed-up after a knock-out. The simulations and the 2026-11-07 decisions say that speed-up was removed, and the handover says the same. The README line that says not to change "the badger speed boost" was left as written, because those notes are what the phrase points at.
6. The state file's opening note says which older "unmerged" paragraphs are history.
7. The shot clock and rejoin are in rulebook section 13. A classic 2-player game uses the same clock as the bigger games.
8. Five players is the maximum. Rulebook section 2 says there is no 6, 7, or 8 player game.
9. The look rules are still judgment only.

## Standing rules

| Id | Rule | Source | How it is checked |
|---|---|---|---|
| R01 | The board is 9 columns by 7 rows. | Rulebook 1 | `robots/guard-balance.js` |
| R02 | Distance is king-move distance. Diagonals count as 1. | Rulebook 1 | Judgment only. The code uses this everywhere, and no single check names the definition. |
| R03 | Game types are classic (2), 3 players, Hunters (4), 2 vs 2 (4), and 2 vs 2 plus a hunter (5). Turn order is the table in rulebook section 2. | Rulebook 2 | `robots/run.js` opens 2, 3, 4, and 5 player tables. Exact turn order is judgment only beyond "a game started". |
| R04 | A computer can fill an empty seat. | Rulebook 2, lobby | Judgment only. The lobby has a computer button. The robot run uses people, not computers. |
| R05 | The game lasts 30 rounds unless it ends earlier. | Rulebook 2 | `robots/guard-balance.js` |
| R06 | The ostrich hides 3 eggs (2 each in 2 vs 2), not on a rock pile and not on or next to a leaf, then picks a start square. | Rulebook 2 | Judgment only. `testv2.js` places eggs on legal squares. It does not walk every illegal square. |
| R07 | Every animal moves up to 2. An ostrich carrying an egg moves up to 1. | Rulebook 3.1 and 7 | `robots/guard-balance.js` and `testv2.js` ("everyone moves 2") |
| R08 | An animal may pass over anything. Only the landing square counts. Nobody lands on a wrecked square. | Rulebook 3.2 and 3.3 | `testv2.js` ("anyone passes over wrecked squares") |
| R09 | A bird may not land on an animal it can see. A hunter may land on a bird or the other hunter. Anyone may land on what it cannot see, including a buried badger. | Rulebook 3.3 | `testv2.js` ("birds may not land on an animal they see") |
| R10 | The landing square's own effect happens before a catch. | Rulebook 3.4 | Judgment only. The order is in the engines and is not one named assertion. |
| R11 | A catch is a hunter landing on a bird, or a bird landing on a hunter, including a buried badger. | Rulebook 4.1 | `testv2.js` (buried-badger catch) |
| R12 | A caught bird is pushed 2 squares in a random open direction, then 1 if needed, otherwise the hunter steps back 1. The bird does not lose a turn. | Rulebook 4.2 | Judgment only. `CONFIG.scramble` is pinned at 2. The fallback order is not one named assertion. |
| R13 | The second catch on the same bird knocks it out. | Rulebook 4.3 | Judgment only. Knock-out counts are in `T3.ko` / `TH.ko` (2 and 2). No robot replays two catches. |
| R14 | A hunter is not told the square a caught bird scrambled to. | Rulebook 4.4 | Judgment only. `e2e-three.js` checks that a hunter does not see birds. It does not replay a scramble. |
| R15 | A carried egg drops on the square where the ostrich was caught. | Rulebook 4.5 | Judgment only. |
| R16 | Catches show in the animal row only. No catch mark on the square. Claw sets are 3 in a 3-player game and 4 in Hunters and 5-player games. No numbers on the claws. | Rulebook 4.6, decisions 2026-11-08 | Judgment only. This is a look. |
| R17 | Push distances: caught bird 2, hunters meeting 2, stone 2, kick 3, kick on a badger 2. | Rulebook 5.1 and 7.1 | `testv2.js` (kick 3, badger 2, stone push 2). Meeting distance is the same pin (`pushHunters` 2) in `robots/guard-balance.js`. |
| R18 | A push stops early before a wreck, the edge, or an animal that is up. A kick that reaches the edge wraps and still stops for a wreck or an animal that is up. After the kick, the kicker sees the whole slide. Other players keep normal sight. | Rulebook 5.2, decisions 2026-11-08 | `testv2.js` covers the wrap and the early stop. The "kicker sees it, others do not" part is judgment only. |
| R19 | A buried badger does not stop a push. Being pushed is not a move: no eat, no find, no refill, no sniff, no catch on arrival. | Rulebook 5.3 and 5.4 | Judgment only. |
| R20 | A stone that pushes a buried badger brings it up. | Rulebook 5.5 and 6.3 | `testv2.js` ("brings a buried badger up") |
| R21 | The vulture holds at most 1 stone. Landing on a rock pile by its own move refills it. A throw is its own square or the next square, never the teammate's square. | Rulebook 6.1 and 6.2 | `robots/guard-balance.js` pins the numbers. `testv2.js` checks "no stone at the teammate". The refill itself is judgment only. |
| R22 | A stone smashes an egg that is not under the ostrich, wrecks an ordinary square, and never wrecks a leaf or a rock pile. | Rulebook 6.3 | `testv2.js` ("a thrown stone wrecks an ordinary square") |
| R23 | A stone thrown at the ostrich is kicked back onto the vulture and is never kicked back a second time. On a leaf or rock pile it goes one square past. | Rulebook 6.5 | `testv2.js` (kickback tests) |
| R24 | The ostrich may sit with no limit. Anyone who can see the ostrich can see the sit. | Rulebook 7.1, decision 2026-11-07 | `testv2.js` ("sitting has no limit") |
| R25 | The ostrich eats at least every 15 of its turns or it starves. An egg goes cold after 15 rounds without a stand or a sit. A carried egg is not warmed. An egg is never put on or next to a leaf. | Rulebook 7.1 | `robots/guard-balance.js` pins 15 and 15. `testv2.js` checks the carried egg and the leaf. Starvation itself is judgment only. |
| R26 | Birds always see each other. They see a hunter within 2, and never a buried badger. | Rulebook 7.1, 7.2, and 10 | Judgment only. `e2e-three.js` checks one far-hunter case. |
| R27 | The vulture flies 2. On its own landing it learns whether an egg is on or next to that square, and it finds an egg it lands on. | Rulebook 7.2 | `robots/guard-balance.js` pins fly 2 and smell 1. The yes/no sniff is judgment only. |
| R28 | The hyena walks 2. If it sensed a bird and did not catch, it may take 1 more square. The overlap of the two readings is the likely area. | Rulebook 7.3 | `testv2.js` (pounce step) |
| R29 | The badger walks 2 and does not pounce. Staying still buries it. Buried, it sees a bird next to it. Coming up, or a push, brings it out. Under a hyena it may burst and push the hyena 2. | Rulebook 7.4 | `testv2.js` ("a badger does not pounce"). The burst and the announcement are judgment only. |
| R30 | The badger walks 2. Knocking a bird out does not let it move farther. There is no separate speed boost. | Decision 2026-11-13, `robots/guard-balance.js` | `robots/guard-balance.js` |
| R31 | A hunter that moves onto the other hunter pushes it 2. A hyena that walks onto a buried badger shares the square. | Rulebook 8 | Judgment only. `pushHunters` is pinned at 2. The share-the-square case is not one named assertion in this checklist. |
| R32 | A knocked-out bird is out and gets a read-only view of the whole board. Its side is out only when all of its birds are out. In 2 vs 2 the teammate can still win. | Rulebook 9.1 | Judgment only. |
| R33 | In a 3-player game the hunter wins at 3 catches in total. | Rulebook 9.2, decision 2026-11-13, `CONFIG.hunterGoal` | `robots/guard-balance.js` |
| R34 | In 2 vs 2 plus a hunter, the hunter's goal is the first side to meet its goal (one ostrich and one vulture). | Rulebook 9, `CONFIG.hunterGoal['5']` | `robots/guard-balance.js` |
| R35 | Hunters mode: more knock-outs, then more catches, then a tie. No eggs left while the vulture side is in: the vultures win. An egg alive after round 30 while the ostrich side is in: the ostriches win. Classic: a knocked-out bird ends the game. Time with no goal met is a draw. | Rulebook 9.2 to 9.6 | Judgment only. |
| R36 | Every phone hears a big event. The square is shown only to someone who can see it. | Rulebook 11 | Judgment only. |
| R37 | The shot clock is 10 seconds in every game, including classic 2 players. Hiding the clock does not stop it. | Rulebook 13, README | `robots/guard-balance.js` pins 10000. `robots/run.js` checks that a short clock ends a 2-player turn and a 3-player turn. Hiding the clock is judgment only. |
| R38 | While the table is asked to let someone rejoin, the shot clock pauses and then continues from the time left. | `testrejoinclock.js`, PR #34 | `testrejoinclock.js` |
| R39 | Rejoin does not take someone else's seat. Your own token sits you back down. After the grace, a person can ask, and someone still in the game has to allow it. The token is not in the link. | `e2e-rejoin.js`, `testrejoin.js` | `e2e-rejoin.js`. `robots/run.js` checks that the rejoin line appears for a new browser. |
| R40 | Balance numbers stay put: eggs 3, warmth 15, food 15, stones 1, kick 3, badger kick 2, fly 2, throw 1, smell 1, scramble 2, hunter push 2, leaves and rocks on their fixed squares. | README, `docs/PLAN-2026-11-06.md`, `game.js` `CONFIG` | `robots/guard-balance.js` |
| R41 | A merge to `main` restarts the live site and ends games in progress. Do not merge during a family game. | README, `docs/project/STATE-2026-11-08.md` | Judgment only. This is a process rule. |
| R42 | On-screen words are short, do not name a color or a look, and a person should be able to read them in about a second. | Decision 2026-11-07, `docs/reviews/UX-WORDS-AND-VISUALS-2026-11-07.md` | Judgment only. |
| R43 | "May be here" and "is here" are the same small corner mark, dashed or filled. Yellow means only "you can move here". | Decisions 2026-11-07 and 2026-11-08 | Judgment only. It is a look. |
| R44 | The kick preview shows direction and distance. It does not say "may stop early". | Rulebook 5.2, decision 2026-11-07 | Judgment only. The live tooltip no longer uses those words. |
| R45 | Big moments follow the 2026-11-11 path: Look out! for 1 second, then the cartoon, then 0.6 seconds per square, then "Tap to go on." | Rulebook 14, `docs/project/DECISIONS-2026-11-11.md` | Judgment only. |
| R46 | The ostrich can kick the vulture in every mode, not only hunters. | Decision 2026-11-09 | `testv2.js` kicks a vulture in the classic game. The other modes are judgment only. |
| R47 | When a stone hits an animal, the game does not say "Missed." | Decision 2026-11-09 | Judgment only. |
| R48 | There is no 6, 7, or 8 player game. The lobby stops at 5. | Rulebook 2, `lobby.js` | `robots/run.js` (eight browsers, no sixth seat started) |

## Not standing

Kept so they are not mistaken for rules.

- Rulebook v1, the rules draft, and both reviews are history. See `docs/README.md`.
- The top of `STATE-2026-11-08.md` describes 2026-11-07, including work it says is unmerged. Later lines in that file overtake it.
- `docs/PLAN-2026-11-06.md` and `docs/CODE-REVIEW-2026-11-06.md` describe `main` at `6e7c072`.
- `docs/OPEN-ITEMS.md` is a 2026-11-08 checklist, not the rulebook.
- Playtest transcripts are what people said, not rules.
