# Battle Ostriches: cold audit, ranked fix list (2026-11-07)

**What this is.** Four cold reviewers, each playing a first-time player who gives a screen about one second, answered five questions per screenshot (goal, next action, what just happened, what each mark means, what confused them). They saw only the screenshots. This report compares their answers with the true situation recorded for each screenshot, groups the mismatches into root causes, maps Brian's friend playtest from today onto those causes, and ranks the fixes.

**Sources.** Reviewer answers: `answers-vulture.md`, `answers-ostrich.md`, `answers-hunters.md`, `answers-howto.md` (session scratchpad). True situations and screenshots: `cold-audit-2026-11-07/` in this folder. Rules: `RULEBOOK-v2-2026-11-07.md`. Earlier principles: `UX-WORDS-AND-VISUALS-2026-11-07.md`. Friend playtest: Brian's notes, 2026-11-07. I looked at 21 of the screenshots directly to check the reviewers' claims; the rest are taken from the reviewer answers and the situation lines.

**The short version.** A new player can usually read the goal from the role card. What fails is the step after that: the board rarely shows the one thing to do next, it often hides the player's own square, and several things happen with no visible cause. Every one of the friend's six confusions shows up in the cold reviews too, so these are not one person's quirks.

---

## 1. Where the reviewers' reading differed from what was really happening

Codes in the last column point to the root causes in section 2. Screenshots read correctly in full are listed at the end of each table. Items marked *artifact* come from how the audit script set up the shot, not from the game.

### 1.1 Vulture

| Shot | True situation | What the reviewer took from it | Mismatch | Cause |
|---|---|---|---|---|
| vul-01 | Role card, round 1. Leaf 15 is the ostrich's hunger; 1/1 is the vulture's stone; the cyan piece is the ostrich. | Leaf "maybe lives or energy"; 1/1 "1 of 1?"; gold dots "coins"; cyan piece "maybe the other player". "Sniffs" means nothing. | Header shows another player's counter; stone not tied to rocks; opponent not identified; card hides the board it describes. | R8, R12 |
| vul-02 | Fly mode, gold dots are fly squares. | Dots are fly squares (best guess), "could also be eggs or coins, there are 25 of them". Fly's check mark "maybe I already did it". | Move dot reads as a pickup; selected button reads as done. | R3, R10 |
| vul-03a | Landed next to a hidden egg; sniff said yes. | Egg is near, "but in which green square?" Same message shown twice. Cannot tell what the ostrich does. | Double message over the board; opponent's turn invisible. | R1, R6 |
| vul-03b | Maybe-egg marks on the 8 squares around; egg really on one of them. | Right guess, but "now there are two kinds of gold dots and I don't know the difference". | Maybe-egg mark merges with the fly dot on the same square. | R3, R4 |
| vul-04 | Standing on a found egg with a stone; must throw at its own square. | Gets it only from the hint text; "Throw on your own square sounds odd"; "It stays found until moved: moved by whom?" Banner and tip bar push the top row off. | No target on the egg; the egg is a small icon beside the YOU tag; text carries the whole instruction. | R5, R2, R1, R11 |
| vul-05 | Script threw at an empty neighbour square (miss). | "Why was my square a hit and the next one a miss?" "Nobody can land here: does that include me?" | Throw has no visible path; wrecked rule unclear. Choice of square is an *artifact*. | R6, R11 |
| vul-06 | On the found egg, no stone; nearest rock pile is close. | Correctly: get a stone. Worried that leaving loses the egg ("stays found until moved"). | The tip line makes the found egg feel fragile. | R11, R5 |
| vul-07 | Flew off the egg; no stone; rocks 3 away. | "Neither rock is in my range, how many turns?" The found egg is "faint, I may have lost it". | No route to the rocks; found egg drawn under a fly dot. | R5, R3 |
| vul-07b | Landed on rocks, stone refilled, new sniff yes. | "I can only see one row of the board." "Dotted ring vs solid egg: what's the difference?" Cannot find own piece. | Two banners cover the board and the vulture; maybe-egg and found egg too alike. | R1, R4 |
| vul-08 | Throw mode; crosshairs on own square and neighbours. | Understood the crosshairs. "My own square's target is under the YOU tag, I might tap the neighbour." "Found egg! is old news." | Own-square target hidden; stale banner covers the top row. | R2, R1 |
| vul-09 | Smashed the egg. | Read correctly. Rounds jumped 25 to 23. | Rounds jump is an *artifact*. | none |
| vul-10 | Won by round 9; counter shows 22. | "By round 9 doesn't match the counter." | Header counts rounds left, end screen counts rounds played. | R8 |

