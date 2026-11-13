# Battle Ostriches rulebook v2 (2026-11-07): rules editor review

> Review of version 2, not a second rulebook. The rules text is [RULEBOOK-v2-2026-11-07.md](RULEBOOK-v2-2026-11-07.md).

Reviewed from RULEBOOK-v2-2026-11-07.md only, checked against the earlier review RULEBOOK-REVIEW-2026-11-07.md. No code read. Rule numbers are v2's.

## Summary

1. v2 fixes the three worst v1 problems: hunters may now land on birds and on each other (3.3), shared-square pushes have a direction (5.1), and pushes stop before any animal that is up, seen or not (5.2). The stone loop, the leaf bunker and the leaf fortress are also gone.
2. Still open and still the most important: turn order lets a caught bird be hit again before it moves. In Hunters mode it can be caught a second time and knocked out by the next hunter. In 3 players it can lose the egg it was sitting on to the vulture.
3. New top problem: the "pusher steps back 1" fallback (4.2, 5.2) has no answer when that square is blocked. It moves an ostrich off its own egg after a blocked kick, and it is meaningless for a buried badger that never moved. These blocked pushes are common near edges.
4. New: 9.1 says "a knocked-out bird loses" while its 2 vs 2 team stays in and can win, and an ostrich with no eggs left after the vulture is knocked out stays in with no way to win.
5. Smaller new items: the scramble rule checks only the landing square while pushes stop at blocks on the path. A kicked vulture that stops early shows exactly where a hidden hunter is. Sitting on an egg is a trap kids will fall into. There are also several wrong cross-references and one dead clause.

## Earlier findings: status

| # | Earlier finding | Status in v2 |
|---|---|---|
| 1 | 3.3 blocked meetings and ambush | **Resolved** (3.3 now lets hunters land on birds and the other hunter). 8.1's "(when it can see it)" is now redundant. |
| 2 | Shared-square pushes had no direction | **Mostly resolved** (5.1). Left over: a stone push on the vulture's own square and a hyena pushed (not moved) onto a buried badger before it bursts out (new finding 6). The kick's own direction is never stated. |
| 3 | Back-to-back catches; catch then smash | **Still open.** A is softened because the scramble is random, but the second hunter still moves before the bird and senses it within 2. B is unchanged. See below. |
| 4 | Push stops and kick preview leaked hidden hunters | **Resolved** as written (stops before any animal that is up; preview shows only direction and distance). A smaller leak remains: new finding 4. |
| 5 | Hunters could work out the scramble square; rule 11 leaks | **Partly.** The random direction fixes the hunter's deduction. Rule 11's "players who can see that square" is still undefined (section 10 defines sight of animals only), and a catch on the vulture still shows the ostrich exactly where the hunter stands, however far away it is. |
| 6 | Players still in with no way to win | **Partly.** A and C are fixed: a knocked-out bird's side is out. B (a trailing hunter in Hunters mode) is open. D (2 vs 2 teammate eggs) is partly fixed, since ostrich 2 can still win with its own eggs. A new case is in new finding 2. |
| 7 | Stone kick-back special cases | **Partly.** Loop fixed ("never kicked back again"), dead rule and 6.6 removed, own-egg smash now consistent ("acts as a normal stone"). Still open: the hop (6.4) is neither a move nor a push (does it refill, find, sniff, catch?), and the tie "farthest from the ostrich" has two ostriches in 2 vs 2. Throwing at an ostrich is still never useful. |
| 8 | Leaf and rock pile bunkers for a buried badger | **Resolved** (6.3: a stone pushes any animal on any square). |
| 9 | Shared squares nobody resolves | **Partly.** Pinned catches now have a fallback, but the fallback itself breaks (new finding 1). A bird scrambled onto a buried badger shares the square, and the badger cannot catch it. Burst-out still names only the hyena. |
| 10 | Egg-next-to-leaf fortress | **Resolved** (a permanent ban on eggs on or next to a leaf). The kick-and-return loop no longer matters. The clause in 4.5 is now dead (new finding 7). |
| 11 | Can an animal stay still? | **Partly.** Staying is now allowed (3.3). Still unclear whether staying triggers refill or sniff: 3.4 says "lands by its own move", while eating counts staying. Also unclear whether staying blocks pounce. |
| 12 | Smashed eggs: who learns what | **Partly.** "All at once" now implies smash and wreck, and "an egg not under the ostrich" covers found eggs. Still missing: "egg smashed" and "egg went cold" in the announcements, and an egg count on every phone. |
| 13 | Kick wrap-around | **Open** (kept, marked [OPEN]). "Always travels its full distance" next to "still stops before…" still reads as a contradiction. "Both directions for diagonals" is still unclear at a side edge. |
| 14 | Hyena knows the dig-in spot | **Open.** The table still says the hyena "never" sees it, but a hyena that watched the badger stand still and then heard "dug in!" knows the spot. |
| 15 | 2 vs 2 wording | **Partly.** Teammate stones are now banned (6.2) and 9.2 says "all birds". Still open: "both birds always" (7.1, 7.2, table), "the ostrich" in 6.3 to 6.5, whether teammates see each other's eggs, and a 2 vs 2 + hunter win that needs 8 catches. |
| 16 | Hunter's win too hard; kingmaking | **Open** (deferred to playtest, reasonable). |
| 17 | Two clocks, start values | **Open** (15 "turns" for eating, 15 "rounds" for eggs; no start values; 3.4 still lists warming as a landing effect). |
| 18 | Carrying state | **Open** (still a beak state; still unstated whether the ostrich must stand on the egg and whether others see a carry). |
| 19 | Rose dots and pounce | **Open.** "Every square where a bird could be" is still vague. Pounce now reads as unconditional after the second reading. It is unclear whether the badger's "Sense: as the hyena" includes pounce. |
| 20 | Setup gaps | **Open** (start square limits, eggs touching, eggs on fixed start squares, who picks the hunter in 3 players). |
| 21 | A kick from an egg: is it visible as sitting? | **Open.** |
| 22 | Knock-out credit in Hunters mode | **Open.** Also unstated: who gets credit when an ostrich starves (7.1 calls starving a knock-out). |

