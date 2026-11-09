# One egg slot, padded countdown — follow-up to merged PR #21

Based on `origin/main` at `559a847`, on the new `egg-fixes` branch. Nothing in this follow-up was pushed onto the old PR #21 branch. No merge or deployment is performed by this PR.

## Visible changes

- All board eggs use exactly the same upper-left SVG box: own, filled “is here”, dashed “may be here”, found, and carried, with or without an animal/countdown. The pointed egg path is unchanged.
- The shared layout applies to all 14 themes and drawn mini boards. It replaces the former state-dependent B&W sizes/locations.
- A sharing animal sits at lower-right without covering the egg. Countdown numbers sit beside the egg, with fixed 4px top/right padding. One- and two-digit numbers stay inside, clear of the egg, animal and square edge.
- The short found-egg pulse now changes opacity, not scale: eggs keep their size and position even during the pulse. Reduced motion still disables it.
- Both hunters now use Brian's approved caption, exactly: **“Filled egg: a vulture found an egg.”** Ostrich and vulture captions are unchanged.
- The existing H1 crops were regenerated earlier from actual play solely for the functional egg geometry. These already-made crops are retained; no proposed animal art or additional How-to refresh is included. Further art refresh waits for Brian’s icon picks.

## Behavior and privacy fixes

- Hunter server packets previously reused vulture `spotted` egg marks, including shared 5-player marks. Hunters now receive only public hit/stone wreckage, never found-egg coordinates or egg arrays during play; client rendering is defensive too. Actual legal-find tests cover 3p, Hunters and 5p.
- B&W’s transparent reset hid `.pip.on`. A catch now visibly fills the header chip pips above the board; knockout has a high-contrast OUT state. A caught bird’s square gets no board mark (no heart, claw, or injured outline). Catches show only as filled pips / lost hearts in the animal row. Tests cover all viewers in all three multiplayer modes and assert a screenshot-visible header change.
- Pushes use an approximately one-second, square-by-square motion with trails, regardless of distance. Reduced motion uses static trails. Only viewer-permitted squares are sent or drawn. Brian’s updated rule: the kicking ostrich sees the full actual kick slide and landing beyond normal sight, including an early stop. This event-only exception does not grant ongoing sight or reveal the blocker. The kicked hunter sees its own whole slide, with no hidden bird square revealed; other watchers keep normal sight filtering. Never draw a hidden scramble destination; hunters never get the caught bird’s scramble animation. Duplicate packets preserve the animation clock. FX sprite themes use the same separated animal box.
- Approved catch notices use the real distance and singular/plural: “You were caught! You fled 2 squares.” Other viewers see “The <hunter> caught the <bird>!” without the destination.
- Long facts wrap cleanly with padding and an opaque backing at iPhone 13 width. A shared queue holds one status for about a second, prioritizing personal events; no sniff or fact paints over it.
- Brian’s corrected decision: knocked-out birds have a read-only full-board god view while the game continues, including all eggs and hidden/buried hunters. Living seats keep their normal sight. Non-kickers’ hidden kick landings are removed from move notes too; hunter wreckage packets cannot distinguish smashed eggs from empty wrecks. Finished games deliberately reveal all eggs/animals to everyone. Team egg/found-egg sharing is retained and RULEBOOK-v2 now says so.
- The 3p stone adapter incorrectly emitted a badger-pop event when pushing any hunter; it now emits that event only for a genuinely buried badger. Named stone-hit events identify the actual hunter.
- Delayed taps cannot execute or replace hints in a later game state; duplicate pass-and-play packets no longer cancel the pending handoff timer.
- Player-facing naming is now **badger / Badger**, including notices, quotes, roles, end screens and rulebook documents.

## Review images

- [Kick on both phones: before / start / mid / after](kick-both-phones.png) · [ostrich strip](kick-ostrich-strip.png) · [hyena strip](kick-hyena-strip.png)
- [Reduced-motion kick — ostrich](kick-ostrich-reduced.png) · [hyena](kick-hyena-reduced.png)
- [Contact sheet — 67 phone screenshots](00-contact-sheet.png)
- [Real YOU + egg + bird + 14, plus egg states](eggs-closeup.png)
- [Enlarged real square with YOU + egg + bird + 14](you-egg-bird-14-closeup.png)
- [All egg states at real size, 1/14 countdowns, plain/lit squares](eggs-real-size.png) — WebKit at 3× phone pixel density; contact-sheet/combined-sheet copies are scaled.
- [Before / after](before-after-steer3.png)
- [Carried egg in real play](ostrich-d-carried-egg.png)
- [Hyena caption](howto-hyena-approved.png), [Badger caption](howto-badger-approved.png)

Full-screen shots use WebKit, a 390×664 CSS-pixel phone, 2× pixel density. The icon fixture uses real game classes, paths and stylesheet files at 38px square size; the separate fixture test verifies geometry in all 14 themes.

- Catch scramble (caught bird): [before](catch-scramble-0-before.png), [start](catch-scramble-1-start.png), [mid](catch-scramble-2-mid.png), [after](catch-scramble-3-after.png), [reduced motion](catch-scramble-reduced-motion.png).
- After a catch, no square mark: [bird phone](catch-bird-after-no-square-mark.png), [hunter phone](catch-hunter-after-no-square-mark.png).
- [Long wrapping fact](status-long-fact.png).

## Reproduce

Run `npm ci` and `npm run setup:e2e` first. Run only one test suite at a time.

1. `HOWCROPS=1 node tools/shots-real-play.js <out> <sequence>` for vulture, ostrich, over, howfound (in that order).
2. Run `node tools/shots-real-play.js <out> <sequence>` for start, lobby, vulture, ostrich, hyena, badger, howto, over, carry, howfound, catch, kick. Keep howfound after howto to retain the ostrich's role-correct How to play shot.
3. `REVIEW_OUT=docs/reviews/egg-layout-shots python3 tools/build-bw-review.py <out> [earlier-shots]`.
4. `node tools/icon-tests/make-eggs.js` then `node tools/icon-tests/shot.js eggs.html <icon-shot>`.
5. `python3 tools/build-egg-closeups.py <out> <icon-shot> docs/reviews/egg-layout-shots`.

Image composition needs Pillow. The game has no runtime dependency on Python or Pillow.

## Wording / test review

[Approved personal/watcher/team wording and remaining DRAFT extensions](WORDS-FOR-APPROVAL.md). [Complete runs and isolated reruns](TEST-RESULTS.md). The approved two-ostrich reminder is saved there for mockup-first work after icon selection, not newly built here.

## Merge gate

Do not merge. Brian must approve a no-game time before any merge: restarting the live server ends games. Merely pushing this separate branch and opening its PR does not deploy it.