Read correctly: vul-02b, vul-04a (apart from "I can't tell what the ostrich does", R6).

### 1.2 Ostrich

| Shot | True situation | What the reviewer took from it | Mismatch | Cause |
|---|---|---|---|---|
| ost-01 | Role card. 1/1 is the vulture's stone. | Stone "maybe ammo"; "every 15 rounds" vs "every 15 turns", are they different? Red rings behind the card unknown. | Another player's counter in the header; two words for one clock. | R8, R12 |
| ost-02a | Setup; the dark bird in the middle is the vulture. | "Is the dark bird me or the enemy?" | Opponent not identified. | R3 |
| ost-02c | All 3 eggs hidden; pick a start square. | "Where did my eggs go? Hidden on purpose or lost?" | Own eggs not drawn during the start pick; every square shows the same dot. | R3 |
| ost-03 | Vulture flew and smelled nothing; its checked squares are hatched. | Hatched area is "the vulture's range or danger zone". Eggs whose number is covered by a move dot look like a different thing from eggs that show a number. | "Checked, empty" has a look nobody can read; move dots hide egg numbers. | R4, R3 |
| ost-03b | Move dots on reachable squares. | "No highlights show where I can go." | The dot already meant "hide egg here" and "start here" in setup, so it no longer reads as "move". | R3 |
| ost-04 | Standing on its own egg (which already warms it). | Ring under YOU unreadable; "is standing the same as sitting?" | Own square hides the egg and its number. | R2, R11 |
| ost-05 | Sat on the egg; the vulture can now see the ostrich is sitting. | "Is that a penalty? Did sitting help? Mine is unreadable." | Cost is shown in words; the benefit (ring refilled) is hidden under the bird. | R2 |
| ost-06a | Carry tapped; dots show where the egg can go. | "Carry looks greyed out, which means unavailable." | Selected button looks disabled. | R10 |
| ost-07 | Hungry, leaf 3 away. Dashed rings on two squares toward the leaf. | Guessed the dashed rings are reach. Bottom row cut off. | Unlabelled extra mark; board cut off by tip bar. | R3, R1 |
| ost-07b | Ate the leaf. | "Where am I? I can't see YOU." | Banner covers the ostrich. | R1 |
| ost-08 | One egg has 6 rounds left and is urgent; two are freshly warmed (15). | Found the urgent one from the hint, but the urgent egg looks calm (pale, small badge, no ring) while the safe eggs wear the alarm-looking ring. X tile: "where I kicked something?" | Warmth look reads backwards; wrecked square has no history. | R9, R6 |
| ost-09 | Vulture landed next to an egg and smelled it. | Read the zone right, but "does it know the exact square?" The notice is in good-news green. | Bad news to the ostrich shown in the good-news look. | R9, R4 |
| ost-10 | Vulture threw at the ostrich; the stone was kicked back; the vulture's stone is now 0/1. | "I used my stone?" "Who has the stone?" "NO EGG" tag (clipped to "NO E") unexplained. "Why did the ostrich kick without me pressing?" | Header stone belongs to the vulture; the bounce has no visible path; tag cut off. | R8, R6, R1 |
| ost-11 | Kick preview; the push wraps off the left edge to the right side. | "The arrow points left but the dots are on my right." | Wrap path not drawn. | R6 |
| ost-11a | Vulture next to the ostrich, Kick available. | Fine on Kick; rings with no number unclear. | Move dots cover egg numbers. | R3 |
| ost-12 | Vulture kicked 3 squares, wrapped to the far right. | "It says 3 squares, it's 5 to the right. I'd not have known the board wraps." | Kick teleports with no motion. | R6 |
| ost-13 | Won. | Read correctly; "egg(s)". | Minor wording. | R11 |

Read correctly: ost-02b, ost-06 (the carry itself was shown out of order, an *artifact*).

### 1.3 Hyena and badger

