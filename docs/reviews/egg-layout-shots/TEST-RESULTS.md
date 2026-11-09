# Test results — remove on-square catch markers (2026-11-08)

## Full `npm test`
- **54 of 55** suites passed on the first full run.
- **PASS** includes `e2e-catch-markers.js` (header pips still fill) and `e2e-hunter-phone.js` (asserts no on-square hurtag/claw/injured; header pip + chip injured).
- **FAIL** `e2e-consistency.js` (0s): `EADDRINUSE` on port 3992 from a leftover process. Not a product failure.

## Isolated rerun
- Freed port 3992, set `PLAYWRIGHT_BROWSERS_PATH` to `node_modules/.pw-browsers`.
- `e2e-consistency.js`: **PASS** — 13 theme/mode walks, **366 checks**, no browser errors (~667s). Log: `isolated-reruns.txt`.

## Real-play captures
- `node tools/shots-real-play.js docs/reviews/egg-layout-shots catch`
- New: `catch-bird-after-no-square-mark.png`, `catch-hunter-after-no-square-mark.png`
- Viewed both: bird phone shows one filled pip on the vulture chip and a clean board square (YOU only); hunter phone shows the same filled pip and no bird/claw/heart on the board (scramble destination correctly hidden).
- Contact sheet rebuilt: 67 screens → `00-contact-sheet.png`.

## Change under test
- Removed `markHurt` (board `.injured` / `.hurtag` hearts), board claw burst (`h3claw`), and board injured CSS.
- Header chip pips / `.bchip.injured` / OUT unchanged.
- Docs: RULEBOOK-v2 4.6, egg-layout README, OPEN-ITEMS, DECISIONS/STATE dated lines, audit supersession notes.


---

# Current correction: kicker sees the full actual slide

Brian's 2026-11-08 decision reverses kick-landing filtering for the kicker only. Full travel and stopped-early kicks animate every actual square in about one second; non-kickers retain normal sight. Explicit server event trails do not expose unrelated obstruction positions or grant ongoing hunter sight. Knocked-out full god views remain unchanged.

Numbered partner finds, named team-smash messages, watcher kick/stone/meeting and all three burst perspectives are approved and implemented. Numbered kickback watcher and vulture-target kick extensions remain DRAFT.

Verified 2026-11-08 17:29 PST; suites ran sequentially.

- **Complete `npm test`: 54/55 suites PASS.** [Full summary](kicker-full-npm-test.txt), source log `/workspace/bw/kicker-full-npm-test.log`. The only failure was `e2e-roles.js`, a 30-second wait for a 2v2 setup state acknowledgement at line 106. [Original diagnostic](kicker-full-e2e-roles-original-failure.txt) retained.
- The failed `e2e-roles.js` was rerun **ALONE, unchanged: 1/1 PASS** (30 seconds). No production or test changes were made for this rerun. Thus all 55 suites have passing results across the complete run plus isolated rerun; this is **not** represented as a clean 55/55 complete run. [Exact reruns](kicker-full-isolated-reruns.txt).
- Initial focused preflight: **4/5**. `testannounce.js` retained a legacy `/^Hyena shoved/` assertion; updated to the approved “The hyena shoved…” wording, then reran **ALONE: 1/1 PASS**. Follow-up approved-message/rules preflight **4/4**; badger kick E2E **1/1**. The complete run also passes these suites.
- All 13 consistency walks / **366 checks, no browser errors** (652 seconds). Pulse/reduced motion, catch markers, team sharing, full knocked-out god views, hunter egg privacy, hidden catch-scramble locations, status queue and prior input fixes still pass.
- Kicker gets the complete explicit server kick trail and actual landing, including early stops before a wreck or an animal (hidden badger obstruction included), in **3p, Hunters and 5p**. Far watching vultures and the other ostrich retain normal filtering. The kicked hunter sees its own full path. The event grants no ongoing hunter sight or separately transmitted blocker coordinate/identity; an inference from an early stop is an accepted trade-off.
- `e2e-motion-views.js` passes with **22 freshly generated phone captures**: full three-square and stopped-early two-square kicks, five frames per sequence per phone, plus static reduced-motion trails. Duplicate packets preserve the full slide. The capture fixture now clears stale prior action notices before the second sequence. Frame strips show the current complete-run images, not stale earlier captures.
- [Ostrich strip](kick-ostrich-strip.png), [hyena strip](kick-hyena-strip.png), [both](kick-both-phones.png); 58-screen contact sheet (36 prior review states + 22 updated kick views). Runtime code stayed unchanged after the complete run began.
- Exact approved numbered partner-find/team-smash and watcher kick/stone/meeting/burst wording is implemented. Numbered kickback watcher, vulture-target kick and multi-hunter stone extensions remain drafts. Big-scene duration/skip design remains unapproved and unbuilt; ordinary board movement is about one second.


