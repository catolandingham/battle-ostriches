# Open items

> Working list from 2026-11-08. It overlaps the state snapshot and was not folded into it. Current state is `docs/project/STATE-2026-11-08.md`. Later decisions are in `docs/project/DECISIONS-2026-11-11.md`.

Dated 2026-11-08. This list does not approve any new words or any new look.

The animal is called the badger.

## In progress

- 2026-11-08: Audit busy screens with real-play iPhone captures: first three turns of every mode and the caught bird’s view; propose spacing and a clear personal catch moment (report first).
- 2026-11-08: Keep full-board god view for knocked-out birds in every mode; restore in PR #23, read-only.
- 2026-11-08: Same-size top-left eggs; countdown inside square; lone egg small in top-left.
- 2026-11-08: Hunters caption: “Filled egg: a vulture found an egg.”; fun-fact box fits its text.
- 2026-11-08: Fix hunter found-egg leak server-side (another worker); catch pips visibly change, with tests.
- 2026-11-08: Kicker sees the entire actual kick slide/landing, including early stops outside ordinary sight; other watchers keep normal sight.
- 2026-11-08: Numbered partner-find/team-smash and watcher kick/stone/meeting/burst lines approved; see `reviews/egg-layout-shots/WORDS-FOR-APPROVAL.md`.
- 2026-11-08: Push slide square by square with trail, about 1 second total; respect reduced motion and hide scramble destinations.
- 2026-11-08: Approved notices: “You were caught! You fled 2 squares.” / “The hyena caught the vulture!” with actual animals and no scramble location.
- 2026-11-08: Who-sees-what audit across every mode and role.
- 2026-11-08: Kick cut-scene: 2-second scene with other squares frozen (done). Big ostrich kick-foot animation parked for later (4 versions, v2). Catch-marker mockups decided: no on-square mark; header hearts only (in PR #23).
- 2026-11-08: Corner mockups: eggs top-left, rocks top-right, food bottom-right, number bottom-left.
- 2026-11-08: Egg countdown mockups: inside egg, beside egg, or no-number visuals.
- 2026-11-08: Timer-bar mockups: filling or shrinking.
- 2026-11-08: Mode-differences list and start-of-game reminder mockups.
- 2026-11-08: Hunter claw-mark counter under icon (PR #24): curved three-scratch sets, 3 in 3-player games, 4 in Hunters and 5-player games, one more per extra catch; no numbers. 3 catches win 3-player mode.
- 2026-11-08: Animals stay centred; with an egg about 58%, on a leaf/rock about 70%; ink (not boxes) must not overlap; corners only when two animals share (PR #24).
- 2026-11-08: Three or four hyena icon mockups at real size; animal stays hyena.
- 2026-11-08: Animal commentary lines: draft lines for the hyena, the vulture and the ostrich, needing Brian's approval.

## Waiting on Brian

- 2026-11-08: Review original hyena, vulture and ostrich commentary drafts; approve words and allowed moments before any implementation, without adding clutter or revealing hidden events.
- 2026-11-08: Approve new words and each open look before building.
- 2026-11-08: See big-scene samples first; no duration or skip design approved (Brian is leaning toward about 2 seconds). Ordinary board animations stay about 1 second.
- 2026-11-08: Confirm nobody is playing before any approved merge; deployment ends games.
- 2026-11-08: Game saving with Render Key Value when Brian is at a computer.

## Later

- 2026-11-08: Wire the approved ostrich-carry icon (carry v4 option 2: beak open a little, egg B sideways inside) into the game; art at public/art/ostrich-carry.svg.
- 2026-11-08: Big ostrich kick-foot animation (4 versions made, v2); kicks keep the 2-second scene with other squares frozen.
- 2026-11-08: Other cut-scenes: catch, knock-out, egg smash, badger burst, stone hits egg.
- 2026-11-08: Section 7.4: vulture marks hidden from ostrich; birds seeing dig blocked from burrow; badger warning lines.
- 2026-11-08: Practice round where players make actual moves; approve words first.
- 2026-11-08: Walk icon; theme names; ring cleanup PR; PR #19 render.yaml.
- 2026-11-08: 5-player balance.
- 2026-11-08: Audits: rulebook versus code; mode differences; words about you versus others; looks and motion.
