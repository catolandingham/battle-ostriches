# Battle Ostriches rulebook v1 (2026-11-07): rules editor review

Reviewed from the rulebook text only (no code, no other notes). Rule numbers refer to that file.

## Summary

1. The core is sound: one move rule, one push rule, "pushes are not moves", a two-catch knock-out and a round cap that always ends the game. Most problems sit where two animals end on one square, and in the stone rules.
2. Most important: rule 3.3 forbids landing on any animal you can see, which as written blocks both hunters meeting (8.1) and the badger's ambush (it sees the adjacent bird, so it may not land on it).
3. Second: every hunter push starts from a shared square (the hunter lands on the bird or on the other hunter), so "pushed away from the hunter" has no direction. This comes up on every catch.
4. Third: turn order lets two hunters catch the same bird back to back (Hunters mode: hyena then badger) for a knock-out the bird could not answer, and lets the vulture smash an egg right after a hunter knocks the ostrich off it.
5. Also high: several "every player can win" failures (an ostrich knocked out before about round 16, a trailing hunter in Hunters mode), and information leaks through the kick preview, catch announcements and predictable pushes.

## Findings, most important first

### 1. Rule 3.3 blocks hunters meeting and the badger's ambush
- **Rules:** 3.3, 8.1, 7.4 (ambush sight), 7.3 (hunter sight), 4.1.
- **Situation:** 3.3 says no animal may land on a square holding an animal it can see. 8.1 says a hunter that moves onto the other hunter's square "when it can see it" pushes it. The two rules forbid and require the same move. Same for the badger: while buried it "sees any bird next to it exactly"; on its turn it comes up and wants to land on that bird; 3.3 forbids it because it can see the bird. The ambush can then only work when a bird walks onto the badger. A third reading problem: if rose dots count as "seeing", hunters could never land on a dotted square and could never catch anything.
- **How often:** every hunter meeting and every ambush attempt; and the reading of 3.3 decides whether hunters can catch at all.
- **Fix (one universal line):** "Birds may not land on an animal they can see. Hunters may land on any animal: on a bird it is a catch, on the other hunter it is a meeting." Then 4.1 becomes "a catch happens when a hunter lands on a bird, or a bird lands on a buried badger."