---
Earlier completed results follow; their kicker-fade assertions/frames are superseded by the current full-slide decision above.

# Previous completed correction: knocked-out birds KEEP god view (28de96c)

Brian corrected the earlier interpretation on 2026-11-08. The filtering discussed in the historical results below is removed. Current tests require full read-only knockout views in 3p, Hunters, 2v2 and 5p, plus Classic full reveal when its knockout ends the game. Living hunter egg privacy and living-player kick/scramble filtering remain. Exact approved interaction lines and viewer-filtered, one-second board movement are also included.

Verified 2026-11-08 16:57 PST. Tests run sequentially, not concurrently.

- **Full `npm test`: 55/55 suites PASS**, 1,271 seconds (~21m 11s). [Complete summary](god-motion-npm-test.txt); full log `/workspace/bw/god-motion-full.log`.
- No failures in this complete run, so no full-run failure rerun was needed. Earlier correction preflights were 6/8 (`testannounce.js`, `testcatch.js` had stale numbered-ostrich wording) then 11/12 (remaining `testannounce.js` wording); both corrected tests were rerun **ALONE** after the full run and passed **1/1 each**. [Exact isolated commands/results](god-motion-isolated-reruns.txt).
- `testviewprivacy.js` and `testinteractiontext.js` were each rerun **ALONE**, **1/1 each**, after adding explicit buried-badger god-view and Ostrich 1/2 stone-kicker assertions during the full run's browser phase. Production code was frozen before the complete run; only these extra unit assertions were added later.
- Actual kick capture preflight: 5/5, then the strengthened `e2e-motion-views.js` reran alone, 1/1. An initial capture-driver branch skipped the kick sequence; that was fixed and the E2E now requires actual before/start/mid/after files and verified animation/opacity keyframes, not a no-op exit.
- Full run: all 13 consistency walks / **366 checks, no browser errors** (654 seconds); B&W pulse/reduced motion, uniform eggs/count padding, caught-marker pixels, status timing, all-role god/normal visibility, approved personal notices and numbered identities pass.
- Full god view restored for knocked-out vultures and ostriches in **3p, Hunters, 2v2, 5p**. Explicit coverage includes all eggs and hidden/buried badgers, no actions. Classic reveals the full board when its knockout ends the game. Living hunter egg privacy, hidden kick landings, indistinguishable wreckage and hidden catch-scramble locations remain protected.
- New phone captures: [both kick views](kick-both-phones.png), [ostrich strip](kick-ostrich-strip.png), [hyena strip](kick-hyena-strip.png), reduced-motion static trails and expanded 46-state contact sheet. The ostrich sees only its permitted slide prefix; the hunter sees its own whole slide, with no hidden ostrich board position.
- No big cut-scene duration or tap-to-skip design approved, built or locked in. Ordinary board motion remains about one second.


---
Historical runs follow (preserved, not rewritten as current policy).

# Egg fixes — test record

Tests were run sequentially, never with two test suites competing for the same browser/server resources.

## Earlier complete run, before the audit additions

`npm test`: **48/49 suites passed**. The only failure was `e2e-consistency.js`: its first 12 theme/mode walks passed, then the final pass-and-play neon walk timed out waiting for a playable turn/handoff (15-second wait, suite elapsed 659 seconds). This failure is retained, not reported as a clean full run. Full log: `/workspace/bw/egg-release-full.log`.

The full run passed all units, hunter-privacy coverage, egg geometry/pulse/reduced-motion coverage, catch-marker coverage, push/scramble coverage, and all other E2E suites. A final status-text stacking fix was made after that run’s B&W phase, so B&W is explicitly rerun alone below.