### Still open finding 3, restated for v2 (highest priority overall)
- **A (Hunters mode: vulture, ostrich, hyena, badger):** the hyena catches the ostrich, which scrambles 2 at random. The badger moves next, before the ostrich. It sees the hyena within 2, so it knows the catch square, and its sense dots mark every square within 2 of itself. A scramble square within reach is a coin flip at worst. A second catch knocks the ostrich out, and its player made no choice in between. The random direction can also drop the bird right next to the badger.
- **B (3 players: vulture, ostrich, hunter; 2 vs 2 + hunter: the hunter moves just before vulture 1):** the ostrich sits on an egg, so the vulture knows the square. The hunter catches it, and the ostrich scrambles off. The vulture moves next and throws at the egg square: the hunter standing there is pushed, and the egg is smashed and wrecked "all at once" (6.3). In 2 vs 2 + hunter, both vultures act before the caught ostrich 2 does.
- **Fix (one universal line):** "A caught bird can't be caught again, and the square it was caught on can't be hit by a stone, until that bird has taken its next turn." This is the "head start" rule and covers both A and B. A turn-order change (vulture, hunter, ostrich) fixes B only.

## New findings, most important first

### 1. The "pusher steps back 1" fallback has no answer when it is blocked
- **Rules:** 4.2, 5.2, 7.1 (Kick), 6.3, 4.1.
- **Situations:**
  - A hunter moves 2 diagonally and catches a bird pinned in a corner. "Steps back 1" means the square it passed over, which may be wrecked or hold another animal (3.2 allows passing over both). No rule says what happens then.
  - A bird lands on a buried badger and is caught (4.1), and the scramble is blocked. The badger never moved, so "the hunter steps back 1" has no direction.
  - The ostrich sits on its egg and kicks a vulture pinned against a wreck. 5.2 makes the pusher step back 1: the ostrich is moved off its own egg by its own kick, and the preview never warned it. 7.1 says "the ostrich stays put", which contradicts this.
  - A stone pushes a hunter pinned against a wreck. The "pusher" is the vulture, which then steps back 1, a movement no one expects.
  - In a meeting, the pushed hunter is pinned and the mover steps back onto a square it passed over, which may be blocked.