### 2. Pushes from a shared square have no direction
- **Rules:** 4.2, 5.1, 8.1, 7.4 (burst out), 6.4 (wreck under the vulture's own square).
- **Situation:** a hunter lands on a bird: both are on one square, so "2 squares straight away from the hunter" points nowhere. Same when a bird lands on a buried badger (who is pushed where?), when hunters meet, and when a stone wrecks a square the vulture shares with a buried badger. Also, a 2-square move such as 2 across and 1 up is not a straight line, so "back the way the hyena came" (burst out) and "the direction of travel" are both unclear for it.
- **How often:** every catch and every meeting. This is the most common unanswered situation in the book.
- **Fix:** one sentence in section 5: "When an animal is pushed off a square it shares with the animal that caused the push, the push follows the move that brought them together: forward along that move if the animal that was already there is pushed, back along it if the mover is pushed. A move that is not straight counts as the straight direction of its longer part (2 across and 1 up counts as across)." Burst out is then just this rule.

### 3. Back-to-back catches and catch-then-smash chains, with no choice for the bird
- **Rules:** section 2 turn order, 4.2, 4.3, 6.2, 6.3, 7.1 (sit is visible).
- **Situation A (Hunters mode: vulture, ostrich, hyena, badger):** the hyena catches the ostrich and pushes it 2. The badger moves next, before the ostrich gets a turn, and catches it again: knocked out. The ostrich made no choice between the two catches. With rule 2's push rule being fixed, the badger can work out where the ostrich landed (see finding 5).
- **Situation B (3 players and 2 vs 2 + hunter: the hunter moves right before vulture 1):** the ostrich sits on an egg (everyone who sees it knows the egg's square). The hunter catches it and pushes it 2 off the egg. The vulture moves next, before the ostrich, and if it holds a stone next to that square it throws: the egg is smashed. The ostrich never got to respond. The hunter and the vulture act as a team without trying.
- **How often:** A comes up whenever both hunters are near one bird, which is the hunters' whole plan. B needs the vulture to be waiting next to a known egg, which a good vulture will do.
- **Fix:** "A caught bird can't be caught again until it has taken its next turn" fixes A in one line a child can remember ("you get a head start"). For B, test moving the hunter's turn to straight after the vulture (vulture, hunter, ostrich); the caught ostrich then answers before anyone else acts. A rule alternative: "an egg the ostrich was on when caught is guarded until the ostrich's next turn", but that is a new special case.

### 4. "Visible animal" in push stops, and the kick preview, leak hidden hunters
- **Rules:** 5.2, 7.1 (kick preview), 7.1 (ostrich sees hunters within 2), 5.4.
- **Situation:** a kick moves an adjacent animal 3, so its path reaches squares 3 and 4 from the ostrich, where the ostrich cannot see hunters. If the push stops before a hyena standing there, the preview either shows the true landing square (telling the ostrich where an unseen hyena is) or shows the wrong square (the promise in 7.1 breaks). The phrase "a visible animal" in 5.2 does not say visible to whom. If it means visible to the pushed animal, a kicked or stone-pushed hunter (which never sees birds) can be pushed onto a bird's square; 5.4 says no catch happens, and then no rule says what the bird and hunter do next.
- **How often:** every kick toward open ground in games with hunters; every push of a hunter toward a bird.
- **Fix:** "A push stops before any animal that is up, seen or not. A buried badger is brought up by a push that reaches it, and the push stops before it." The kick preview then shows only the direction and the full distance, and says "may stop early". This also removes the shared-square cases in finding 9.

### 5. Hunters can work out where a caught bird went; birds learn where unseen hunters are
- **Rules:** 4.4, 11, 10, 5.2.
- **Situation:** the push after a catch is fixed (2 squares, a set direction, stops at edges and wrecks everyone can see). A hunter that knows the rules can compute the landing square, so 4.4 hides nothing except in the rare case where an animal it can't see cut the push short. Computer seats will do this every time, kids won't, so the same seat plays differently for a human and a computer. The other way round: rule 11 shows where a catch happened "to players who can see that square". Birds always see each other, so when the vulture is caught 5 squares from the ostrich, the ostrich sees the vulture jump and learns exactly where the hyena is, although 10 says it only sees hunters within 2. Rule 11's "see that square" is not defined anywhere; section 10 defines sight of animals only.
- **How often:** every catch.
- **Fix:** accept the deduction and say so plainly: delete 4.4 and write "Hunters know where a bird they catch is pushed to." Define rule 11 as "where it happened is shown to anyone who can see one of the animals involved", and accept that birds learn a hunter's position on a catch (it is a visible cause). This is simpler than hiding information the rules make obvious.

### 6. Some players still in the game have no way left to win
- **Rules:** 9.1 to 9.4, 7.1 (eggs go cold after 15 rounds), design goal "every player keeps a way to win".
- **Situation A:** the ostrich is knocked out before about round 16. Its eggs last at most 15 rounds without it, so they all go cold before round 30. Its only win (9.3) is gone, yet it is still "in the game" per 9.4.
- **Situation B (Hunters mode):** hunter A has knocked out the vulture and caught the ostrich once; hunter B has nothing. Whoever knocks out the ostrich, A ends with more knock-outs or wins on catches. B cannot win but must keep playing.
- **Situation C (3 players):** the vulture is knocked out. It wins only if eggs go cold while the ostrich is still in (an ostrich mistake). If the hunter knocks out the ostrich instead, 9.1 gives the hunter the win. So the vulture can only hope.
- **Situation D (2 vs 2):** ostrich 1 is knocked out. Ostrich 2 sees only "its own eggs", so it cannot find ostrich 1's eggs to keep them warm.
- **How often:** A and C in most 3-player games with an early knock-out; B in many Hunters games.
- **Fix:** let knocked-out players keep acting for their side in a small way rather than adding new win rules. Options to test: a knocked-out bird keeps its sight and its phone shows what it saw (team play in 2 vs 2); in 2 vs 2, teammates see each other's eggs (one universal sight line: "you see your team's eggs"). For A, simplest: "a knocked-out ostrich's eggs no longer go cold" (the vulture must smash them), which keeps 9.3 reachable and gives the vulture work to do. For B, score Hunters mode by catches only (a knock-out is just a catch), so the trailing hunter can still catch up while birds are on the board, or accept a 3-way result where the hunter with fewer points shares a loss with the birds and say so.

### 7. The stone kick-back rules are special cases that chain badly
- **Rules:** 6.3, 6.4, 6.5, 6.6.
- **Situations:**
  - **Infinite loop in 2 vs 2:** vulture V stands on a leaf between ostrich A and ostrich B in a straight line, all adjacent. V throws at A. A kicks it back to V's square; V is on a leaf, so the stone continues one square past V, onto B's square, "as a normal stone (6.3)". B kicks it back to V's square; it continues past V onto A's square; A kicks it back. Nothing ends it.
  - **Own-egg smash:** 6.5 says the kicked-back stone "wrecks" the vulture's square. If the vulture is standing on an egg it found, 6.3 says a stone on that square smashes the egg. The two rules disagree, and either way the ostrich's kick destroys its own egg.
  - **Dead rule:** "If the vulture shares the ostrich's square" (6.5) cannot happen: birds see each other always, so neither may land on the other, and pushes stop before visible animals.
  - **The hop** (6.4) is neither a move nor a push. Can it land on a hidden egg (find?), a rock pile (refill?), a buried badger (catch?), and which ostrich is "the ostrich" for the tie in 2 vs 2?
  - **6.6** repeats 6.3: any stone at the ostrich's square is kicked back, so it never reaches the egg anyway.
  - **Who uses it:** a vulture always sees the ostrich, so throwing at it is never smart. 6.5 mostly punishes a child's mistake.
- **How often:** the loop and the own-egg smash are rare; the hop comes up whenever the vulture throws at its own empty square; the confusion comes up whenever anyone reads section 6.
- **Fix:** replace 6.4's hop, 6.5 and 6.6 with two lines using the universal push: "A stone thrown at a bird's square is wasted: the bird kicks it away and the thrower is pushed [2] away from that bird." and "A stone can't wreck the square the vulture is standing on." Throwing at your own square then only smashes an egg you stand on (keeps the find-then-smash play).

### 8. Leaves and rock piles are stone-proof and kick-proof bunkers for a buried badger
- **Rules:** 6.3 (stone on a leaf or rock pile: nothing happens), 1 (never wrecked), 6.4 (only a wrecked square pushes its animal), 7.1 (kick never a buried badger), 7.4 (burrow on a leaf or rock pile).
- **Situation:** the badger digs in on a leaf. The ostrich must eat within 15 turns and there are only two leaves. Birds that didn't see the dig know only "the badger dug in somewhere" and that leaves and rock piles are the obvious spots. No bird can dig it out: a stone on a leaf does nothing, kicks can't touch it. The ostrich guesses between two leaves and may be caught for eating. The same works on a rock pile against the vulture. A stone also cannot move a hyena or vulture standing on a leaf or rock pile.
- **How often:** likely a favorite badger plan once players find it; it also produces long waits for the badger player.
- **Fix:** make the stone's push universal: "A stone pushes any animal on its square [2] away from the vulture (a buried badger comes up). Then, if the square is ordinary and has no egg, it is wrecked." Birds now have a counter (throw at the suspect leaf) with a visible cost (a stone and a turn).

### 9. Shared squares nobody resolves
- **Rules:** 5.2, 5.3, 5.4, 5.5, 4.2, 7.4.
- **Situations:**
  - A catch push blocked at once (bird against the edge or a wreck): the bird stays on the hunter's square. On the hunter's next turn it cannot "land" where it already is; can it step off and back on for the second catch?
  - A bird pushed onto a buried badger (5.3): they share. Does the badger come up (5.5 says "any push brings a buried badger up", 5.3 says "nothing happens")? On the badger's turn it can't land on the bird it shares with. Is ambush sight "next to it" meant to include its own square (distance 0)?
  - Burst out (7.4) only covers a hyena on top, not a bird pushed on top.
- **How often:** pinned catches are common on a 9 by 7 board (about half the squares are on or next to an edge). The others are rare.
- **Fix:** the push fix in finding 4 removes the buried-badger cases. For blocked pushes: "If a push can't move the animal at all, its player moves it to any open square next to it." One line, gives the pushed player a choice, and no animal ever shares a square with an animal that is up.

### 10. The egg-next-to-leaf fortress probably wins Classic, and kicks create loops
- **Rules:** setup (eggs not on or next to a leaf), 7.1 carry (may carry next to a leaf), 7.1 sit and kick, 7.1 needs, 6.6.
- **Situation (Classic, vulture then ostrich):** the ostrich carries one egg next to a leaf (a few turns at speed 1) and sits on it, letting the others go cold. It must leave only to eat, once in 15 turns, and the leaf is adjacent. Before eating it kicks any vulture next to the egg 3 squares away; the vulture needs two turns to come back and throw (fly next to the egg, then throw), and the ostrich is back on the egg after one. If the vulture lands on the egg square itself, the ostrich (on the leaf, adjacent) kicks it off before it can throw. The setup rule tries to stop this and carry undoes it. The result is a long stretch of sitting and kicking: the vulture returns every two turns and the ostrich kicks every two turns.
- **How often:** likely the standard strong play for the ostrich once found.
- **Fix:** make the setup restriction a permanent fact rather than a setup rule: "An egg can never be on or next to a leaf" (carry can't go there either). Test whether eating should require landing on a leaf (not staying), so feeding costs at least two turns away. Track the kick-and-return loop in playtests; if it shows up, a kicked animal can't be kicked again until after its next turn (same shape as the catch head start in finding 3).

### 11. Can an animal stay still? The book says yes and no
- **Rules:** 3.1 ("up to [2]"), 7.1 sit ("stay on an egg instead of moving"), 7.1 eat ("or stay on one"), 6.1 (refill only by landing), 7.2 sniff (only on landing), 7.3 pounce ("its move did not catch"), 7.4 burrow ("staying still").
- **Situation:** "up to 2" might include 0. If it does, "sit" is just staying still on an egg and needn't be a separate action. If it doesn't, only an ostrich on an egg or leaf and the badger may stay, and an animal boxed in by wrecks and animals has no legal turn. Staying on a leaf feeds the ostrich, but staying on a rock pile does not refill the vulture. A hyena that stays still: does it get to pounce?
- **Fix:** "Any animal may stay where it is. Your square works when you land on it or stay on it." This one line covers sit, eat, refill, sniff and burrow the same way. Then decide plainly whether staying counts as a move for pounce (suggest no).

### 12. Smashed eggs: who learns what, and is the square wrecked?
- **Rules:** 6.3, 9.2, 10, 11.
- **Situation:** 6.3 lists "hidden egg smashed" separately from "empty square wrecked", so a smashed egg square is apparently not wrecked. A vulture throwing blind at a sniffed square then learns from the board (no wreck appeared, so an egg was there). Rule 11 does not list "egg smashed" or "egg went cold" as big events, so it is unclear whether the vulture or anyone else is told. Nobody is told how many eggs are left. Also unanswered: a stone on an egg the vulture already found (6.3 says "hidden egg"); a stone on a square holding both a hunter and an egg (smash and push?).
- **Fix:** add "an egg is smashed" and "an egg went cold" to rule 11 for every phone, without the location; show the egg count on every phone. Then the board effect doesn't matter, and either choice for wrecking is fine. State "any egg, found or not".

### 13. Kick wrap-around contradicts itself and breaks the visible-cause goal
- **Rules:** 5.2 [OPEN].
- **Situation:** the kick "always travels its full distance" and "still stops before a wrecked square or visible animal" in the same sentence. "Both directions for diagonals" is unclear at a side edge (does only the crossed axis wrap?). A hunter kicked off the left edge reappears on the right, possibly next to the other side's eggs, which is a large effect with a cause a child won't see. It is the only push that wraps.
- **Fix:** drop the wrap. A kick toward the edge is short, the preview shows it, and the ostrich chooses. This keeps one push rule.

### 14. Hyena knowledge of the badger's dig-in spot
- **Rules:** 7.4 ("birds that could see it when it dug in see the spot"), 10 (hyena sees a buried badger "never").
- **Situation:** the hyena saw the badger within 2, then hears "The badger dug in!". It knows the spot anyway. The table says it doesn't.
- **Fix:** "Anyone who could see the badger when it dug in sees the spot." Same rule for every viewer.

### 15. 2 vs 2 wording assumes one ostrich and one vulture
- **Rules:** 7.1 and 7.2 ("sees both birds always"), 6.3 to 6.5 ("the ostrich"), 6.4 tie ("farthest from the ostrich"), 9.1 ("both birds knocked out"), 10 ("its own eggs"), 7.1 kick "never a teammate".
- **Situation:** there are four birds in 2 vs 2. Does every bird see all four? Does the hunter in 2 vs 2 + hunter need all four knocked out (eight catches in 30 rounds)? Do teammates share what they see? Can a vulture stone its teammate's square (kicks of teammates are banned, stones aren't)?
- **Fix:** replace "both birds" with "every bird"; define the hunter's 2 vs 2 + hunter win in its own terms (test something reachable, such as two knock-outs); add "teammates share sight" or state they don't; ban stones on a teammate's square the same way kicks are banned, or allow both.

### 16. The hunter's only win may be too hard in 3 players and 2 vs 2 + hunter, and it acts as kingmaker
- **Rules:** 9.1 to 9.3, 7.3, 7.1/7.2 sight.
- **Situation:** 9.2 or 9.3 always ends the game by round 30, so the hunter must knock out every bird first: four catches in 3 players, possibly eight in 2 vs 2 + hunter. Birds move as fast as the hunter and see it within 2; the hunter only senses. Each knock-out it makes hands a likely win to the other bird's side, so its choice of target decides between the other two players.
- **How often:** every 3-player and 5-player game.
- **Fix:** nothing to change in the text until playtest numbers exist; track hunter win rate against the 33% target and kingmaking complaints. If low, the scoring change in finding 6 (catches count) or a shorter knock-out (2 catches total across birds) is the lever.

### 17. Two clocks, unclear start values, and warming defined twice
- **Rules:** 7.1 needs (eat every 15 "turns", eggs every 15 "rounds"), 3.4, 5.4.
- **Situation:** each ostrich has one turn per round, so the two words mean the same thing but read as different rules. The start values aren't stated (is the ostrich fed at setup? does the egg clock start at setup?). 3.4 lists warming as something that happens on landing; 5.4 treats it as where you stand. When exactly does an egg last warmed in round 15 go cold, end of round 30 or start of 31?
- **Fix:** "Every ostrich must eat, and every egg must be stood on, at least once every [15] rounds, counting from the start." Remove warming from 3.4's list and keep it as a position rule.

### 18. Carrying has an extra state with no visible effect
- **Rules:** 7.1 carry, 4.5.
- **Situation:** the egg "in the beak" is set down under the ostrich before its next turn. The only things that could happen in between: a stone at the ostrich's square (always kicked back) or a catch (4.5 drops the egg on the same square). So the beak state changes nothing except "not warmed", which the next turn's standing undoes. Also unstated: must the ostrich be standing on the egg to pick it up? Is carrying visible to the vulture?
- **Fix:** "Carry: instead of a normal move, move 1 square taking the egg you stand on with you." Delete 4.5 and "an egg in the beak is not warmed". State whether others can see a carry (suggest no, same as a 1-square move).

### 19. Rose dots and pounce are underdefined
- **Rules:** 7.3, 7.4 ("Sense: as the hyena").
- **Situation:** "every square where a bird could be" could mean all squares within 2 that a bird could stand on (useful only with pounce narrowing) or something narrower. Does sense say which kind of bird? What if the second reading is "no bird"? Can the hyena pounce after staying still? "Sense: as the hyena" could be read to give the badger pounce too.
- **Fix:** "Rose dots: every square within [2] a bird could stand on." "Pounce: if the second reading still finds a bird, move 1 more." Write "Sense (not pounce): as the hyena" on the badger card.

### 20. Setup gaps
- **Rules:** 2 setup.
- **Situation:** can the ostrich start on an egg, on a leaf, on or next to a hunter's or the vulture's start square? Can eggs be hidden on a start square or next to each other? Who chooses hyena or badger in 3 players?
- **Fix:** "The ostrich starts on any empty ordinary square at least [3] from every other animal" and say whether eggs may touch each other.

### 21. Sitting is visible, but kicking from an egg isn't said
- **Rules:** 7.1 sit, 7.1 kick ("if on an egg, it keeps standing on it").
- **Situation:** staying on an egg is shown to every viewer. A kick while on an egg also keeps the ostrich on the egg without moving; is that shown as sitting? If not, kicking becomes a free way to warm in place without revealing the egg.
- **Fix:** "Anyone who sees the ostrich sees when it ends its turn on an egg without moving", covering both.

### 22. Who gets credit for a knock-out in Hunters mode
- **Rules:** 4.3, 9.1.
- **Situation:** hyena catches the vulture once, badger catches it second. 9.1 counts knock-outs per hunter but the book doesn't say the second catcher gets it. That invites last-hit stealing, which may be fine, but it should be written.
- **Fix:** "The hunter that makes the knock-out catch scores the knock-out." Or move to catch-only scoring (finding 6).

## Looks solid; don't change

- **Pushes are not moves (5.4).** It stops pushes from chaining into catches, finds or refills, which removes most runaway chains.
- **"Your square works first" (3.4).** An ostrich eats and a vulture finds before a hidden badger catches them; easy to explain and fair.
- **Two catches to knock out, and the caught bird keeps playing (4.2, 4.3).** Gives a warning before elimination.
- **Leaves and rock piles never wreck.** Prevents the vulture from starving the ostrich or locking itself out of stones.
- **The round cap and the ending order (9).** Every game ends; no stalemate can run forever.
- **Symmetric sight within [2] between birds and hunters, and between hunters.** Easy to remember and fair both ways.
- **One stone at a time, refilled only at two rock piles.** Keeps the vulture's attacks costly and readable.
- **Side wins even when your animal is knocked out (9.2, 9.3).** Keeps knocked-out players watching; extend it per finding 6 rather than remove it.
- **Kick preview before confirming.** Good for kids; just limit it to what the ostrich can see (finding 4).