## Isolated reruns of that earlier run

- `node tests/run-all.js e2e-consistency.js`: **FAILED** after seven complete walks: tactical hint was stale “Too far.” Log `/workspace/bw/egg-release-rerun-e2e-consistency.js.log`; full diagnostic `/workspace/bw/egg-release-rerun-e2e-consistency-detail.log`. This was not dismissed as a harmless flake. Deferred taps could survive into a later state; duplicate pass packets could cancel a pending handoff timer. Both runtime hazards now have fixes and direct regression tests. The subsequent complete run passes all 13 consistency walks (366 checks, no browser errors, 661 seconds).
- The final opaque fact/announcement/sniff priority checks passed in the audit preflight and subsequent complete run’s `e2e-bw.js` phase.

## Earlier failures and their isolated reruns

- First egg-layout complete run: 44/45. `e2e-roles.js` assumed fixed nest squares despite randomized setup. It now chooses legal setup positions and waits for its own state change; isolated rerun passed.
- Next complete run (`/workspace/bw/egg-complete-full.log`): 45/49. `testannounce.js` and `testbadgerlines.js` still expected the old approved words; updated expected wording. `e2e-hunt.js` assumed the opening hunter stayed visible and used an obsolete buried-badger collision rule; test now checks actual view/active hunter elements and correct sharing rules. `e2e-stone.js` reused stale `myTurn` before its last flight was acknowledged; now waits for the socket position acknowledgement. **All four passed when rerun alone**, logs `/workspace/bw/egg-complete-rerun-<filename>.log`.
- Badger/catch preflight: 6/8. The new pixel assertion exposed a tutorial overlay in its fixture; the hunter test exposed the obsolete buried-badger expectation. Both fixture expectations were corrected; isolated follow-up 2/2.
- Final egg/sprite/catch/push preflight: 3/3 (`/workspace/bw/egg-last-preflight.log`).

No test was skipped to conceal a failure. Screenshots and mockups are not substitutes for these assertions.

## Audit additions / updated requirements

- Initial audit preflight: **9/11**. `e2e-announce.js` and `e2e-kick.js` still expected one identical third-person line on every phone / a three-second hold. Updated to viewer-specific draft interaction words and Brian’s approximately one-second timing; follow-up passed both.
- Audit regression preflight: **8/8** — `testinteractiontext.js`, `teststatusqueue.js`, `testviewprivacy.js`, `e2e-announce.js`, `e2e-kick.js`, `e2e-pass.js`, `e2e-queued-tap.js`, `e2e-status-queue.js`. Includes actual stone hits in all hunter modes, mid-game knockout privacy, retained team sharing and end reveal, duplicate handoff, stale tap cancellation, actual phone text priority and hold timing.
- **Final complete post-audit `npm test`: 51/54 suites passed.** Log `/workspace/bw/egg-audit-full.log`, committed summary [npm-test-summary.txt](npm-test-summary.txt).
- The three failures were assertions against the then-implemented filtering (not Brian’s final decision): `testplay.js` expected mid-game god view; `testv2.js` expected stone-note keys without the new coordinate-free actor/target identities; `e2e-you.js` waited for a knocked-out bird to enter god view. At that stage those tests were changed to require the filtered view / metadata; knockout filtering is now reversed in the current correction above. **Each was rerun ALONE and passed (1/1 each)**. Logs `/workspace/bw/egg-audit-rerun-{testplay.js,testv2.js,e2e-you.js}.log`; committed [isolated-reruns.txt](isolated-reruns.txt).
- At that historical checkpoint, production code did not change after that complete run; only these three stale test expectations were updated. All 54 suites have passing results across the complete run plus isolated reruns. This is deliberately **not** reported as a single clean 54/54 full run.
- Complete consistency: all 13 theme/mode walks, 366 checks, no browser errors,661 seconds. B&W wrapping/pulse/reduced motion, all egg geometries, all-role catch-marker pixels, viewer-safe push/reduced-motion trails, actual stone-hit identities, knockout privacy, team sharing, end reveal, status priority, stale taps and duplicate handoff all pass.