| Shot | True situation | What the reviewer took from it | Mismatch | Cause |
|---|---|---|---|---|
| hye-01 | Role card. Hunter needs 3 catches across both birds; each bird is out after 2. | Toast covers the card title. "3 catches but the ostrich chip has 2 circles." Chip "1" unknown. ROUNDS number clipped. | Text over the card; goal and pips don't add up visibly; unlabelled number. | R1, R8 |
| hye-02 | Nothing within 2. | "How far is near?" Message shown twice. | Sense range invisible. | R7, R1 |
| hye-03, 03b | Ostrich 2 away; bird-may-be-here area marked. | "Dots and outline cover the same squares, I can't separate them." Bottom of the area cut off by the tip bar. "Tap a square to see what it is" is scary because tapping moves. | Area and move dots coincide; board cut off; tip contradicts the controls. | R3, R1, R11 |
| hye-04 | Pounce: one more square. | Two outlines (dashed strip and solid box) not understood. "Does Stop give up the bird?" "Still near." covers YOU. | Two readings shown as two shapes; Stop unclear; pop covers own piece. | R3, R10, R1 |
| hye-05 | Caught the ostrich; it scrambled 2 away, unseen. | "Where did the ostrich go? Why does my chip not show I scored?" | No visible scramble; hunter's own catch count not shown. | R6, R8 |
| hye-06 | Kicked 3 west, wrapped to the right side. | "I think the board wraps, but I'm only guessing. Why was I kicked?" | Teleport with no motion or source. | R6 |
| hye-06a | Ostrich next to the hyena, unseen. | Cannot see the ostrich (correct) but nothing shows what it can see. Position jump from 05 is an *artifact*. | Sight limit invisible. | R7 |
| bad-00 | Ostrich card, 3 players. | "Rounds vs turns", title covered by toast. | Two words for one clock; text over the card. | R12, R1 |
| bad-01 | Badger card. | "Stay still: a button or tapping my own square?" | Burrow control not shown on the card. | R10, R12 |
| bad-02 | Badger dug in. | Trivia box and toast overlap; BURROWED label clipped. | Text over board. | R1 |
| bad-02a | Bird within 2; badger can Burrow. | Dots and outline the same squares again. | Area and move dots coincide. | R3 |
| bad-03 | Ostrich phone: badger dug in where the ostrich saw it. | "If it's hidden, why can I see it?" | Last-known spot drawn exactly like a present animal. | R4 |
| bad-04, 04b | Buried badger, ostrich diagonally next to it (seen exactly). | Spotted the small bird icon under a move dot, "almost missed it". "Does Stay keep me hidden or attack?" | No act-on ring on the bird; move dot on top of it; Stay ambiguous. | R5, R3, R10 |
| bad-05 | Badger moved out without a catch. | "I didn't choose to pop up." "Badger popped up! reads like someone else." | Third-person line on the badger's own phone; leaving the burrow has no warning look. | R11, R6 |
| bad-05b | Ostrich phone: badger came up 2 away, now seen. | "Why does Badger near! appear only now when I saw the mound the whole time?" | Last-known mound vs present badger not distinguished; sight range invisible. | R4, R7 |

Read correctly: hye-02b.

### 1.4 Welcome, home, How to play

| Shot | True situation | What the reviewer took from it | Mismatch | Cause |
|---|---|---|---|---|
| misc-00 | One welcome card. | "Skip and Back with only one page are odd"; rules reachable only by a small link. | No picture of the game before play. | R12 |
| misc-01, 02 | Home and menu. | "Outwit the hunters" vs "vulture": same thing? Play modes unexplained. | Naming drift. | R11 |
| how-01 to 03 | How to play opens centered and its top is cut off and cannot be scrolled to. | Started mid-page; never saw the heading or first Ostrich lines. All words, no board picture; badger and "teammate" never introduced. "Both birds always see each other" vs "a sitting ostrich is seen". | Page cut off; reference is a wall of rules. how-02 and how-03 are the same capture (*artifact*). | R12, R11 |

---

## 2. Twelve root causes behind the mismatches