- **How often:** about half the board is on or next to an edge, and wrecks build up, so blocked catches and kicks come up in most games with hunters.
- **Fix (universal):** "If a push can't move the pushed animal at all, it stays, and the animal that moved this turn goes back to the square where it started its turn. If nobody moved (a kick or a stone), nothing else happens." The start square is always free, because nothing else moved in between. This covers catches, ambushes (the bird that landed goes back), meetings, kicks and stones in one line, and the ostrich never leaves its egg by kicking.

### 2. Endings: 9.1 contradicts team play, and an ostrich can be stuck in the game with no way to win
- **Rules:** 9.1, 9.3, 9.4, 9.6, 12 (design goal).
- **Situation A (2 vs 2):** ostrich 1 is knocked out. 9.1 says "a knocked-out bird loses", yet its team stays in and wins if ostrich 2 keeps an egg alive. Did player 1 win or lose? Children will ask at the end of every 2 vs 2 game that has a knock-out.
- **Situation B (3 players, Hunters, 2 vs 2 + hunter):** the hunter knocks out the vulture, then the last egg goes cold or was already smashed. 9.3 needs the vulture side in, so nobody wins on eggs. 9.4 needs an egg alive, so the ostrich cannot win. The ostrich is still in, but its only aim is to run for a draw (9.6) for up to 15 rounds.
- **Situation C:** 9.3 and 9.4 never say the game ends. When the vulture wins in 3 players, does the hunter keep playing?
- **Fix (universal, replaces 9.1 to 9.6 wording):** "A side is out when all its birds are knocked out or it can no longer meet its goal. A side that meets its goal wins and the game ends; everyone else loses. When only one side is still in, it wins. If time runs out first, it is a draw. Teammates win or lose together." This also gives the hunter the win in Situation B, which it earned by knocking out the vulture.

### 3. The scramble rule (4.2) and the push rule (5.2) disagree about blocks on the path
- **Rules:** 4.2, 5.2.
- **Situation:** 4.2 picks a direction "whose landing square is open". But 5.2 stops a push before a wreck or an animal on the path. If the middle square is wrecked and the square 2 away is open, 4.2 allows the direction and 5.2 stops the push at once. That triggers the blocked fallback (finding 1) even though other directions were free.
- **How often:** often in the second half of a game, when wrecks are common.
- **Fix:** "a random direction in which the push can travel its full 2", then 1, then the finding 1 fallback.

### 4. A kick that stops early shows the ostrich exactly where a hunter it cannot see is standing
- **Rules:** 5.2, 7.1 (sight within 2; Kick), 10, 12 ("no result without a visible cause").
- **Situation:** the ostrich kicks the vulture 3 squares. Birds always see each other, so the ostrich sees where it ends. If it stops after 1 or 2 squares with no wreck or edge in the way, there is an animal that is up on the next square, 3 or 4 squares from the ostrich. That is outside the ostrich's sight (2), so it now knows the hyena's exact square. A stone push of a hunter gives the vulture the same signal.
- **How often:** every kick of the vulture in 3-player and Hunters games. Kicking the vulture is the ostrich's main use of its kick, so this will be found quickly and used on purpose as a hunter detector.
- **Fix:** accept it as a visible cause and say so on the card ("if your kick stops short, something you can't see is in the way"). Hiding it would need pushes that pass through animals, which breaks the no-shared-squares rule. Accepting it is simpler, and it is fair because the ostrich spends its turn to learn it.

