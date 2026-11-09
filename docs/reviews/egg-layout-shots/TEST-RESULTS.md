# Current correction: knocked-out birds KEEP god view

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
