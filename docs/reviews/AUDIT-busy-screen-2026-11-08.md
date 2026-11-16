# Busy screen, 2026-11-08

> Pictures named in this file are not in the working tree. Recover them from commit `548f054995d139568c4613e4db85ee2629ee3bee`. See [docs/reviews/README.md](README.md).

## Decision update — Brian, 2026-11-08

The original screenshots/observations below are historical. PR #23 now uses the approved personal and watcher kick/stone/meeting/burst lines, numbered partner-find and team-smash messages (see `egg-layout-shots/WORDS-FOR-APPROVAL.md`). The kicker sees the full actual kick slide/landing, including early stops outside normal sight; other watchers keep their normal rules. Ordinary movement stays about one second. Big-scene samples are still required: no duration or tap-to-skip design is approved or built here.


The start of a game puts too many things in front of the player at once. When a bird is caught, that player often cannot tell it was them. The same problem shows up in the other two-animal moments: a kick, a stone, the hunters meeting, the badger bursting out, and a stone kicked back.

Pictures are iPhone size (390 by 664), from real games, the same setup as `tools/shots-real-play.js`. The tutorial, the role card and the tips were left off, so these are the boards a returning player gets. Every picture was in `docs/reviews/busy-2026-11-08/`. Those files are in the commit named above, not in the working tree. The clock in the pictures says 120 seconds because the test slowed it down so a turn would not expire. A real game uses that same bar with a 10-second clock.

The animal is called the badger. A few pictures still show the old two-word name. That rename is a separate change.

## What to change

1. Use one line in the message bar, and if the moment is about you, say you first and leave it there alone for about a second. Today the mode line, "Bird near", "Hyena near!" and the catch line all fight for the same small bar and cover each other.
2. Name both animals, and say "you" to the person it happened to. "Caught! One more and you're out" does not say the hyena did it. "Ostrich kicked the hyena" does not tell the hyena it was them. "Smashed!" does not say the vulture smashed an egg. A stone that hits the hyena currently says the badger popped up, which is the wrong story.
3. Draw a short link between the two animals, only on squares this phone is allowed to see. Put the claw on you if you were caught. Do not show a landing the rules hide. Big moments can be the planned 1.5 to 2 second scenes, with a tap to skip. Ordinary moves stay about 1 second. At the start, show the mode line, clear it, then let the board be read. Do not also hide "whose turn" under that line.

## The first moments

These all appear together when play starts. Times are from the ostrich's phone.

The message bar is one slot, about 44 pixels tall. Whatever is newest covers the rest. A notice stays about 3 seconds, then the next one in line shows. A sniff line stays about 1.4 seconds. "Bird near" stays about 1.8 seconds. The default look does not slide an animal. It jumps. A stone's flight is about 0.7 seconds, then the hit. Sounds below are the ones the game asked to play.

### Classic (ostrich and vulture)

No clock and no animal chips. Calmer than the other modes, and still crowded on the ostrich's first turn.

| When | What is up at once |
|---|---|
| Play starts, for about 2.6 seconds | Header (rounds, eggs, hunger, stones, turn picture, buttons). Notice: "The vulture hunts eggs." That covers "Vulture's turn…". Board: three eggs with warmth numbers, both birds, leaves, rocks. Egg-place sounds just finished. |
| After 2.6 seconds | The mode line leaves. "Vulture's turn…" shows. |
| Vulture's first landing | "Egg nearby!" for about 1.4 seconds, plus eight dashed eggs around the vulture. |
| Ostrich's first turn | "Vulture sniffed an egg." The dashed eggs are still there, on top of the real eggs the ostrich already sees. Lit squares and a Walk button. |

Classic, the moment play starts, ostrich's phone. (`busy-2026-11-08/classic-start-blue.jpg`)

Classic, ostrich's first turn. The vulture's sniff is drawn on top of eggs the ostrich already knows. (`busy-2026-11-08/classic-t2-ostrich-turn.jpg`)

### 3 players

| When | What is up at once |
|---|---|
| Play starts, for about 2.6 seconds | Header, including a timer button. A row of three animals with catch marks. A clock bar. Notice: "The vulture hunts eggs. The hyena hunts birds." That covers "Vulture's turn…". Three eggs with numbers, the vulture, you, leaves, rocks. |
| After 2.6 seconds | The mode line leaves. The turn line shows. The clock keeps counting. |
| Hyena's first turn, nothing near | "Nothing near.", lit squares, a Stay button. No birds and no eggs. This screen is the calm one. The header, chips and clock are still there. |