| # | Root cause | Shots | Friend item |
|---|---|---|---|
| R1 | **Text covers the board.** Tip bar, banner, toast, sniff pop and hint stack on top of the board or push it down, hiding the top row, the bottom row or the player's own piece. Cards get covered by toasts. | vul-03a, 04, 07b, 08; ost-07, 07b, 10; hye-01, 02, 03, 04; bad-00, 01, 02, 04 | contributes to "did not understand the game" |
| R2 | **Your own square hides what is on it.** The YOU tag and the animal sit on top of the egg, its warmth number, the found egg and the throw target. | vul-04, 08; ost-04, 05 | 6 (standing on an egg), 5 (throw at the found egg) |
| R3 | **One look carries many meanings, and marks pile on top of each other.** The gold dot means move, hide an egg here, start here, carry here and kick lands here; it reads as a coin; it sits on top of eggs, egg numbers, the found egg and a seen bird. The hunter's area outline covers the same squares as its move dots. Pounce shows two outlines. Opponents are not identified. | vul-02, 03b, 07; ost-02a, 02c, 03, 03b, 07, 11a; hye-03, 04; bad-02a, 04 | 1 (egg outlines) |
| R4 | **"May be here" and "is here" are not one consistent pair.** The vulture's maybe-egg is a dashed egg per square, close in look to the found egg. The ostrich sees "checked, empty" as hatching and "checked, egg near" as a green dashed zone. A last-known badger mound looks like a present badger. | vul-03b, 07b; ost-03, 09; bad-03, 05b | 1 (egg outlines) |
| R5 | **A required next step has no cue on the board.** Nothing marks the found egg as the throw target; nothing leads to the rocks after a throw; nothing rings a bird the badger can catch. The player learns the step only from the hint text, if they read it. | vul-04, 06, 07; bad-04 | 3 (get a stone), 5 (throw at the egg) |
| R6 | **Things happen with no visible cause.** Kicks teleport across the board; the kicked-back stone has no path; a caught bird vanishes; the opponent's turn is invisible; a wrecked square appears with no history; leaving the burrow just happens. | vul-03a, 03b, 05; ost-08, 10, 11, 12; hye-05, 06; bad-05 | 2 (kick across the board) |
| R7 | **Sense and sight ranges are invisible.** "Near" has no size. The hunter's 2-square sense, the vulture's 1-square sniff and the birds' 2-square sight of hunters are never drawn. | hye-02, 06a; bad-05b | 4 (how far the hyena sees) |
| R8 | **Numbers have no label, or belong to someone else.** Every phone shows the ostrich's hunger, the vulture's stone and EGGS; the ostrich thinks the stone is its own. ROUNDS counts down while the end screen counts up. The hunter chip's "1" is unexplained. "3 catches" vs 2 pips. ROUNDS is clipped on 3-player headers. | vul-01, 10; ost-01, 10; hye-01, 05 | 3 (the stone counter is not on the vulture) |
| R9 | **Status looks read backwards.** A full, safe egg wears the alarm-looking ring while the urgent egg looks pale and calm. Bad news for the ostrich (a sniff near its egg) comes in the good-news look. | ost-08, 09 | none |
| R10 | **Button states read wrong.** A pre-checked Fly reads as "already done". Selected Carry looks disabled. Stay (badger) and Stop (Pounce) don't say what they keep or give up. | vul-02; ost-06a; hye-04; bad-01, 04 | none |
| R11 | **Some words mislead.** "It stays found until moved", "Throw on your own square", "Hover or tap a square", "Badger popped up!" on the badger's own phone, "rounds" and "turns" for the same clock, "Outwit the hunters" for a vulture game. | vul-04, 05, 06; ost-01, 04; hye-03; bad-05; misc-01; how-01 | contributes to 3 and 5 |
| R12 | **No picture of the whole game before the first turn.** The role card is words over a covered board; How to play is a cut-off wall of rules. Reviewers knew the goal and not the loop that reaches it. | vul-01; ost-01; bad-00, 01; misc-00; how-01 to 03 | "did not understand the game" |

### Brian's friend, mapped

| Friend's confusion | Root causes | Cold-review match |
|---|---|---|
| Dashed "egg may be here" outline vs solid found egg | R4, R3 | vul-03b ("two kinds of gold dots"), vul-07b ("dotted ring vs solid egg") |
| Being kicked across the board felt odd | R6 | ost-11, ost-12, hye-06 (all three guessed "wrap" and none were sure) |
| Did not know to fetch a stone after each throw | R5, R8 | vul-06, vul-07 (only the hint says so; no route; stone counter sits in the header, not on the vulture) |
| How far the hyena can see | R7 | hye-02 ("how far is near?"), hye-06a |
| Did not know to throw the stone at the found egg | R5, R2 | vul-04, vul-08 (target hidden under YOU; "throwing where I stand is odd") |
| Could not tell when standing on an egg | R2 | ost-04, ost-05 (ring under the bird unreadable) |
| Did not understand the game at all | R12, R5, R1 | every role card shot; how-01 |

---

## 3. Every step of each animal's loop needs one cue on the board

This is the core of the fix list. Each step should have exactly one look that appears at the moment the step is next, and nothing else competing with it.

