# L2 lobby + all-white default look review

> Pictures named in this file are not in the working tree. Recover them from commit `548f054995d139568c4613e4db85ee2629ee3bee`. See [docs/reviews/README.md](../README.md).

- Real-play WebKit phone shots: 390 × 664 CSS pixels, 2× pixel density.
- Every-screen contact sheet (`00-contact-sheet.png`)
- Before / after: wrecked square, How to play, vulture + egg, ostrich + egg (`before-after-steer3.png`)
- Earlier before / after (`before-after.png`), close-ups (`closeups.png`)
- Eggs at real size (`eggs-closeup.png`), made with `node tools/icon-tests/make-eggs.js` then `node tools/icon-tests/shot.js eggs.html <out>` (3× phone pixel density).
- Ostrich's approved caption (`howto-ostrich-approved.png`), vulture's approved caption (`howto-vulture-approved.png`).

## What to review

L2 waits for a second seat before the role choice. The all-white B&W look is now the default; all 13 other themes remain selectable. A returning player starts in it once, then their next selection sticks. No invented theme name: the unnamed look has no theme tooltip, rather than “undefined”. Hyena and Badger lobby art uses thin lines.

Carry is Brian's selected option 4 (egg on a lifting curve). Eggs have narrow tops and broad, round bottoms. A bird and egg share a square side by side; the countdown sits beneath the egg. YOU is above the square, not on the bird/egg, and is confined below modal screens. Wrecked squares have a clean X without debris in this look.

H1 pictures are 4 × 2 crops from real play, not invented boards. The ostrich's found-egg picture uses its own view so the vulture is not labelled YOU. Other themes retain their drawn pictures. A newly found filled egg pulses twice for 1.1 seconds; already-found eggs do not start another pulse on redraw. How to play's found picture gives a gentle two-pulse cue. Both are disabled with reduced motion.

Approved filled-egg captions, verbatim:
- Ostrich: “Filled egg: a vulture found your egg.”
- Vulture: “Filled egg: you found it. Throw a stone at it.”

Hunters keep the old text for now. Proposed for Brian's approval, not implemented: “Filled egg: a vulture found an egg.”

Header/status spacing is trimmed. The two-player board already fills the phone's width, so its squares cannot grow further; trimming the header moves it up instead.

## Reproduce

Install dependencies with `npm ci` and `npm run setup:e2e`. Run one suite at a time.

- Screens: `node tools/shots-real-play.js <out> <sequence>`; sequences: start, lobby, vulture, ostrich, hyena, badger, howto, howfound, over.
- Crop assets: run vulture, ostrich, over, howfound with `HOWCROPS=1`; run howfound after ostrich so its role-correct how-to shot is retained.
- Review sheet: `python3 tools/build-bw-review.py <out> [earlier-shots]` (requires Pillow).

## Merge gate

Do not merge until Brian says yes in PR #21 and nobody is playing. Merging restarts the live server and ends games.

Environment note: `/etc/apt/apt.conf.d/99proxy` was added on the box for the apt HTTP proxy while installing WebKit libraries. It is not a repository change.

## Test results (Nov 8, 2026, PT)

- Full `npm test`: **42 / 44 suites passed**. The new `e2e-bw.js` is the 44th suite.
- `e2e-join-code`: failed while dereferencing Start before the second-seat response had created it. The test now waits for the element to exist and be enabled; passed alone with `node tests/run-all.js e2e-join-code`.
- `e2e-stone`: failed during its theme-loop read of `.rockcall` (line 84); passed unchanged when rerun alone with `node tests/run-all.js e2e-stone`.
- Final isolated regression checks: `e2e-bw`, `e2e-part1`, `e2e-you` all passed. They verify default theme/H1, both exact approved captions, ostrich-specific found view, finite pulse/reduced motion/no replay on redraw, nonoverlapping bird/egg/countdown, and YOU readability/placement across all 14 themes.
- Earlier development run: 40 / 43. Its failures were join-code, part1, you. Join-code passed alone; part1 and you initially failed alone, then passed after correcting the YOU font/placement and updating obsolete full-size/miniature-DOM expectations. No final failing suite remains without a passing isolated rerun.
- Full output: [npm-test.log](npm-test.log). Individual final rerun logs are adjacent (`rerun-e2e-*.log`). No two suites were run concurrently.
