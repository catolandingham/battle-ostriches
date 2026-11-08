# Battle Ostriches handover, 2026-11-08

Written by Claude (Claude Code, the session that worked the game from 2026-11-07 to 2026-11-08) for the next builder, a Grok bot. `main` in this repo is the truth for code and docs. It covers where everything lives, the rules as they stand, how the design decisions were reached, and every comment Brian has made about this game: in the two Claude chats, in the uploaded playtest recordings, and in the earlier Grok thread. Each comment has a status: **done** (on the live site), **in PR #18** (built, waiting for Brian's yes), **decided** (agreed, not built), **open** (not settled or not built).

Brian Howe is the designer and playtester, not a programmer. He plays with his family (Michelle, his son Elliot, friends) on phones.

---

## 1. Where everything lives

### 1.1 Code and the live site

- **Repository:** `github.com/catolandingham/battle-ostriches` (private). Node + `ws` server.
  - `server.js`: the server.
  - Rules: `game.js` (classic and shared rules, `CONFIG` with every tuning number), `three.js` (3 players), `hunt.js` (Hunters mode), `team.js` (2 vs 2 and 2 vs 2 + hunter), `lobby.js` (rooms).
  - Computer players: `ai.js`, `huntai.js`, `teamai.js`.
  - Simulators: `sim.js`, `sim3.js`, `simhunt.js`, `simteam.js`.
  - Phone client: `public/`. Key files:
    - `ui.js`: the board, buttons, the How to play pictures
    - `three-ui.js`: the corner marks, animal art, announcements
    - `nextstep.js`: the next-step cue
    - `badgerlines.js`: the honey badger quotes
    - `catchtext.js`: the catch and knock-out lines
    - `roles.js`: the role cards
    - `part1.css`, `signals.css`: the marks and lit squares
    - `theme.js`, `themes*.css`: the 13 themes
- **Live site:** `https://ostriches.onrender.com`, health check at `/healthz`. It runs on Render's free plan and deploys automatically from `main`. Every deploy restarts the server, and a restart wipes every room. **Never merge while a family game is going.**
- **Branches and pull requests:**
  - `main` is live, at PR #17 (merged 2026-11-07, about 17:23 PT).
  - **PR #18** (`ux-part1-next-step`) is open, not merged, waiting on Brian's yes. It holds:
    - part 1 of the cold-player fixes
    - the "one look per meaning" marks
    - the new icons from 2026-11-08: the plain-line bird, the dirt-pile dig-in mark, the face-on striped badger and the paintbrush theme button

    https://github.com/catolandingham/battle-ostriches/pull/18
- **Tests:**
  - `npm test` runs every suite: 16 unit suites and 26 Playwright phone suites at 390x664 in WebKit. Logs go to `shots/test-logs/`.
  - `npm run setup:e2e` installs WebKit once.
  - `node tests/run-all.js <name>` runs one group.
  - `e2e-consistency.js` plays 13 full games and takes about 10 minutes.
  - `tools/shots-real-play.js` takes phone screenshots from real play, and `tools/icon-tests/` draws candidate icons at real size (see section 7).
  - PR #18 with the 2026-11-08 icons (commit 251fa8e) passed 41 of 42 on 2026-11-08. The one failure, `e2e-stone.js`, is a known flaky test that reads the board mid-redraw, and it passed when rerun alone.