| Animal | Step | Cue today | Proposed cue (what the player sees) |
|---|---|---|---|
| **Vulture** | 1. Fly to sniff | Fly dots (look like coins) | Small fly dots on empty squares (fix 5) |
| | 2. Read the sniff | Banner plus pop plus dashed eggs per square | One dashed outline around the sniffed area (fix 4); a quiet dim on squares checked empty |
| | 3. Land on the egg to find it | Nothing | The dashed area itself is the cue; landing inside makes the egg pop up solid on your square |
| | 4. Throw at the found egg | Hint text only; crosshair hidden under YOU | The found egg sits large on the square edge; with a stone in hand, a crosshair already sits on it and the Throw button pulses once (fixes 1, 3) |
| | 5. Get a new stone | Hint text; rocks get a frame when you have none | Your piece shows an empty claw; rock piles pulse; the fly dots that get you closer to the nearest rock are brighter, so the route reads at a glance (fix 1) |
| | 6. Go back to the egg | Faint egg under a fly dot | Found egg stays solid and on top of everything; with a stone in hand it gets the crosshair again |
| **Ostrich** | 1. Hide 3 eggs, pick a start | Same dot everywhere; eggs vanish at start pick | Placed eggs stay drawn through the start pick; start squares use a distinct start marker (fix 5) |
| | 2. Warm each egg | Ring number, often covered | Ring drains neutral, turns alarm and pulses only when low; the lowest egg pulses (fixes 9, 1) |
| | 3. Know you're on it | Hidden under YOU | Egg drawn under the bird and peeking out, the ring wraps the whole square, the ring visibly refills on arrival (fix 3) |
| | 4. Eat | Leaf frame when hungry, header number | Hunger bar under your own piece's chip; leaf pulses when low (fixes 8, 1) |
| | 5. Kick a pest | Kick button, left arrow, dots on the far side | Ring on the animal; arrow with one dot per square, leaving one edge and entering the other; ghost where it lands (fix 6) |
| **Hyena** | 1. Sense | Text "Nothing near" / "Bird near" | Your sense range drawn every turn as a faint outline; it fills when a bird is inside (fix 7) |
| | 2. Step in | Move dots, coinciding with the area | Move dots on squares; the area as one outline, visibly separate (fix 5) |
| | 3. Pounce | Two outlines | One area; overlap filled; one extra dot ring (fix 5) |
| | 4. Catch | Toast, bird vanishes | Bird drawn bursting off in a puff, direction hidden; your catch pip fills (fixes 8, 10) |
| **Badger** | 1. Sense | As hyena | As hyena |
| | 2. Burrow | Burrow button | Burrow button shows the mound shape; your piece sinks into a mound |
| | 3. Ambush | Small bird under a move dot | Ring around the adjacent bird (the act-on ring the Kick uses) (fix 1) |
| | 4. Pop up | "Badger popped up!" | Mound bursts as you move; hint "You came up." on your own phone |

---

## 4. Ranked fixes, most damaging to a first-time player first

Each fix lists the root cause, the evidence, what the player sees after the change, and how to check it next time with the same cold-reviewer method. Words appear only where no shape will do.

**Verification method for all fixes.** Re-shoot the same moments with the same script on the same phone size, add the new moments named under each fix, and give them to four fresh reviewers with the same five questions and no other context. A fix passes when every reviewer of that role names the correct next action for the shots listed, in their own words, without quoting the hint text. Keep the friend test too: one new person, no explanation, ten minutes, note every question they ask.

### Fix 1. Mark the next step of each animal's loop on the board, every turn

- **Cause:** R5. **Evidence:** vul-04, 06, 07, 08; bad-04; friend items 3 and 5.
- **What the player sees:** exactly one pulsing cue on the square or button that moves their loop forward (section 3). Vulture with a found egg and a stone: the crosshair already sits on the egg and the Throw button pulses once. Vulture with no stone: an empty claw on its piece, the rock piles pulse, and the fly dots closer to the nearest rock are brighter than the others. Badger with a bird next to it: the act-on ring around that bird. Ostrich: the lowest egg or the leaf pulses when it gets low. The hint line can then shrink to a verb or disappear.
- **Verify:** vul-04, vul-06, vul-07, bad-04b, plus a new shot "vulture just threw, no stone, egg found earlier". Pass: all reviewers say "throw at the egg" (vul-04) and "go to the rocks" (vul-06, 07) without citing the hint.

### Fix 2. Keep the whole board visible and take all text off it

