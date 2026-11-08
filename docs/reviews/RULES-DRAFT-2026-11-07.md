# Battle Ostriches rules draft, 2026-11-07

Written by Claude for Brian from today's decisions (DECISIONS.md) and simulations (SIMULATIONS-2026-11-07.md). This is the best current hypothesis, not what is live. Items marked **DECIDE** need Brian's call. Numbers in [brackets] come from the rules constants and appear on the role cards.

## Status as of 2026-11-07, about 9 PM PT

**Settled (Brian's calls; no more testing needed):** everyone moves 2 (ostrich carries 1; anyone passes over wrecked squares but cannot stop on one); food and warmth every 15; a carried egg is not warmed; every stone wrecks its square (leaves and rock piles never; a stone there is wasted with a silly line); a stone at the ostrich is kicked back (bounces past a vulture on a leaf or rock); Kick pushes 3 (badger 2), buys one turn, landing shown first; no sit limit, sitting visible; two-step Pounce with overlap dots brightest; badger 2 catches, sure first-try burrow, ambush sight, "dug in" announced, can camp under a leaf or rock pile, quotes; hunters meeting: the mover pushes the other 2, a hyena can stand on a hidden badger; hunters see each other within 2; no missed turn after a catch; your square works first; being pushed is not a move; a side wins when its goal is met even if knocked out; Hunters tie-break: knock-outs, then catches, then tie; big events announced to everyone, location only to those who saw; roles stay clean; no hidden speed-up.

**Dropped (no longer tested):** direction hints, tracks, one-move Pounce, carry every other turn, double-speed cooling, sit limit, missed turn after a catch, hunters unable to see each other, "the hunter needs a moment".

**Open (being simulated):** hunters do not see where a caught bird lands; the wrap-around kick; whether the catch tie-break makes Hunters ties rare; the 3-player badger (22% last round against a fair share of about 33%).

## The goal of this rule set

Every animal has one speed, one skill and its own way of seeing, the same in every game type and printed on its card. Everything else is a universal rule that applies to every animal. Nothing happens without a line on screen saying what happened and why.

## Universal rules (every animal, every game type)

1. **Moving.** Any direction, diagonals included. Every animal moves up to [2] squares a turn. The one exception is the ostrich carrying an egg, which moves [1]. Anyone may pass over anything on a 2-square move (an animal, an egg, a wrecked square); only the landing square counts.
2. **Wrecked squares.** Every stone the vulture throws wrecks the square it lands on. Nobody can stop on a wrecked square, but anyone can pass over one. Leaf squares and rock piles can never be wrecked: a stone thrown at an empty one is used up harmlessly ("The stone landed softly in the leaves." / "The stone clattered back onto the rock pile."). A stone thrown at the ostrich is kicked straight back and wrecks the vulture's own square.
3. **Catching.** A hunter landing on a bird, or a bird landing on a hunter, is a catch. A caught bird is pushed back [2] squares and plays its next turn as normal (Brian, 2026-11-07: missing a turn let the hunter catch it again at once). The [2nd] catch knocks it out of the game. This is the same for the hyena and the honey badger.
4. **Pushes.** Every push is [2] squares straight away from whoever caused it (a catch, two hunters meeting, a stone wrecking the square someone stands on), except the ostrich's Kick, which pushes [3] because it is the ostrich's skill. Any push brings a buried badger up. A push stops early at a wrecked square, the edge of the board or another animal, and the line on screen says so.
5. **Being pushed is not a move.** Nothing that happens on arrival happens (eating, finding an egg, refilling a stone, sniffing, catching). Where you end up still counts for where you are: an ostrich pushed onto its own egg is standing on it, so the egg is warmed and guarded. A buried badger does not stop a push; the pushed animal ends on top of it and nothing happens.
6. **Your square works first.** When you land by your own move, the square acts first (eat, refill, find an egg), then any catch.
6b. **Hunters only smell birds, even after a catch.** A hunter never sees the square a caught bird is pushed to; it gets its rose dots as usual. A second catch right away is a guess, not a sure thing. (Replaces "the hunter needs a moment", 2026-11-07.)
6c. **Hunters meeting.** Whichever hunter moves onto the other pushes it back [2]. A hyena that unknowingly steps onto a buried badger shares the square and nothing happens; on its turn the badger may burst out and push the hyena back the way it came.
7. **What you can see.** Prey is alert, predators track: birds always see each other and see any hunter within [2] squares (never a buried badger); hunters see birds only by smell (the rose dots) and see each other within [2] (Brian kept this, 2026-11-07). Anyone who can see the ostrich can see when it is sitting on an egg.
8. **Announcements.** Every phone is told about every big event (a catch, a knock-out, a kick, the hunters meeting, the badger digging in or coming out). Where it happened is shown only to players who can see that square.
9. **Nothing hidden.** No secret speed-ups or exceptions; every number is on the cards.
10. **Your side wins when its goal is met, even if you have been knocked out** (Brian: "greater love hath no bird..."). Endings, in order: both birds knocked out, the hunter wins at once (Hunters mode: more knock-outs wins, then more catches, an exact match is a tie; no sudden death); no eggs left, the vulture's side wins; an egg alive after round [30], the ostrich's side wins. A knocked-out ostrich can no longer warm its eggs.
11. **Who hunts what.** The vulture hunts eggs. The hunters hunt birds. Hunters never touch eggs.

## Each animal

| | Speed | Skill | Sees | Wins when | Loses when |
|---|---|---|---|---|---|
| **Ostrich** | Walks [2], carries an egg [1] | **Kick:** instead of moving, push an animal next to you that you can see [3] squares away ([2] for the honey badger: it's tough); you stay put. A kick always buys you one turn. A kick that would leave the board wraps around to the opposite side (only kicks wrap); the landing square is shown before you kick | Both birds; hunters within [2] | Any egg is alive after round [30] | All eggs are smashed or cold, or it is knocked out or starves |
| **Vulture** | Flies [2] | **Stone:** throw at your square or one next to you; hold [1], refill by landing on a rock pile | Both birds; hunters within [2]; on landing, sniffs for an egg within [1] | No egg is left | An egg survives round [30], or it is knocked out |
| **Hyena** | Walks [2] | **Pounce:** if a bird was near at the start of your turn and your move did not catch it, one more square; the dots update first and the most likely squares glow brightest | Rose dots: a bird is within [2] somewhere | Both birds are knocked out (Hunters mode: more knock-outs than the badger) | A bird wins first |
| **Honey badger** | Walks [2] | **Burrow:** stay still one turn to dig in, anywhere it can stand, even under a leaf or rock pile (Brian, 2026-11-07: a sneaky bonus; being simulated for fairness). Buried, you are invisible and see any bird next to you; a bird that steps on you is caught. Moving brings you up. | Rose dots, plus birds next to you while buried | Same as the hyena | Same as the hyena |

### Ostrich needs

- **Food:** step on a leaf at least every [15] turns or it starves.
- **Warmth:** stand or sit on each egg at least every [15] rounds or it goes cold. An egg in the beak is not warmed.
- **Sitting:** the ostrich may sit on an egg as long as it likes (no limit) and kick from it. Sitting (choosing to stay on an egg, including kicking from it) is visible to anyone who can see the ostrich, so guarding an egg gives its location away. Passing over or stopping on an egg is not visible. Food is the clock: it must leave to eat. (Brian, 2026-11-07; being simulated.)
- **Kick limits:** not on a turn it carries (carrying is a move), never a buried badger (it cannot be seen), never a teammate in 2 vs 2.

## Fixes already decided that make the rules understandable

- "The ostrich kicked the stone right back!", "The honey badger dug in!", "The honey badger came out of its burrow!", the hunters-meeting lines, "who hunts what" at the start.
- A caught bird is told "Pushed back 2 squares." The hidden lost turn is removed.
- Badger quotes as approved (the "give a sh*t" line only when it shoves the hyena).
- Carrying: a cooling ring on the egg in the beak and a "cooling" tag.

## Edge cases (proposed defaults)

- A stone hits whatever is on its square, seen or not: an egg is smashed; an animal is pushed 2 away from the vulture (a buried badger comes up, announced); the ostrich kicks it back.
- A stone thrown at the ostrich while the vulture stands on a leaf or a rock pile: the kicked-back stone keeps going one more square straight past the vulture and lands there like any stone (wrecks it, hits whatever is there). Lines: "Boing! The stone bounced off the leaf." / "Clang! The vulture batted it away with a rock." If that square is off the board, a leaf or a rock pile, the stone is lost. (Brian's Easter egg, 2026-11-07; allows a rare bank shot.) While the vulture shares the ostrich's square: the stone bounces off harmlessly.
- A caught ostrich carrying an egg drops it where it was caught: "The ostrich dropped its egg."

## DECIDE: smaller open calls

1. ~~Kicks count toward the 3-turn egg limit~~ Replaced: no sit limit; sitting is visible (above).
2. **Food and warmth number:** with the Kick, 13 made classic 50/50 but 2 vs 2 60/40 for the vultures; 15 kept 2 vs 2 fair but classic 61/39. The round running now tests 14 and 15 with a 3-square kick and the turtle strategy. Brian wants a busier ostrich; 12 or 13 may be fair once the Kick is in.
3. **Vulture tie-break** when it wrecks its own square and hops: nearest open square, farthest from the ostrich on a tie (recommended; it should not hop closer to its prey by luck).

## Where the bots may not match real players

The simulations play bot against bot. These are the places a family game could turn out differently:

- **The hyena's guessing.** Bots read the rose dots with a simple belief model. People may be better (the brightest overlap squares help) or worse (they may not trust the dots). This is the biggest uncertainty for the hyena.
- **Reacting to "dug in".** The tests assume birds avoid a known dig-in spot about a third of the time. Real players will vary a lot; an attentive player could make the badger much weaker.
- **Hiding eggs near a leaf.** The ostrich bot hides its nest near a leaf, which made it much stronger. Families may not do that at first, so the ostrich may be weaker in early games. A one-line tip in the ostrich's first walkthrough would help.
- **Kicking.** Bots kick by a fixed rule. People may kick too often (wasting turns) or forget they can.
- **Walling in.** The bot vulture boxes the ostrich only in simple cases. A clever player may wreck squares on purpose to trap the ostrich more often.
- **Fun is not measured.** Simulations measure who wins, not whether turns feel interesting, how long people wait, or whether the badger is fun. The family game answers that.

## What to watch in the next recorded family game

1. Can each player say their animal's speed and skill after the role card?
2. Does anyone ask "why did that happen?" (a sign a cause is still missing).
3. Does the hyena player feel lost, and do the bright overlap dots help?
4. Does the badger player enjoy it, and do the birds react to "dug in"?
5. Does the ostrich eat and warm eggs often enough to feel busy?
6. How often is the Kick used, and does it feel fair to the hunters?