3 players, play just started, ostrich's phone. The mode line, the clock, the animal row and the eggs are all up together. (`busy-2026-11-08/3p-start-blue.jpg`)

### Hunters, 2 vs 2, and 5 players

Same pile as 3 players, with these extras.

- Hunters: four animals in the chip row. The opening line names the hyena and the badger, and it covers the turn line for about 2.6 seconds. Clock is there.
- 2 vs 2: four animals, four eggs. Ostrich 1 also sees Ostrich 2's eggs (the dashed ones). Opening line: "The vultures hunt eggs." Clock is there.
- 5 players: the 2 vs 2 board, plus the hyena. Opening line names the vultures and the hyena. Clock is there.

Pictures: `5p-start-o1.jpg`, `2v2-start-o1.jpg`, `hunters-start-blue.jpg`, and the `t1`, `t2`, `t3` pictures for each mode.

## A catch, from the bird who was caught

3 players. The hyena lands on the ostrich. The ostrich flees. The hyena does not learn the new square. That part is right. The ostrich still does not read it as "I was caught."

The caught ostrich. The words say "Caught!" but not who did it. The claws are on the hyena, not on you. (`busy-2026-11-08/3p-catch-target-ostrich.jpg`)

On that phone, at the same time:

- Notice, about 3 seconds: "Caught! One more and you're out."
- In the same bar: "Hyena near!"
- Hint underneath, hidden while the notice shows: "Vulture's turn…"
- Header, animal chips, clock
- A pink box on you, and claw marks on the hyena's square
- A warn sound

The sentence does say "you're", but it never says the hyena caught you, and it never says you fled. The claws are on the other animal. Hunters mode and 5 players use the same sentence for the caught bird.

The hyena's own phone is clearer: "Caught the ostrich!" with claws on the hyena. "Bird near" is in the same bar, so the two lines cover each other. The ostrich is not shown on its new square.

The hyena who made the catch. The sentence is clear. The bird's landing is hidden, which is correct. (`busy-2026-11-08/3p-catch-doer-hyena.jpg`)

## Two animals, each phone

Classic has no hunters, so it has no catch, no kick of a hunter, no meeting and no burst. 2 vs 2 has no hunter. 5 players has one hunter, so it has no meeting and no burst.

"Clear" means a player can tell who did what to whom. A hidden square is correct when the rules hide it. The words still have to say who was involved.

