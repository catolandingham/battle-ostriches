<!-- New dated log for 2026-11-11. The Drive master is still the live DECISIONS file; copy these lines there. -->

# Battle Ostriches: decisions (2026-11-11)

- 2026-11-11 (Brian, kick review): Combined is the kick path (Look out! 1s after the action is committed, then the cartoon, then the real motion at 0.6s per square with the landing hidden until it arrives, then hold until "Tap to go on."). Apply the same path to the other surprise hits so he should not need to review each moment. Approved words: "Look out!", "Tap to go on.", plus existing lines; "You're on the egg!" stays the V1 line when the vulture is on a found egg with a stone.
- 2026-11-15 (Brian, rule clash R1): "Give the hunter its last move in round 30 in every mode." The 3-player and Hunters games used to end right after the ostrich's turn in round 30; now the hunter (both hunters in Hunters mode) moves first, as in the 5-player game. Test: `testlastround.js`.
- 2026-11-15 (Brian, rule clash R2): "Yes, warm the egg when the ostrich's time runs out while it is standing on it." Applies in 3-player, Hunters, 4- and 5-player games. A lost turn (knocked back) still does not warm. Test: `testtimeoutwarm.js`.