### 5. Sitting on an egg is a trap that 10-year-olds will walk into
- **Rules:** 7.1 (Sit is visible; eat every 15 turns; eggs never next to a leaf), 7.2 (Find), 6.4 (a stone on its own square smashes an egg under it).
- **Situation:** a child sits on an egg, which is the natural thing to do, and the vulture now knows the square. A stone thrown at the ostrich's square is kicked back, so the egg is safe while it sits. But the egg is at least 2 squares from any leaf, so the ostrich must leave to eat. The vulture hovers 2 squares away with a stone. When the ostrich leaves, the vulture lands on the egg. The ostrich, on the leaf, is not next to it and cannot kick it. The vulture throws at its own square and the egg is smashed. Kicking the vulture away first doesn't help: it lands 4 away and flies back to 2. Experienced players learn never to sit and to warm eggs by landing on them, which nobody can see. Sitting becomes a beginner's mistake that the rules invite.
- **How often:** in most games with a new ostrich player.
- **Fix:** no rule change is needed. Put it on the ostrich card in one line: "Staying still on an egg shows the vulture where it is." Alternatively, test whether "Sit" should be dropped as a named action, since staying still already covers it (3.3).

### 6. Buried badger leftovers: catch state, burst-out after a push, pushes with no direction
- **Rules:** 4.1, 4.2, 5.1, 5.3, 6.3, 6.4, 7.4.
- **Situations:**
  - A bird lands on a buried badger and is caught. Does the badger stay buried? 5.5 brings it up only for a push. Every bird that saw the catch now knows the spot anyway.
  - The ostrich kicks a hyena onto a buried badger (5.3). On its turn the badger bursts out "back the way the hyena came", but the hyena came by a push, and 5.1 speaks only of "the move that brought them together".
  - The ostrich kicks the vulture onto a buried badger, and the vulture then throws at its own square. 6.3 pushes the badger "away from the vulture" from the vulture's own square, which has no direction.
  - A bird scrambles onto a buried badger (4.2 counts its square as open). They share the square. The badger cannot catch a bird it is already standing with.
- **How often:** rare, except the first case, which comes up on every ambush.
- **Fix (universal):** "Any catch, push or stone involving a buried badger brings it up" (a hyena walking onto it still does nothing). In 5.1, write "the move or push that brought them together". Then add: "A push with no direction left uses the scramble rule (random open direction)." Finally, treat a buried badger's square as not open for a scramble.

### 7. Wording and cross-reference errors
- 5.1 lists the stone push as "(6.4)"; it is in 6.3. 5.5 also says "(a stone, 6.4)"; that should be 6.3.
- The kick's push direction is never stated. Add "away from the ostrich" in 5.1 or 7.1.
- 4.5 "even if that square is next to a leaf" can never happen. A carrying ostrich is always on a square not next to a leaf (7.1 Carry), and nothing pushes it before the catch. Delete the clause, or delete 4.5 entirely per earlier finding 18.
- 4.1 "a bird lands on a hunter" can only mean a buried badger, since birds see every hunter that is up within their 2-square move. Say "a bird lands on a buried badger".
- 8.1's "(when it can see it)" is no longer needed now that 3.3 allows meetings and 8.2 covers the buried case.
- 6.4's hop: say it counts as a push (5.4), so it never refills, finds, sniffs or catches. Break the tie by distance from "the nearest ostrich".

### 8. The badger can sit buried for a long time, which is dull for the badger's player
- **Rules:** 7.4, 10, 11.
- **Situation:** the best badger plan is to dig in where birds must pass and wait. Birds that saw the dig avoid it, and the badger player then has nothing to do for many turns. Stones can now dig it out, which helps.
- **How often:** likely in many games once players find the ambush.
- **Fix:** track it in playtests. If it drags, use a buried limit of [N] turns, or give the buried badger its sense dots each turn so the player has something to read.

## Looks solid in v2; don't change
- Hunters may land on birds and on each other (3.3). One clear line.
- Shared-square push direction (5.1) and "stops before any animal that is up, seen or not" (5.2).
- Random scramble direction (4.2, 4.4). It removes the hunter's deduction cleanly.
- A stone pushes any animal on any square (6.3). This removed the bunker.
- "A kicked-back stone is never kicked back again" (6.5). This ended the loop.
- A permanent ban on eggs on or next to a leaf. This ended the fortress.
- A knocked-out bird's side is out (9.1). This removed the hopeless-but-still-in ostrich from v1. Finish the job with new finding 2.