| Interaction | Viewer | What they see | Clear or unclear | Picture |
|---|---|---|---|---|
| Catch, 3 players | Hyena, did it | "Caught the ostrich!" Claws on you. "Bird near" in the same bar. The bird's new square is hidden. A win sound. | Mostly clear | `3p-catch-doer-hyena.jpg` |
| Catch, 3 players | Ostrich, caught | "Caught! One more and you're out." Also "Hyena near!" Pink box on you. Claws on the hyena, not on you. | Unclear | `3p-catch-target-ostrich.jpg` |
| Catch, 3 players | Vulture, watching | "The hyena caught the ostrich." Also "Hyena near!" Both animals are on the board, with claws. | Mostly clear. Two lines at once. | `3p-catch-bystander-vulture.jpg` |
| Catch, Hunters | Hyena | Same as the 3-player hyena. | Mostly clear | `hunters-catch-doer-hyena.jpg` |
| Catch, Hunters | Ostrich | Same "Caught!" line, plus "Hyena near!" | Unclear | `hunters-catch-target-ostrich.jpg` |
| Catch, Hunters | Vulture | "The hyena caught the ostrich." Both animals visible. | Mostly clear | `hunters-catch-bystander-vulture.jpg` |
| Catch, Hunters | Badger, other hunter | "The hyena caught the ostrich." Also "Nothing near." No birds and no claws. The square is hidden, which is correct. | Words are clear. The board does not show it, on purpose. | `hunters-catch-bystander-badger.jpg` |
| Catch, 5 players | Hyena | "Caught the ostrich!" It does not say Ostrich 1 or Ostrich 2. Claws on you. | Mostly clear | `5p-catch-doer-hyena.jpg` |
| Catch, 5 players | Ostrich 1 | Same "Caught!" line, plus "Hyena near!" | Unclear | `5p-catch-target-o1.jpg` |
| Catch, 5 players | Vulture 1 | "The hyena caught the ostrich." Does not say which ostrich. Both ostriches are on the board. | Partly clear | `5p-catch-bystander-v1.jpg` |
| Kick, 3 players | Ostrich, did it | "Ostrich kicked the hyena 3 squares away." The hyena has left the screen, because the landing is too far. The square is hidden, which is correct. The sentence does not say "you kicked". | Partly clear | `3p-kick-doer-ostrich.jpg` |
| Kick, 3 players | Hyena, kicked | The same third-person sentence, plus "Bird near" and your own turn. | Unclear that it was you | `3p-kick-target-hyena.jpg` |
| Kick, 3 players | Vulture | The same sentence, and the hyena is visible. | Mostly clear | `3p-kick-bystander-vulture.jpg` |
| Kick, Hunters | Ostrich | Same sentence. Hyena not on the board (too far). | Partly clear | `hunters-kick-doer-ostrich.jpg` |
| Kick, Hunters | Hyena | Same sentence, plus "Bird near." | Unclear that it was you | `hunters-kick-target-hyena.jpg` |
| Kick, Hunters | Vulture | Same sentence, hyena visible. | Mostly clear | `hunters-kick-bystander-vulture.jpg` |
| Kick, Hunters | Badger | Same sentence. No birds. The kick is out of sight. | Words only | `hunters-kick-bystander-badger.jpg` |
| Kick, 5 players | Ostrich 1 | "Ostrich kicked the hyena 3 squares away." Does not say which ostrich. The hyena is off the ostrich's board. | Partly clear | `5p-kick-doer-o1.jpg` |
| Kick, 5 players | Hyena | Same sentence. No "you". | Unclear | `5p-kick-target-hyena.jpg` |
| Kick, 5 players | Vulture 1 | Same sentence. Hyena not in sight. | Words only | `5p-kick-bystander-v1.jpg` |
| Stone hits a hunter, 3 players | Vulture | Hint says "Miss." Notice says the badger popped up. That is the wrong event. A whoosh plays. The hyena is no longer in sight. | Unclear, and the words are wrong | `3p-stone-hunter-doer-vulture.jpg` |
| Stone hits a hunter, 3 players | Hyena | "Badger popped up!" An X on the square you left. Stones went to 0. Nothing says a stone hit you. | Unclear, and the words are wrong | `3p-stone-hunter-target-hyena.jpg` |
| Stone hits a hunter, 3 players | Ostrich | Same wrong "popped up" line. Hint says "Missed." | Unclear | `3p-stone-hunter-bystander-ostrich.jpg` |
| Stone hits a hunter, Hunters | Vulture | No notice at all. A whoosh. Hint says "Miss." The hyena has left sight. | Unclear | `hunters-stone-hunter-doer-vulture.jpg` |
| Stone hits a hunter, Hunters | Hyena | Empty message bar. You have moved. No sentence. | Unclear | `hunters-stone-hunter-target-hyena.jpg` |
| Stone hits a hunter, Hunters | Ostrich | "Badger near!" which is a different fact. Hint says "Missed." | Unclear | `hunters-stone-hunter-bystander-ostrich.jpg` |
| Stone hits a hunter, 5 players | Vulture 1 | "Hyena near!" No stone sentence. | Unclear | `5p-stone-hunter-doer-v1.jpg` |
| Stone hits a hunter, 5 players | Hyena | Empty message bar. | Unclear | `5p-stone-hunter-target-hyena.jpg` |
| Stone hits a hunter, 5 players | Ostrich 1 | "Hyena near!" and "Missed." | Unclear | `5p-stone-hunter-bystander-o1.jpg` |
| Stone hits an egg, classic | Vulture | "Smashed!" Banner and hint. Whoosh. Does not say you smashed an egg. The egg count drops. | Partly clear | `classic-stone-egg-doer-vulture.jpg` |
| Stone hits an egg, classic | Ostrich | "Smashed!" One of your eggs is gone, so you can work it out. | Partly clear | `classic-stone-egg-target-ostrich.jpg` |
| Stone hits an egg, 3 players | Vulture | "Smashed!" | Partly clear | `3p-stone-egg-doer-vulture.jpg` |
| Stone hits an egg, 3 players | Ostrich | "Smashed!" plus "Hyena near!" in the same bar. | Partly clear, and busy | `3p-stone-egg-target-ostrich.jpg` |
| Stone hits an egg, 3 players | Hyena | No sentence. Egg count drops. An X appears. Tapping the X says "Smashed." | Unclear | `3p-stone-egg-bystander-hyena.jpg` |
| Stone hits an egg, Hunters | Vulture, ostrich, hyena | Same pattern as 3 players. The hyena gets no sentence. | Same | `hunters-stone-egg-*.jpg` |
| Stone hits an egg, 2 vs 2 | Vulture 1, Ostrich 1, Vulture 2 | All three see "Smashed!" The ostrich can see which egg went. | Partly clear | `2v2-stone-egg-*.jpg` |
| Stone hits an egg, 5 players | Vulture 1 and Ostrich 1 | "Smashed!" | Partly clear | `5p-stone-egg-doer-v1.jpg` |
| Stone hits an egg, 5 players | Hyena | No sentence. Count drops. | Unclear | `5p-stone-egg-bystander-hyena.jpg` |
| Hunters meet | Hyena, did it | "Hyena shoved the badger." Both hunters are on the board. Does not say "you". | Mostly clear | `hunters-meeting-doer-hyena.jpg` |
| Hunters meet | Badger, shoved | Same sentence, plus "Nothing near." Both hunters visible. | Partly clear | `hunters-meeting-target-badger.jpg` |
| Hunters meet | Ostrich, far away | Same sentence. Neither hunter is drawn, which is correct. | Words are clear. The board does not show a place, on purpose. | `hunters-meeting-bystander-ostrich.jpg` |
| Badger bursts | Badger, hyena, and ostrich | In these pictures the bar still says the badger dug in, because that line holds the bar for 3 seconds and the burst was the very next moment. The burst sentence itself names both animals and how far the hyena was shoved. In a normal game the dig and the burst are turns apart, so the burst line would have the bar to itself. Two big events inside those 3 seconds will still cover each other. | Clear once the line shows. Covered if another notice is still up. | `hunters-burst-*.jpg` |
| Stone kicked back, classic | Vulture | "The ostrich kicked the stone right back!" Hint also says "Bounced! No egg." Whoosh, then a feather sound. | Clear | `classic-kickback-doer-vulture.jpg` |
| Stone kicked back, classic | Ostrich | Same notice. Hint says "Kicked it back!" | Clear | `classic-kickback-target-ostrich.jpg` |
| Stone kicked back, 3 players | Vulture and ostrich | Same clear sentence. | Clear | `3p-kickback-doer-vulture.jpg` |
| Stone kicked back, 3 players | Hyena | Hears the sentence. Does not see the birds if they are far, which is correct. | Words are clear | `3p-kickback-bystander-hyena.jpg` |
| Stone kicked back, Hunters, 2 vs 2, 5 players | The two birds, and a hunter if there is one | Same sentence on every phone we checked. | Clear for the birds. The hunter gets the words and not a hidden square. | `hunters-kickback-*.jpg`, `2v2-kickback-*.jpg`, `5p-kickback-*.jpg` |

A stone hits the hyena. The phone says the badger popped up. (`busy-2026-11-08/3p-stone-hunter-target-hyena.jpg`)

## How to space it

At the start, show the mode line by itself for about 2 seconds, then remove it so "whose turn" can be read. Do not put the clock, the catch chips and the mode line on top of the first move hint.

For a catch, kick, stone, meeting or burst: one sentence, about a second, naming both animals and saying "you" on the phone it happened to. Then, if this phone may see both squares, a short highlight between them. If it may not see a square, leave that square off and do not say where it is. The planned cut-scenes (1.5 to 2 seconds, tap to skip) fit the catch, the knock-out, the smash, the burst and the kicked-back stone. Ordinary steps stay about 1 second.

Do not play a second pop ("Bird near", "Hyena near") in the same bar during that second. One sound, not a stack. The caught bird should get the warn sound with the "you were caught" line, and nothing else until that line has been up long enough to read.

## Update 2026-11-08
Brian decided: a caught bird's square gets no mark on the board. Catches show only as lost hearts in the animal chip row above the board. Earlier notes in this audit that put claws or a pink box on a square are superseded.