- **Cause:** R1. **Evidence:** vul-04, 07b, 08; ost-07b, 10; hye-03, 04; bad-02, 04; every role card covered by a toast.
- **What the player sees:** one message line above the board, the same slot every time, one message at a time, newest wins. The tip bar goes (its useful lines fold into that slot or into long-press). Banners and pops never sit on the board; the board shows what happened with a ping on the square instead (fix 10). The board is sized to the space between the header and the buttons, so all 7 rows always show, and the empty band under the board inside the frame goes. Role cards get no toast on top.
- **Verify:** vul-07b, ost-07, ost-07b, hye-03, bad-04. Pass: every reviewer can point to their own piece and sees the full 9 by 7 board in every shot.

### Fix 3. Make the square you stand on readable at a glance

- **Cause:** R2. **Evidence:** ost-04, 05; vul-04, 08; friend items 5 and 6.
- **What the player sees:** the YOU tag moves above the square so it never covers it. Whatever you stand on is drawn under your animal and peeks out large enough to read: your egg with its ring wrapping the whole square, or the found egg for the vulture. Arriving on your egg plays a short settle and the ring visibly refills. The vulture's crosshair on its own square draws over the egg, outside the animal.
- **Verify:** ost-04, ost-05, vul-08, plus a new shot of the ostrich one square away from its egg next to one standing on it. Pass: every reviewer says "I'm on my egg" (or "not on it") correctly for each.

### Fix 4. Use one pair of looks for "may be here" and "is here", for every role

- **Cause:** R4. **Evidence:** vul-03b, 07b; ost-03, 09; bad-03, 05b; friend item 1.
- **What the player sees:** "something may be in here" is always one dashed outline around an area, the same for the vulture's sniff, the hunter's sense and a last-known burrow. "It is here" is always the real thing drawn solid and full size: the found egg, a seen bird, a badger that is up. The vulture's per-square dashed eggs go, replaced by one dashed outline around the sniffed squares. "Checked, nothing here" is a quiet dim on those squares, the same look on the vulture's and the ostrich's phone (replacing the hatching). A buried badger's last-known spot is a dashed mound, not the solid mound with a face.
- **Verify:** vul-03b, vul-07b, ost-03, bad-03. Pass: every reviewer can say which egg is certain and which is a guess (vul-07b), and that the ostrich doesn't know if the badger is still there (bad-03).

### Fix 5. Make move dots small, keep them off anything that matters, and give setup its own markers

