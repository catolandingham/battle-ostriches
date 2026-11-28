# Hints handoff (feat/play-hints)

Done: inventory (docs/HINTS-INVENTORY.md), public/play-hints.js (62 table rows: rules, marks, scenarios, reminders), switch in both menus, e2e-play-hints.js.
Not built / left: see "Not built" in the inventory (teammate-in-trouble before a knock-out, setup phase, "?" button). All wording is pending Brian's yes.
Not checked: Pass & Play on a real phone, team modes (4, 5) and 4h in a browser, the cutaway hint line, themes other than the black-and-white look, dark mode, desktop width, and #96's stacking rules (the hint sits at z-index 350 to match; #96 is not on this branch).
Rerun: `node tests/run-all.js e2e-play-hints e2e-kick e2e-tooltip e2e-turnline e2e-pass`.