- **The Grok thread archive** lives in the other repo, `catolandingham/space-snack-quest`:
  - `docs/grok-archive/ostrich-thread.md` and the `ostrich-project-*.md` files
  - `docs/FEEDBACK-INDEX.md` section D (Brian's 38 asks, D1 to D38)

### 1.2 Project documents in this repo

Everything the handover mentions is in this repo under `docs/`. Brian keeps his master copies of `STATE.md` and `DECISIONS.md` on his Google Drive (`My Drive/Battle Ostriches/`). The files in `docs/project/` are dated snapshots of those masters taken 2026-11-08. Whenever something changes, tell Brian what to add to his Drive copies.

| Repo path | What it is |
|---|---|
| `docs/HANDOVER-FOR-GROK-2026-11-08.md` | This file |
| `docs/project/STATE-2026-11-08.md` | Snapshot of the live state and open items |
| `docs/project/DECISIONS-2026-11-08.md` | Snapshot of every dated decision Brian made, with the reason. The most complete record of his choices |
| `docs/playtests/` | The five transcribed recordings (Nov 4 family play x4, Nov 6 Brian alone) |
| `docs/PLAN-2026-11-06.md` | The Nov 6 plan. Section 4 maps every playtest issue (55 + 1) and every Grok ask (38) to a fix |
| `docs/CODE-REVIEW-2026-11-06.md` | One-page code review |
| `docs/reviews/RULEBOOK-v2-2026-11-07.md` | **The rules, source of truth.** Section 12 states the design goals |
| `docs/reviews/RULEBOOK-v1-2026-11-07.md`, `RULES-DRAFT-2026-11-07.md`, `RULEBOOK-REVIEW-2026-11-07.md`, `RULEBOOK-v2-REVIEW-2026-11-07.md` | How the rules got there, including two fresh-eyes reviews |
| `docs/reviews/SIMULATIONS-2026-11-07.md` | Every simulation table (about 15 rounds) |
| `docs/reviews/CAUSE-AUDIT-2026-11-07.md` | Audit of every result that appeared without a visible cause |
| `docs/reviews/UX-WORDS-AND-VISUALS-2026-11-07.md` | The research-backed audit of every on-screen word and mark (top 10 built in PR #17) |
| `docs/reviews/COLD-AUDIT-FIXES-2026-11-07.md` | 15 ranked fixes from the cold-player audit, plus the walkthrough recommendation |
| `docs/reviews/cold-audit-notes/` | One note per cold-audit screenshot: the situation it shows. What the reviewers said is summarized in `COLD-AUDIT-FIXES-2026-11-07.md`. The 57 screenshots stay on Brian's Drive |
| `docs/reviews/part1c-shots/` | Current screens of PR #18, numbered in play order, with `CAPTIONS.txt` |
| `docs/reviews/move-style-playground.html` | The mockup Brian used to choose lit squares and corner marks |
| `docs/reviews/BW-THEME-MOCKUP-2026-11-08.png` + `bw-theme-mockup-2026-11-08.html` | The black-and-white theme mockup (the next build) |

Older screenshot sets (`part1-shots`, `part1b-shots`, `ux-shots`, the cold-audit images) stay on the Drive only. They show looks that have been replaced.

---

## 2. The rules as they stand

The full text is `docs/reviews/RULEBOOK-v2-2026-11-07.md`, with tuning numbers in `game.js` `CONFIG`. The design goal Brian set is: **every animal has one speed, one skill and its own way of seeing; everything else is universal.** He wants the rules understandable to a 10-year-old from a short role card. Every player still in must keep a way to win. No result may appear without a visible cause, and fun matters as much as fairness.

**Board and turns:**
- The board is 9 columns by 7 rows. Distance is king-move distance, so diagonals count as 1.
- It has two leaves (food) in opposite corners and two rock piles (stones) at the middle of the top and bottom edges.
- The game lasts 30 rounds.
- Game types:
  - Classic: vulture vs ostrich
  - 3 players: adds one hunter (hyena or honey badger)
  - Hunters: 4 players, both hunters
  - 2 vs 2: two vultures, two ostriches
  - 2 vs 2 + hunter: 5 players
- Computers can fill any seat.

**Universal rules:**
- Every animal moves up to 2 squares. An ostrich carrying an egg moves 1.
- You may pass over anything. No one may land on a wrecked square. A bird may not land on an animal it can see.
- **Your square works first.** When you land by your own move, your square acts before any catch (the ostrich eats or warms, the vulture refills, finds or sniffs).
- **A catch** happens when a hunter lands on a bird, or a bird lands on a hidden hunter.
  - The caught bird scrambles 2 squares in a random open direction.
  - The second catch on the same bird knocks it out. That's 2 catches for both hunters, for consistency (Brian).
  - Hunters never learn where a caught bird scrambled to.
  - An ostrich carrying an egg drops it when caught.
- **Pushes** (scramble 2, hunters meeting 2, stone on an occupied square 2, kick 3 or 2 for the badger):
  - A push stops before a wrecked square, the edge or an animal.
  - Being pushed is not a move.
  - The kick alone wraps around the board edge. Brian: "getting kicked across is fine, so long as we visualize it the right way."
- **Hunters meeting:** the hunter that moves onto the other pushes it 2 away. Nobody is caught. It's the same for both hunters (Brian: "whoever the aggressor is, the other one needs to bounce back").
- **Stones:**
  - The vulture holds at most 1 and refills by landing on a rock pile.
  - It throws at its own square or a square next to it (range 1).
  - A stone smashes a hidden egg, wrecks an empty ordinary square (nobody can ever land there again), and pushes an animal on that square 2.
  - A stone on a leaf or rock pile is used up harmlessly, with a silly line.
  - A stone thrown at the ostrich's square is **kicked back** onto the vulture's own square.
  - An ostrich standing on its egg protects it.

**Each animal:**
- **Ostrich:**
  - Walk 2. Carry 1 (the egg in its beak; a carried egg is not warmed).
  - Sit on an egg as long as it likes. Anyone who can see the ostrich sees it sitting, which in practice means the birds.
  - **Kick** an adjacent animal it can see: 3 squares, or 2 for the badger ("tough"). The ostrich stays put. It can't kick while carrying, and never kicks a buried badger or a teammate. The landing square is shown before confirming.
  - Must eat at least every 15 of its turns (or it starves).
  - Each egg must be stood or sat on at least once every 15 rounds (or it goes cold). Brian asked for round numbers, 15 and 15.
  - Eggs can never be hidden or put on or next to a leaf, or on a rock pile.
  - Sees both birds always, and hunters within 2 (except a buried badger).
- **Vulture:**
  - Fly 2.
  - **Sniff:** on landing by its own move, it learns yes or no whether an egg is on or next to its square.
  - **Find:** landing on a hidden egg reveals it.
  - One stone (see above). Sees as the ostrich does.
- **Hyena:**
  - Walk 2.
  - **Sense:** at the start of its turn, whether any bird is within 2. If yes, every square where a bird could be is marked.
  - **Pounce:** if it sensed a bird and its move did not catch, it senses again and may move 1 more. Only squares inside both readings are marked.
  - Sees birds only through its sense, and the other hunter within 2.
- **Honey badger:**
  - Walk 2. Same sense.
  - **Burrow:** stay still one turn to bury, on any square it can stand on, including a leaf or rock pile (Brian: "a nice bonus power"). While buried:
    - no bird can see it
    - it sees birds next to it exactly (ambush sight)
    - everyone is told "The honey badger dug in!"
    - birds that saw it dig see the spot
  - A bird landing on it is caught. A hyena landing on it shares the square. The badger may burst out under a hyena, pushing it 2.

**Endings, checked in order:**
1. A knocked-out bird loses (Brian: "if ostrich gets killed then they should lose").
2. All birds out: the hunter wins.
3. No egg left: the vulture side wins.
4. An egg alive after round 30: the ostrich side wins.
5. Time runs out with no goal met: a draw.

**Hunter goals** (from simulation, within Brian's go-ahead):
- 3 players: 3 catches in total (every side wins 27 to 39%).
- 2 vs 2 + hunter: one ostrich and one vulture knocked out (hunter 13 to 23%). Brian on the 18 and 19% result: "seems exactly right."
- Hunters mode: more knock-outs wins, then more catches, then a tie. Ties run about 17%, which is open. Brian is fine with rare ties and no sudden-death mode.

**Computer vulture:** uses only its latest sniff, the same information a person has (in PR #18). Normal level wins about 62% against the computer ostrich, unchanged by this. Easy level dropped from about 49% to 42%.

---

## 3. How the design thinking works (read this before changing anything)

These are Brian's rules for the look and the words, reached over two days. They're the reason behind most of PR #17 and PR #18.

1. **One-second read.** "Maybe someone has 1 second they're going to read." Show, don't tell; words are an afterthought; less is more.
2. **Never name a look in text.** Rules and cards say what a mark means, never "rose dots" or "yellow outline", because the look may change.
3. **One look per meaning, the same in all 13 themes,** and matching what people already know from other apps and games ("what humans have been trained on elsewhere"). Nothing corny.
4. **The board's visual language as of PR #18:**
   - **Lit (highlighted) square** = you can move here. In the current themes it's yellow, and yellow means nothing else.
   - **Small icon in the top-left corner of a square, dashed, unfilled** = may be here (the vulture's sniff shows dashed eggs).
   - **The same small icon filled white** = is here (a found egg, the ostrich's own eggs with their countdown number beside them, a dig-in spot the bird saw).
   - **The hunter's bird mark** is a plain-line side-view bird, not dashed. A dashed bird broke into a jumble at this size, and a hunter only ever sees "may be here" birds, so nothing can be confused with it (Brian chose this, "F", on 2026-11-08).
   - **The badger's dig-in spot** is a small white dirt pile with three pebbles ("Mound 2").
   - Animals stay full size in the middle of the square. Real estate is tight, so marks live in corners and never stack on the middle.
   - No egg mark ever goes where an egg can't be (rock piles, on or next to a leaf, wrecked squares).
5. **Show only screens a player would actually meet.** Brian, 2026-11-08: "Don't tell me a screen I can't see. Only show me screens that would actually be played." Mockups must match the rules exactly. For example, never show an egg farther away than a sniff could reach. Set up screenshot states the way real play reaches them, and present them in play order with one line each.
6. **Show options visually, at real size, before building.** Brian picks from pictures, not descriptions. When a choice is open, draw three or four different versions on the real tile colors. The inline widgets didn't render on his phone, so use a published page or PNG images.
7. **Cause before result.** Every catch, knock-out, push, smash, kick and cold egg is announced on every phone with its cause. Where it happened is shown only to players who can see that square.
8. **Approval:** every new on-screen line a player reads goes to Brian before merge. Nothing merges to `main` without his yes, and never during a family game.
9. **Consistency over special cases.** When a rule differs by animal, ask whether it should be universal. Brian has asked this many times.
10. **Simulate before building rules.** Each rules change went through the simulators (thousands of games per setup) and a logic pass ("if this, then that" for every rule). Then a fresh agent that hadn't seen the discussion reviewed the rulebook "Harvard Blue Book style", before any code was written.

---

## 4. Every comment from Brian, with where it landed

### 4.1 From the Nov 4 and Nov 6 recordings (`docs/playtests/`)

The Nov 6 plan (`docs/PLAN-2026-11-06.md` section 4a) lists all 56 issues with times, keyed P, M, R, I and A. As of 2026-11-08:

- **Done on the live site:**
  - **Home screen and setup:** play with friends or solo; no phone count; computers added on the room screen; theme in the gear; one gear menu; friends get the code at once and whoever joins sets the count; rematch with same or changed roles; late joiners added between games; host is no longer limited to ostrich or vulture; the first to pick a role gets it; the busy count screen is gone; the code comes first; the joiner seat picker is gone; the Timer on/off button. (M1 to M8, R1, R2, I1, I3 to I6, A1, A3, A4, A9, A17)
  - **During a game:** the read-only view after elimination; the HYENA NEAR and HONEY BADGER NEAR alerts; a dead ostrich no longer blocks a smash; the badger player can see its badger; "Burrow 1 out of 2" removed; computers fill open roles. (R6, R9, I13, I14, A7, A13, A14, A16)
- **Done through the Nov 7 tasks T0 to T7 (all merged):**
  - the game says when it picks your animal (P1, T7)
  - a role card for every animal (R4, A2, A5, I9, T1)
  - a catch says hurt or out, and why (R7, I12, T2)
  - your animal always marked YOU (I2, I8, T3)
  - the vulture is told where stones are (I11, A12, A19, T4)
  - a late friend joins the next game (M8, A11, T5)
  - the cause shown before the result (I10, T6)
- **Changed by later rules:**
  - R7 and A15 (catch counts): both hunters now need 2.
  - R8 (walking into a hunter counts as a catch): kept, and announced.
  - R3 and A5 (compass letters): removed.
  - R10 (hunter visibility): seen within 2 squares.
- **Won't do, by decision:**
  - I7: theme changes stay per phone.
  - A8: a new game needs new egg spots.
  - A18: Share sends the link instead of a typed code.
  - A21: badger speed stays 2, same as everyone.
- **Open:**
  - M9: Brian likes the animal art and dislikes the tan and brown board. This is now answered by the black-and-white theme below.
  - R5: one winner vs score by eggs. The plan recommended one winner plus "2 of 3 eggs saved" on the win screen. Not built.

### 4.2 From the Grok thread (FEEDBACK-INDEX section D, 38 asks)

Plan section 4b maps all 38. The ones that still matter:

- **D17, the far-off view of the island:** skipped for now (Brian, 2026-11-07: "skip far off view for now").
- **D24 and D33:** the action ring was dropped for bottom buttons (done).
- **D29, arrows toward birds:** dropped. Brian later asked to revisit direction hints, then decided against them and against footprints: "no direction hints… we leave out the tracks". Done.
- **D35, show only squares where a bird may be:** done, now shown as corner birds.
- **D36, never show a result without its cause:** done (T6, cause audit).
- **B5 (from the plan), rooms survive a restart via Render Key Value:** open. It needs Brian at a computer.
- **B7, the default theme:** open. Answered by the black-and-white theme becoming the default.
- Everything else is done or was process.

### 4.3 From the "Grok games code review" chat (2026-11-07), about this game

- "It's so bad. I just sent to start a game against computer, said I wanted to be honey badger and play 2 computers, and it immediately started game as ostrich." Fixed (T7 and the lobby fixes in PR #5).
- He asked for Battle Ostriches work to live in its own session and not the shared one. Done.
- Credit rules:
  - Stop launching new work when the weekly all-models pool passes 75%. Brian raised this to **80%** on 2026-11-08 for finishing this handover.
  - Stop when the Fable pool passes 90%.
  - Leave branches pushed and unmerged, and note it in STATE.md.
  - Brian, 2026-11-07: "I'd rather cut early and get some wins before we die."
- No browser-driven playtests by the agent. The automated phone tests are fine. Brian's own recordings decide how the game plays.
- Brian wanted to watch a playtest run in the pane. Noted, not set up.

### 4.4 From this chat, rules (2026-11-07)

All of these are in rulebook v2 and live, unless marked otherwise.

- **Honey badger boosts:**
  - Brian rejected a call that lures players ("would mess with the free will of the other players").
  - He chose **ambush sight only**: while buried, it sees anyone next to it and can leap out. "Just ambush sight." The leap is its normal move.
  - Done.
- **Badger quotes** (done, `badgerlines.js`). Brian picked these lines, to play whenever the badger does anything other than a basic move:
  - "Honey badger don't care."
  - "Look at it run in slow-motion, it's pretty badass."
  - "Eww, it's eating a snake? Oh, it's disgusting."
  - "Nothing can stop the honey badger when it's hungry."
  - the Guinness "most fearless animal" line
  - "Look at this nasty badass."
  - "Thanks for the treat, stupid birds!" (when a bird walks onto the burrow)

  Special cases:
  - The jackal line followed by "doesn't give a #$%!" plays only when the badger gets the jackal, which in the game is moving onto the hyena.
  - When the ostrich kicks the badger: "Ouch. I mean... honey badger don't care."
  - The swear became a grawlix ("#$%!"). "Stupid birds" stays.
- **Hunters hunting each other:** no catches between hunters. They meet and push, which is consistent for both. Brian wanted the hyena-and-badger interaction made more obvious ("it's confusing when something happens, we don't really know that it happened or why"). This led to the cause audit (done).
- **Hunters getting eggs** (Michelle's idea): not adopted. Elliot's point was that hunters smashing eggs would help the vulture. Teams were "too complicated". The ostrich got a kick instead.
- **Ostrich kick** ("We want the kick for sure!!"):
  - no kick while carrying
  - the ostrich stays put on its square
  - no rest after a kick
  - kick pushes 3, the badger only 2 ("tough")
  - the ostrich sitting on its egg and kicking away anything that comes near is fine and visible to the birds, so the vulture can stone it, with the food rule as the natural limit
  - kicked across the board (wrap) is fine "so long as we visualize it the right way". Open: an arrow at the edge.
- **Pounce:** two-step, with the overlap shown automatically ("it automatically shows the overlapping squares… so you kind of know, oh, they're likely within one of these spaces"). Done. As of PR #18, only the overlap is marked.
- **Direction hints and footprints:** Brian raised them, then dropped them: "I wonder if we're prematurely optimizing… no direction hints… we leave out the tracks." The "weaker direction hit" idea was rejected as confusing.
- **Wrecked squares:**
  - Nobody can land on one ("rock grenades… so destroyed").
  - Walkers can pass over them.
  - No eggs or burrows go on them.
  - An animal on a square that gets wrecked is pushed.
  - The vulture boxing in the ostrich was a strategy to test (simulated, acceptable).
- **Carried eggs:** "A carried egg shouldn't stay warm." Brian also said "cools twice as fast… we just need to make sure that's really obvious". The rulebook has the carried egg not warmed, with its countdown still running.
  - Open: showing a carried egg cooling. Its look is still the old colored egg and ring.
- **Food and warmth:** round numbers, every 15 turns each. Done. "We could theoretically move food and eggs for ostriches if need be." Not needed so far.
- **Hidden speed-up:** removed as too confusing (done).
- **The badger burrowed on a leaf or rock pile:** allowed as a bonus, as long as it isn't unfair. Brian's concern: "the ostrich still gets the food and the badger doesn't just click to kill it next time." Solved by three rules:
  - your square works first
  - a caught bird scrambles in a random direction
  - hunters never see where it went
- **A bird skipping its next turn after a catch:** rejected ("seems like it could be attacked twice?").
- **"A pushed animal doesn't eat, find, refill or catch where it lands":** kept after Brian asked for every if-then to be worked through.
- **A stone at the ostrich:** kicked back like a soccer ball. If the vulture stands on a leaf or rock pile, the stone bounces on one more square. Brian liked it as an Easter egg.
- **A stone on an empty leaf or rock pile:** lands harmlessly with a silly line.
- **Hunters see each other within 2** (kept). A stone landing on a buried badger brings it up.
- **Endings:**
  - A knocked-out ostrich loses ("if ostrich gets killed then they should lose"). His first idea, "greater love hath no bird", was reversed.
  - Every player must have a way to win.
  - Ties are fine if rare. No sudden death.
- **Process:** Brian asked twice to "pause, read back through everything" and have a fresh agent review the whole rulebook. That was done twice (both reviews are in `docs/reviews/`).

### 4.5 From this chat, words and look (2026-11-08)

- Don't name looks in rules. "Others can see you sitting" was wrong. The decision: anyone who can see the ostrich (in practice the birds), with an eye icon on Sit.
- The kick tip was too wordy ("may stop early" was confusing). It became a picture: targets glow and an arrow shows where each lands. Done in PR #17.
- Fog of war for birds (soft dimming beyond 2 squares) is done.
- **"Did you actually utilize the frameworks?"** Yes. The audit applied:
  - Norman's gulfs (signifiers, feedback, mapping)
  - Nielsen's 10 usability rules
  - reading-speed research
  - game-UX practice (Hodent)
  - WCAG contrast
  - chess-app move highlighting
  - a cognitive walkthrough

  These are in the audit files.
- **"How many spaces can the hyena move?"** 2. **"How many squares can the vulture throw?"** 1.
- **"What happened to the earlier tutorials?"** Open, and planned as part 2: a short picture walkthrough per role (3 to 4 screens, one line each, skippable, shown at first play, replayable from "?"). Brian: "we'll just rely on the tutorial."
- **The friend's confusing test game** (2026-11-08). The friend:
  - was confused by egg outlines versus found eggs (both yellow)
  - found being kicked across the board odd
  - didn't know the vulture needs a new stone after each throw
  - didn't know how far the hyena sees
  - didn't know to throw the stone at the egg
  - couldn't tell when standing on an egg

  This led to the cold-player audit and fixes 1 to 5 (PR #18). Fixes 6 to 10 are part 2.
- **Move squares:** the dashed areas and yellow dots were "so confusing… starting with yellow dots everywhere, what does that mean?" Brian rejected the first mockups because they didn't match the rules. He chose:
  - lit squares for moves ("originally the boxes you could move to were highlighted")
  - "may be here" as a small icon in the corner of the square
  - no memory of past sniffs ("We're definitely not adding remembering sniffs"), so only the latest sniff shows
  - the computer vulture also keeps only its latest sniff

  In PR #18.
- **The Pounce screen with yellow and white ducks:** "no idea" what the difference was. The second tier was dropped, so only the overlap shows (PR #18).
- **Dashed for "may be here", filled white for "is here",** at the same small size: Brian's idea, in PR #18.
- **Icons** (2026-11-08, all in PR #18 except where noted):
  - Bird: the plain-line side-view bird "F". Brian didn't like the round bird and needed several versions to be convinced.
  - Badger dig-in spot: the dirt pile "Mound 2". Claws were liked, then skipped for now.
  - Badger art: "I really don't like badger icon at all." Now the face-on striped badger "C2, grumpy" (bold stripes, angry brows) everywhere, including the top bar.
  - Theme button: was a half black, half white circle that "doesn't make sense". Now a paintbrush (Brian picked it over a palette and colored dots).
  - Claws for the other hunter: Brian floated it and then said "skip claws for now". Open, low priority.
- **The black-and-white theme:** "one version that is just very classic black and white and as simple icons as possible, like Visualize Value (Jack Butcher) would design", for the full board, **made the core (default) theme**. Brian: "Mockup now, build Nov 13."
  - The mockup shows three real-play screens (ostrich, vulture, hyena) with:
    - thin white line icons on black
    - lit squares as white-outlined grey
    - dashed and filled corner marks in white
  - It's in `docs/reviews/BW-THEME-MOCKUP-2026-11-08.png` and `bw-theme-mockup-2026-11-08.html`.
  - Not yet reviewed by Brian, not built.

---

## 5. What is open, in order

1. **PR #18:** re-run `npm test` after the 2026-11-08 icon changes, show Brian, merge on his yes when no one is playing, then check the live site (`/healthz` and the served files match `main`).
2. **The black-and-white theme, the next build** (Brian wants this first):
   - Get Brian's reaction to the mockup.
   - Build it as a theme, using the same visual rules (lit = move, dashed corner = may be here, filled corner = is here).
   - Make it the default.
   - Check that every mark reads on it.
3. **Part 2 of the cold-player fixes** (fixes 6 to 10 in `docs/reviews/COLD-AUDIT-FIXES-2026-11-07.md`), plus a short picture walkthrough per role.
4. **Leftovers:**
   - the kick hint shown only at first use
   - an arrow at the edge for a wrap-around kick
   - end-screen and lobby wording
   - the YOU tag overlapping the egg number
   - letting a caught bird's player choose where to scramble (first version is random)
   - the carried egg's look (show it cooling)
   - a rule question: should a bird that saw the dig still be allowed to step onto the burrow? Today it can, and gets caught.
   - the Hunters mode tie rate of about 17%
   - "2 of 3 eggs saved" on the ostrich's win screen
   - rooms surviving a restart (Render Key Value, needs Brian at a computer)
   - the far-off island view (skipped)
5. **Skipped for now:** claws for hunters.

---

## 6. How to work with Brian on this game

- Lead with what changed and what it means for a player. Give the reason before any ask. Plain words, no jargon.
- Show pictures from real play, at phone size, in play order, with one plain line each. For open choices, show three or four versions.
- Ask one decision at a time, with your recommendation first.
- Every on-screen line a player will read goes to Brian before merge.
- Nothing merges without his yes. Never merge during a family game (a deploy wipes rooms).
- When state changes or Brian decides something, write a dated line for his Drive `STATE.md` and `DECISIONS.md` and hand it to him. The repo snapshots are not updated.
- Watch the credit pool. Brian would rather stop early with things pushed than run out mid-change.

---

## 7. Lessons from testing (added 2026-11-08)

### 7.1 Two tools for the way Brian reviews looks

- **`tools/shots-real-play.js`** takes phone-size screenshots (390x664, classic theme) of real game moments, in the order a player meets them.
  - Run `node tools/shots-real-play.js <out-folder> [vulture,ostrich,hyena,badger,howto]`.
  - It starts the server on port 4172 and plays real turns through the game rules, so every screen is one a player could reach.
  - Server settings it uses: `BO_NOSTORE` (no saving), `BO_BOTMS` (slow computers), `BO_CLOCKMS` (long turn timer), `BO_H3START` and `BO_H4START` (hunters' start squares).
  - It also sets browser storage keys so the tutorial, role card and tips stay closed: `bo_hs_off`, `bo_tut_seen`, `bo_card_off`, `bo_walk_*`, `bo_tips_off`, `bo_muted`, `bo_cs_*`.
  - Set up a hyena or Pounce moment the way real play reaches it. For example, the hyena walks 2 squares before the Pounce screen. A hyena that moves 1 square marks nearly every square and misleads.
  - Add a new sequence for each new screen Brian needs to see, such as each theme.
- **`tools/icon-tests/`** draws candidate icons at their true size on four tile colors, including a lit square.
  - `birds.html` holds the bird and mound options Brian chose from.
  - `faces.html` holds the badger faces.
  - Render with `node tools/icon-tests/shot.js birds.html out.png`.
  - Copy a page to compare new options.

### 7.2 How the tests behave

- Three suites sometimes fail on timing, then pass when rerun alone:
  - `e2e-stone.js` reads the board in the middle of a redraw
  - `e2e-consistency.js` has a tap land while the board is briefly locked for an animation (the game drops such taps on purpose)
  - the hunter suites
- Rerun a failed suite alone with `node tests/run-all.js <name>` before treating it as real, and say so in the PR.
- Never run two test suites at the same time: they clash over ports.
- `npm test` points Playwright at the project's own WebKit (`node_modules/.pw-browsers`). A phone test or tool run directly needs the same `PLAYWRIGHT_BROWSERS_PATH`. Both tools above set it.
- Macs have no `timeout` command. A script that uses it fails without saying why.
- Never use `git stash` while more than one worktree is open. The stash list is shared across worktrees, and on 2026-11-07 two stashes got swapped.

### 7.3 What the icon work showed

- Dashing works only on very simple shapes, like the egg oval. A detailed shape (a bird, a badger) breaks into a jumble at board size, about 17 pixels. That's why the hunter's bird is a plain line.
- A dashed mark stays crisp on every tile, lit yellow included, only when drawn as a white dash over a slightly longer dark dash.
- Faces read better than side views at this size. The striped badger face won over every side view.
- Brian reviews on his phone. Inline chat previews and HTML files don't open there. Send PNG images or a published page.
- The game's sound doesn't play in the Brave browser unless Brave Shields are turned off for the site. Brian found this with the other game, and it applies here too.

### 7.4 Small issues noticed and not yet fixed

- The ostrich's screen shows the vulture's dashed "egg may be here" marks. The ostrich already knows where its eggs are, so these likely confuse it. Ask Brian whether the ostrich should see them.
- Eggs the ostrich is not standing on no longer show their warmth color, only the countdown number. The ring around the ostrich's own square still shows it.
- On a found egg, the throw target still partly hides the vulture.
- A bird that saw the badger dig in can still step onto the burrow (it's lit as a move) and gets caught. This is the current rule. Ask Brian whether it should stay.