- **Cause:** R3. **Evidence:** vul-02, 03b, 07; ost-02c, 03, 03b, 11a; hye-03, 04; bad-02a, 04.
- **What the player sees:** the chess-app move dot, small and translucent with a dark edge, only on empty squares. On a square that holds something (an egg, the found egg, a seen bird), the move cue becomes a thin ring around the square's edge, as chess apps do for a capture, so the thing stays readable. Setup uses a ghost egg where you tap, and your placed eggs stay drawn through "pick your start", which uses its own start marker. The hunter's area outline is drawn outside the squares and the dots inside it stay small, so the two read as two things. Pounce shows one area with the overlap filled (the earlier audit's plan; the screenshots still show two outlines).
- **Verify:** vul-03b, ost-02c, ost-03b, hye-03b, hye-04. Pass: no reviewer calls the dots coins or eggs, every reviewer finds the egg numbers, and hunters can describe "where I can step" and "where the bird may be" as two things.

### Fix 6. Show the kick wrap as motion: off one edge, back in from the other

- **Cause:** R6. **Evidence:** ost-11, ost-12, hye-06; friend item 2.
- **What the player sees:** in the preview, the arrow runs to the board edge with an exit arrowhead, a short arrow enters from the opposite edge, one dot per square travelled, and a ghost of the animal where it lands. On the kick, the animal slides off the edge and slides back in from the other side (the Pac-Man tunnel everyone knows), with a short trail. The kicked player's phone plays the same slide from where they can see. If the push stops early, it stops with a bump against the blocker.
- **Verify:** new shots taken mid-slide (three frames: leaving, entering, landed) on the ostrich's and the hyena's phones, plus ost-11. Pass: every reviewer says the animal went off the edge and came back in, and none calls it a mistake.

### Fix 7. Draw sense and sight ranges on the board

- **Cause:** R7. **Evidence:** hye-02, hye-06a, bad-05b; friend item 4.
- **What the player sees:** a hunter's sense range (everything within 2) as a faint outline around it at the start of every turn. When no bird is near, the outline stays empty; when one is, the area fills. The vulture's sniff range (its square and the 8 around it) flashes on every landing, yes or no. For birds, squares beyond 2 are a little darker (fog), so "I see hunters within 2" is visible without a sentence. "Nothing near" and "Bird near" text can go.
- **Verify:** hye-02b, hye-03b, hye-06a, bad-05b. Pass: every reviewer says "2 squares" (or points to the outline) when asked how far they can sense.

### Fix 8. Each phone shows only its own numbers, next to what they count

- **Cause:** R8. **Evidence:** vul-01, 10; ost-01, 10; hye-01, 05; friend item 3.
- **What the player sees:** the ostrich's hunger as a draining bar on the ostrich's own chip; the vulture's stone drawn on the vulture's piece (a pebble in its claws, gone when thrown) and on its chip; a hunter's catches as pips toward 3 on its chip. Each phone's header shows only its own counters; other players' counters live on their chips. Two-player games get the same row of player chips as 3-player games, with the turn highlight, so the opponent is identified. ROUNDS counts the same way on the board and on the end screen (either "round 9 of 30" everywhere, or "21 left" everywhere), and is never clipped.
- **Verify:** vul-01, ost-10, hye-05, vul-10. Pass: the ostrich reviewer says the stone belongs to the vulture; the hunter reviewer can say how many catches they have; nobody flags the round numbers.

### Fix 9. Make egg warmth read the right way round

- **Cause:** R9. **Evidence:** ost-08, ost-09.
- **What the player sees:** the ring works like a timer: full and quiet when safe, draining as rounds pass, switching to the alarm look and pulsing only when 5 or fewer rounds are left. The urgent egg is the loudest thing on the board, never the calmest. The number is never covered (fix 5). On the ostrich's phone, a vulture sniff near its egg uses the alarm look; the good-news look stays for good news.
- **Verify:** ost-08, ost-09. Pass: every reviewer picks the 6-round egg as the urgent one in under a second, and reads the sniff as bad news.

### Fix 10. Show every result where it happened, including the other players' turns

- **Cause:** R6. **Evidence:** vul-03a, 03b, 05; ost-08, 10; hye-05; bad-05.
- **What the player sees:** the other players' moves play as a short slide with a fading trail wherever this phone can see them. A thrown stone arcs to its square; a kicked-back stone visibly bounces back to the vulture. A wrecked square keeps a small crack that a long-press can explain. A caught bird bursts off in a puff, with the direction hidden from the hunter. Moving out of a burrow shows the mound bursting. A two-pulse ping marks the square of any news.
- **Verify:** vul-03b, ost-10, hye-05, bad-05, plus a new shot just after the computer's move. Pass: every reviewer can say what the other player just did.

### Fix 11. Bring back a short visual walkthrough, once per role

- **Cause:** R12. **Evidence:** every role card shot, how-01, misc-00; friend "did not understand the game".
- **What the player sees:** see section 5. Three or four picture screens of the real board in motion, one line each, skippable, shown the first time a person plays a role, and replayable from "?".
- **Verify:** give new reviewers the walkthrough frames first, then the first-turn shots. Pass: every reviewer states the full loop for their animal (for the vulture: find, get a stone, throw at the egg) before seeing any hint.

### Fix 12. One look for "selected" and one for "can't use now", and say what Stay and Stop do

- **Cause:** R10. **Evidence:** vul-02, ost-06a, hye-04, bad-01, bad-04.
- **What the player sees:** selected is a check plus an outline, the same in every theme; disabled is dimmed grey, the same everywhere; the selected Carry stops looking disabled. The badger's Stay shows the mound shape when it would keep the badger buried. Pounce's Stop shows a plain stop symbol and ends the turn.
- **Verify:** ost-06a, bad-04b, hye-04. Pass: no reviewer reads a selected button as disabled or done.

### Fix 13. Rewrite the lines that mislead, in fewer words

- **Cause:** R11. **Evidence:** vul-04, 05, 06; ost-01, 04; hye-03; bad-05; misc-01.

| Today | Proposed |
|---|---|
| "Found. It stays found until moved." | Remove. The solid egg says it. |
| "Throw on your own square." | Remove once the crosshair sits on the egg (fix 1). |
| "Wrecked. Nobody can land here." | Long-press only: "Can't land here." |
| "Hover or tap a square to see what it is." | Remove; say "Hold a square to learn it" once, in the walkthrough. |
| "Badger popped up!" (on the badger's phone) | "You came up." (everyone else keeps the third-person line) |
| "Stand on each egg every 15 rounds." / "Eat every 15 turns." | Use one word for both clocks, the word the counter uses. |
| "Outwit the hunters." (home) | Name the animals the player will meet, or show them. |
| "kept 3 egg(s) alive" | "3 eggs survived." |

- **Verify:** same shots. Pass: none of these lines is quoted as a confusion.

### Fix 14. Open How to play at the top and turn its marks list into pictures

- **Cause:** R12, R11. **Evidence:** how-01 to 03.
- **What the player sees:** the page opens scrolled to the top with nothing cut off. Each animal's section starts with its loop drawn as the same pictures the walkthrough uses. The marks list shows each mark exactly as the board draws it, with two to four words of meaning. Badger and teammates get one line each before they are mentioned.
- **Verify:** re-shoot how-01 at the top and at two real scroll positions (the audit captured how-02 and how-03 at the same spot). Pass: the reviewer can say what each animal does from the pictures alone.

### Fix 15. Identify every piece the first time it appears

- **Cause:** R3. **Evidence:** vul-01, vul-02, ost-02a.
- **What the player sees:** the opponent's piece uses the same art as its chip (fix 8 puts chips on 2-player games), and the first time it appears it gets one ping. The cyan ostrich on the vulture's phone and the dark vulture during setup then need no label.
- **Verify:** vul-02, ost-02a. Pass: every reviewer names the opponent's piece.

---

## 5. The walkthrough should come back, as pictures of the loop

**Recommendation: yes.** Bring back a short walkthrough of three or four picture screens per role, one line each, shown once the first time someone plays that role, skippable, and replayable from "?". It replaces the role card for first-timers; returning players see only the 4-line card.

**Why.** The earlier audit cut the text walkthrough, citing Andersen et al. 2012 that up-front tutorials add little for games you can learn by trying. That holds when trying shows you what went wrong. This game hides the key information (eggs, birds, ranges), so a wrong try doesn't teach: the friend and every cold reviewer knew the goal and still could not work out the loop that reaches it, and the vulture's "fetch a stone after every throw" was learned by nobody without reading the hint. A few pictures of the loop, followed by a board that repeats the same cues (fix 1), is the cheapest way to close that gap. The old walkthrough failed because it was 85 to 102 words of rules; this one is pictures with one line each.

**Rules for the screens.** Each screen is the real board, the real animal art and the real marks, with the one action animated (a two-second loop). One line under it, verb first, at most six words. No colors or looks named. A Skip button on every screen and a page dot row. The same pictures reappear in How to play.

| Role | Screen 1 | Screen 2 | Screen 3 | Screen 4 |
|---|---|---|---|---|
| Vulture | Land to sniff for eggs. (lands, area outline appears) | Land on the egg to find it. (egg pops up solid) | Throw your stone at it. (arc, egg smashes) | Fetch a new stone. (flies to rocks, pebble appears in claws) |
| Ostrich | Hide your 3 eggs. | Stand on eggs to keep them warm. (ring refills) | Eat at a leaf. (hunger bar refills) | Kick pests away. (kick slides off one edge, in the other) |
| Hyena | Sense birds nearby. (range outline fills) | Step in to catch. | Missed? Pounce once more. | Catch 3 times to win. (pips fill) |
| Badger | Sense birds nearby. | Stay still to burrow. (sinks into mound) | Catch birds that come close. (ring on a bird next to it) | Catch 3 times to win. |

**Order of work.** Build fixes 1 to 5 first. The walkthrough only teaches if the board then shows the same cues, so it should be made from the finished board art, not before it.

---

## 6. Also noticed

- The badger trivia box and the "dug in" toast overlap each other (bad-02); the BURROWED label is clipped to "URROWE".
- The ROUNDS number is clipped on 3-player headers (hye and bad shots show "ROUNDS 2" for 29).
- The red "NO EGG" tag on the ostrich's phone is clipped off the left edge (ost-10), and no reviewer could say what it meant.
- The "Timer on" chip and "900s" on the role card suggest 15-minute turns while the bar shows 10 seconds (hye-01).
- The hunter chip shows "1" with no meaning a reviewer could find (all hunter shots).
- "vs computer (normal)" on the end screen gives no sense of what "normal" means.
- The welcome card has Skip and Back with a single page (misc-00).
- "Pass & Play on this device?" reads as a question, so the reviewer could not tell it is a way to play (howto reviewer).
- In ost-07, dashed rings on two squares toward the leaf have no meaning a reviewer could find; check whether this is a route hint and fold it into fix 1's single cue.
- "The vulture sees you sit." was read as a penalty with no sign of the benefit; fix 3's visible refill answers it.
- For the next audit run: capture How to play at distinct scroll positions, keep shots in the order they happen (06a before 06, 02a before 02), and mark any script-set state (hunger, rounds, pre-smashed eggs) in the file name so reviewers aren't confused by jumps.
