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
- The three failures were stale assertions against the newly approved policy: `testplay.js` expected mid-game god view; `testv2.js` expected stone-note keys without the new coordinate-free actor/target identities; `e2e-you.js` waited for a knocked-out bird to enter god view. Those tests now require the privacy-preserving view / appropriate metadata. **Each was rerun ALONE and passed (1/1 each)**. Logs `/workspace/bw/egg-audit-rerun-{testplay.js,testv2.js,e2e-you.js}.log`; committed [isolated-reruns.txt](isolated-reruns.txt).
- Production code did not change after this complete run; only these three stale test expectations were updated. All 54 suites have passing results across the complete run plus isolated reruns. This is deliberately **not** reported as a single clean 54/54 full run.
- Complete consistency: all 13 theme/mode walks, 366 checks, no browser errors,661 seconds. B&W wrapping/pulse/reduced motion, all egg geometries, all-role catch-marker pixels, viewer-safe push/reduced-motion trails, actual stone-hit identities, knockout privacy, team sharing, end reveal, status priority, stale taps and duplicate handoff all pass.
