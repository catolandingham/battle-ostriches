# Battle Ostriches: fewer words, clearer signals (UX audit, 2026-11-07)

Brian's direction: players give text about one second, most don't want to read at all, so the screen should show what to do and words come last. Less is more. Never name a visual in rules or cards. Keep the look consistent across all 13 themes and with conventions people already know from other apps and games. Keep icons quiet and standard; the animal art carries the personality.

**How this was checked.** I read every player-facing string in `public/roles.js`, `ui.js`, `three-ui.js`, `catchtext.js`, `badgerlines.js`, `index.html`, `tutorial.js`, `ring.js` (button labels) and the server's end-of-game and stone lines (`game.js`, `three.js`, `hunt.js`, `team.js`). I read the CSS that draws each signal (`vocab.css`, `three.css`, `squares.css`, `style.css`, `themes*.css`, `fx.js`). Then I ran the game's own server in memory (no files written to the repo, repo still clean) and took phone-size screenshots of the same Hunters-mode position in all 13 themes, from the ostrich, the hyena and the vulture. Contact sheets are in `ux-shots-2026-11-07/` next to this file. Contrast numbers below come from pixel samples of those screenshots, so they are measured, not estimated. The screenshots used Chrome's iPhone 13 emulation; check the layout findings on a real phone.

---

## 1. Ten principles for words and signals in a family phone game

1. **Assume one second of reading, which is about four words.** Adults read about 238 words a minute silently (Brysbaert 2019 meta-analysis), so one second holds about four words; children read slower. Most people scan instead of reading (Nielsen: 79% of test users scanned). Targets: buttons 1 to 2 words, hints 3 to 7, announcements one short sentence, role cards 4 short lines. [Brysbaert](https://www.Gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf), [NN/g, why users scan](https://www.nngroup.com/articles/why-web-users-scan-instead-reading/)
2. **Start every instruction with the verb.** "Tap a square to move," not "You can move by tapping a square." The first two words are the ones that get read (NN/g scanning research above).
3. **Show it on the board before saying it.** Hodent's "signs and feedback" pillar: a sign invites the action, feedback confirms it, and both reduce the need for tutorial text. [Hodent, *The Gamer's Brain*](https://www.routledge.com/The-Gamers-Brain-How-Neuroscience-and-UX-Can-Impact-Video-Game-Design/Hodent/p/book/9780367638184), [GDC 2016 talk on onboarding](https://gdcvault.com/play/1022951/The-Gamer-s-Brain-Part), [summary of the pillar](https://www.creativebloq.com/features/how-neuroscience-and-ux-impacts-video-game-design)
4. **Teach a rule at the moment it matters, once.** A study of 45,000 players found tutorials helped only the most complex game; for games you can learn by trying, up-front tutorials added little. Kick, Carry and the stone bounce can all be taught the first time they become possible. [Andersen et al., CHI 2012](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/), [Ernest Adams, eight ways to make a bad tutorial](https://gamedeveloper.com/design/the-designer-s-notebook-eight-ways-to-make-a-bad-tutorial)
5. **Put details one tap away.** Show the essential option first and the rest on request (progressive disclosure). The "?" button and long-press already do this; the on-screen text should not repeat what they hold. [Nielsen on progressive disclosure](https://jakobnielsenphd.substack.com/p/progressive-disclosure)
6. **One meaning gets one look, in every theme.** Users should never wonder whether two different looks mean the same thing (NN/g heuristic 4, consistency and standards). Themes may restyle the floor tiles and the pieces; they never restyle a signal. [NN/g 10 heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
7. **Use the convention players already know.** People spend most of their time in other apps and games and bring those habits (Jakob's law, same NN/g page). Board-game apps already taught families what a legal move looks like: Chess.com and Lichess put dots on every square a selected piece can reach. [Chess.com legal-move dots](https://support.chess.com/en/articles/8708625-how-do-i-turn-on-off-the-legal-moves-dots-on-the-board), [Lichess chessground](https://unpkg.com/chessground@8.2.0/README.md)
8. **Shape first, color second.** Color must never be the only cue (WCAG 1.4.1), and any mark a player must notice needs 3:1 contrast against what is next to it (WCAG 1.4.11). Shape also survives a theme change. [WCAG 1.4.1](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color), [WCAG 1.4.11](https://w3c.github.io/wcag21/understanding/non-text-contrast)
9. **Pair an unfamiliar icon with a word the first time, and keep icons standard.** Only a few icons are universally understood; the rest need a visible label, and hover-only labels fail on touch screens. If no clear icon comes to mind in five seconds, use a word. [NN/g icon usability](https://www.nngroup.com/articles/icon-usability/)
10. **Every result needs visible feedback, in a small, brief, non-blocking message.** Show what happened right away (heuristic 1, visibility of system status). Transient messages follow the snackbar pattern: one short line, at most one action, one at a time, out of the way of the work. [NN/g heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [Material snackbars](https://m2.material.io/components/snackbars)

Rulebook writing adds one more: one worked example of a full turn teaches more than pages of definitions ([rulebook guide](https://neutronium-landing.pages.dev/blog/board-game-rulebook-design)). In this game, the first turn on the board is that example.

---

## 2. Conventions players already know, and where the game breaks them

Brian asked that each signal match what people already learned elsewhere, not only be consistent inside the game. "Standard" means a common UI symbol; "custom" means a picture made for this game. Default is standard.

| Meaning | Convention people already know | Where it comes from | What the game does now | Breaks the convention? |
|---|---|---|---|---|
| You can move here | A small dot in the middle of each reachable square | Chess.com, Lichess and most board-game apps | Yellow outline on the square, labelled "Legal step" in a key above the board | Partly. Outline works, but it is invisible on light themes (see 4.1), and "Legal step" is chess-engine jargon |
| Act on this piece (kick, catch) | A ring around the piece you can take | Lichess capture ring, Chess.com capture highlight | Same red-orange glow as a throw target | Yes. A piece target and a square target look the same |
| Aim here (throw) | Crosshair or reticle | Shooters, artillery and tower-defense games | Red-orange glowing square | Mild. Color only, no shape |
| Blocked, can't land | X, or a darkened square | "No" sign, closed road, greyed map tiles | Smashed egg square: red X. Stone-wrecked square: slate square with a grey stone | Yes. Two looks for the same rule (both are wrecked squares, rulebook 6.3), and the stone look matches the rock pile, which means "go here" |
| Go here to get something | The item's own picture on the tile | Pickups in almost every game | Rock pile (three grey stones), leaf | No. Keep. But see the stone conflict above |
| Unsure where something is | Dashed outline (placeholder, ghost) | Drag-and-drop targets, "ghost" pieces in Tetris and chess apps | Vulture: solid green square with dashed egg and "?". Hunter: a pink dot on every square in range | Partly. The solid green fill reads as "go/safe", and the hunter's 24 dots look like move markers |
| Your piece | A marker that never changes: a ring under your unit, a name tag, a "you are here" dot | RTS and MOBA selection rings, Mario Kart arrow, maps' blue dot | "YOU" tag, pulse at turn start. The ostrich and vulture art changes in 11 of 13 themes (black blob in Golden hour, pixel invader in Arcade, blue pawn in Toybox) | Yes. Your own piece looks different in each theme, and the YOU tag collides with the egg number and the HURT label |
| Hurt, lives left | Pips or hearts that empty | Zelda hearts, most arcade games | Pips on the header chips (good), plus a "HURT" word tag and a red slash on the piece | Partly. Pips follow it. The word tag is hidden behind the theme sprite in 9 of 13 themes |
| Seen by others | Eye icon | "Seen" in messaging apps, visibility toggles in Google Docs and Slack | Word tag "sitting" on the square; text "others can see you sitting" | Yes. A word where an eye would do, and the text names the wrong viewer |
| Something happened here | A ping: a short pulse ring on the spot | Map pings in Apex Legends, League of Legends, Fortnite | Pink pulse on the square (`h3kb`), plus a big pink box in the middle of the screen | Partly. The center box covers the spot it is about |
| Short news | Toast or snackbar: one line, top or bottom, fades, never blocks | Android and iOS system patterns, Material | `#announce`: hot-pink box fixed at 42% height over the board, 3 seconds, every event the same alarm color, including the neutral start line | Yes. It blocks the board and uses alarm color for neutral news |
| Selected tool | One consistent pressed state (outline or fill plus check) | Toolbars in every drawing app | Check mark is constant, but the fill color changes per theme: cyan, olive, red-orange, green, blue, yellow | Partly. Check is standard; color drift is not |
| Not available now | Dimmed to about 40% and grey | Material disabled state (38%), iOS | `opacity:.4` and grayscale in all themes | No. Keep. A lock icon would be wrong here (lock means "not unlocked yet") |
| Help | "?" button; long-press for detail | iOS and Android | "?" in the header; long-press shows square tooltips | No. Keep |
| Hidden from you | Fog of war: what you can't see is dimmed | StarCraft, Civilization, Warcraft | Nothing. Hunters just vanish beyond 2 squares; birds can't tell where they would see one | Missed chance. Fog would show "birds see within 2" without words. [Fog of war](https://en.wikipedia.org/wiki/Fog_of_war) |
| Cold vs warm | Red warm, blue cold; ring that drains like a timer | Thermometers, Apple Watch activity rings | Egg ring drains red to blue with a number | No. Keep |
| Time running out | Bar shrinks and turns red | Game shot clocks, iOS timers | Green bar turns red under 4 s | No. Keep |
| Your turn | Your piece and your controls light up; a short "Your turn" | Words With Friends, chess apps | Header glow plus "YOUR TURN ·" glued to the front of a long hint | Partly. Signal is right, but the words push the actual instruction out of the box |

**Emoji.** The game uses emoji as signals in several places (🐦 for the ostrich, 🦅 eagle for the vulture, 🐾, 🦡, 💡, 💥, ❄️, ⏳, 👃!, 👆, 🥚, 🪨, 🤖, 👤). Emoji draw differently on iPhone and Android, two of them are the wrong animal, and they read as cute. Replace them with the game's own animal art for animals and standard symbols for signals.

---

## 3. The visual vocabulary: one look per meaning, shape first, color second

Rule for every theme: themes restyle the floor tiles, the frame and the animal art. They never change a signal. Every signal carries a thin dark line and a thin light line around its shape, so it reads on a pale tile and a dark tile alike (the same trick the current rock-pile ring and throw glow half-use).

| Meaning | Shape (first) | Color (second) | Standard or custom | Convention |
|---|---|---|---|---|
| You can move here | Small filled dot, center of the square | Warm yellow, dark edge | Standard | Chess-app move dots |
| Act on this animal (kick, catch) | Ring around the animal | Warm yellow, dark edge (same family as the move dot) | Standard | Chess-app capture ring |
| Aim a stone here | Crosshair (circle with four ticks) | Orange, dark edge | Standard | Game reticle |
| Where it will land (preview) | Faded copy of the piece (ghost) plus a straight arrow | Piece's own colors at 45% | Standard pattern (ghost piece) | Tetris ghost, chess-app drag preview |
| Can't land here (any wrecked square) | X over a darkened square | Neutral dark grey X, red only if your egg was smashed there | Standard | No-entry X |
| Pick up a stone here | Rock pile picture | Theme-neutral grey | Custom (already exists) | Pickup tile |
| Food | Leaf picture | Green | Custom (already exists) | Pickup tile |
| An egg may be here (vulture) | Dashed egg outline, no fill, no "?" | White with dark edge | Standard pattern (dashed placeholder) | Ghost or placeholder outline |
| A bird may be here (hunter) | One dashed outline around the whole area, not a dot per square | White with dark edge | Standard | Radar range, area-of-effect outline |
| A bird is most likely here (second reading) | The overlap area filled lightly | Same white, 30% fill | Standard | Heat area |
| Found egg (vulture knows it) | Solid egg | The egg's own color | Custom (already exists) | Revealed item |
| Your own egg | Your egg plus its warmth ring and number | Ring red to blue | Custom plus standard ring | Timer ring |
| Your piece | A ring under your animal, in every theme, plus the same animal art the role card shows | Your side's color | Standard | RTS selection ring, "you are here" |
| Hurt | Pips next to the piece (filled = catches taken) | Red fill | Standard | Life pips |
| Out of the game | Piece greyed, then removed | Grey | Standard | Disabled |
| Sitting (seen by the birds) | Egg peeking out under the bird; an eye on the Sit button | Neutral | Eye: standard. Egg under bird: custom | Eye for "visible to others" |
| Something happened here | Short ping ring on the square, two pulses | White | Standard | Map ping |
| News for everyone | Toast at the top edge of the board, one line, 3 seconds | Neutral dark; red only for bad news to you, green only for good news to you | Standard | Snackbar or toast |
| Selected tool | Check mark plus a 3px outline | Same outline color in every theme | Standard | Toolbar pressed state |
| Not available | Dimmed to 40% | Grey | Standard | Disabled state |
| Out of sight (optional, later) | Squares beyond your sight a little darker | Black at 20% | Standard | Fog of war |

### The Kick, shown instead of told

Today: the player taps Kick, the hint says "Tap the glowing animal to kick it.", and on long-press a tooltip says "Kick it up and left, up to 3 squares (2 for a badger). It may stop early." (18 words). The screen never shows where the animal goes.

Proposed, with no sentence at all:

1. **Kick button appears only when an animal is next to you** (as now). The first time, it pulses once and the hint says "Kick it away." (3 words). After that, no hint.
2. **Tap Kick.** Each animal you can kick gets the act-on ring. Everything else on the board dims slightly. Walk dots disappear.
3. **Tap an animal.** A straight arrow runs from the animal away from the ostrich, with one small dot per square it will travel. A ghost of the animal sits on the last square. If the push wraps past the edge, the arrow leaves one edge and a short arrow enters from the opposite edge (the Pac-Man convention).
4. **What "may stop early" becomes.** Squares the ostrich can see are shown as solid dots, and the ghost stops before any blocker the ostrich can see. Squares beyond the ostrich's sight (more than 2 away) get hollow dots. A hollow dot quietly says "can't see there" without revealing anything, which is what rule 5.2 needs. No words.
5. **Tap the animal again, or the ghost, to kick.** Tap anywhere else to cancel. This is the chess-app pattern: select, see the destination, confirm.
6. **Feedback.** The animal slides along the arrow. If it stops early, it stops with a small bump on the square before the blocker, so the cause is visible. The toast says "Kicked the hyena 3 squares." (5 words) to everyone.
7. **Badger distance.** The arrow simply has 2 dots instead of 3. No "(2 for a badger)" anywhere on screen; the role card and How to play can say it once.

---

## 4. What the screenshots show, theme by theme

### 4.1 The "you can move here" outline disappears on 7 of 13 themes

The yellow outline (`#ffe14d`, no dark edge) measured against the actual tile pixels:

| Theme | Move outline | Hunter dot fill | Throw and kick glow fill | Maybe-egg green |
|---|---|---|---|---|
| classic | 6.6 | 2.8 | 2.8 | 3.3 |
| nature | **1.7** | **1.1** | **1.1** | **1.2** |
| notes (Field notes) | **1.0** | **1.7** | **1.7** | **1.5** |
| golden (Golden hour) | **1.2** | **1.3** | **1.3** | **1.1** |
| paper (Papercraft) | **1.0** | **1.7** | **1.7** | **1.5** |
| arcade | **1.8** | **1.1** | **1.1** | **1.1** |
| toybox | **1.7** | **1.0** | **1.0** | **1.2** |
| tactical | 6.6 | 2.8 | 2.8 | 3.3 |
| storm (Savanna storm) | 5.8 | 2.4 | 2.4 | 2.9 |
| volcano | 9.0 | 3.8 | 3.8 | 4.5 |
| comic (Comic pop) | **1.2** | **1.1** | **1.1** | **1.1** |
| pharaoh (Pharaoh sunset) | 4.9 | 2.0 | 2.0 | 2.4 |
| neon | 11.2 | 4.7 | 4.7 | 5.5 |

Contrast ratio against the darker of the two tile shades; WCAG asks for at least 3.0. Bold is below 3. The hunter dots and the throw glow have a dark edge drawn around them, so they read somewhat better than their fill numbers; the move outline has no dark edge, so its number is the whole story. On Papercraft and Field notes the move outline is the same brightness as the tile (1.0): a first-time player sees no highlighted squares at all.

### 4.2 Same look, different meaning

- **Stone-wrecked square and rock pile.** Both show grey stones. One means "you can't land here", the other means "land here to get a stone". (`.cell.stone` slate square with one stone; `ROCKS` icon with three stones.)
- **Throw target and kick target.** Both the red-orange square glow, though one aims at a square and the other at an animal.
- **Arcade tiles and the throw glow.** Arcade's floor is red-orange, the same hue as the throw and kick glow (1.1 contrast).
- **Toybox tiles and the maybe-egg fill.** Toybox's floor is green; the vulture's "egg may be here" fill is green (1.2).
- **Announcement pink and hurt pink.** Every announcement uses the hurt and catch color (`#ff2a6d`), including "The vulture hunts eggs." at the start, so neutral news looks like an alarm.
- **Hunter dots and move squares.** On the hunter's first reading, a dot sits on every square within 2, which is nearly the same set as its move squares. Dots on top of outlines on 24 squares carry almost no information beyond "yes, a bird is near".

### 4.3 Different looks, same meaning

- **Wrecked square:** red X on black when an egg was smashed, slate square with a stone when not. The rulebook treats both as one thing ("wrecked", 6.3).
- **Your own animal:** the ostrich is the game's blue line drawing in Classic, Tactical and How to play, and becomes a black blob (Golden hour), a pixel invader (Arcade), a blue pawn (Toybox), a hexagon gem (Papercraft), a sketched egg shape (Field notes), a neon outline (Neon). The vulture changes too. The role card and walkthrough always show the Classic drawing, so the card doesn't match the board in 11 themes.
- **Selected button:** check mark everywhere (good), but fill color varies (cyan, olive, red-orange, green, blue, yellow) and Comic pop puts a different color behind every button.
- **Teammate sniff:** shown with a nose emoji (👃!) on the board, while your own sniff is a green banner and a wave.

### 4.4 Collisions on your own square

Zoomed shots (`zoom-own-square.png`): the YOU tag, the egg's warmth number and the HURT label share the ostrich's square. YOU covers the first digit of the number ("YO|4" for 14), and HURT is covered by the theme sprite in 9 of 13 themes (Papercraft, Golden hour, Toybox, Field notes, Arcade, Comic pop, Nature, Storm, Volcano show "H T" or nothing). The square that matters most to the player is the hardest to read.

### 4.5 Layout

- **On an iPhone 13 screen size (390 x 664), the bottom three rows of the board sit behind the action buttons.** In my first run the ostrich, placed on row 6, was not visible without scrolling the board. There is also a band of empty space above the board (the reserved banner and tip slots). Check on a real phone; if it holds, a first-time player can lose sight of their own animal.
- **The hint box clips long hints.** "YOUR TURN · Tap a glowing square to move. + Carry selects a move and does not end the turn." (20 words) is cut off mid-line in Classic, Tactical, Arcade and Comic pop.
- **The key above the board ("Legal step", "Bird may be here") is white text.** It is unreadable on Papercraft, Field notes and Comic pop, and it still says "Legal step" while Throw or Kick is selected.
- **Announcements sit over the middle of the board** (fixed at 42% height, z-index above everything) for 3 seconds, covering the square the event happened on.

### 4.6 Text that contradicts the rules or other text

- "Others can see you sitting" (walkthrough, Sit button detail in `ring.js`, role card "Sitting on an egg shows others where it is", How to play). Brian: it is the birds who can see it. Note the rulebook 7.1 says "Anyone who can see the ostrich", which includes a hunter within 2; if only the vulture should see it, change rule 7.1 and the table in 10 too.
- Hunter header chip tooltip, 3- and 5-player: "Moves 1 square a turn." The rule and the role card say 2.
- Hunter chip, 3-player: "Wins by knocking out both birds." The 3-player role card says "Goal: Make 3 catches."
- Hyena's tooltip on the rival badger: "If you move onto it, you bounce back 2." Rule 8.1 says the mover pushes the other hunter away.
- Kick on the card says "back 3 squares"; "back" reads as "toward me". The push goes away from the ostrich.
- How to play, 3 players: "North is the top of the board." Nothing else in the game uses compass directions.
- Visual names in rules and cards: "rose dots" (hunter cards, hints, How to play, and rulebook 7.3, 7.4, 10), "gray rock pile", "green leaf", "gray stone or red X", "big yellow egg", "glowing yellow square", "red-orange glow", "Red X =", "Gray stone =", "Green ? =", "possible squares turn green". Each should name the meaning instead.
- Family audience: two badger quotes show on every bird player's phone and are coarse for a family game: "Thanks for the treat, stupid birds!" and "...it doesn't give a sh*t, it just takes what it wants." Brian's call; flagged only.

---

## 5. Every piece of player-facing text: current and proposed

Word counts are for the current text. "Visual" says what on screen replaces the words. Where the proposal is "remove", the visual carries the meaning alone. Numbers in proposals come from the rules config, as now.

### 5.1 Role cards (`roles.js`), shown once before the first turn

Proposal for every card: title, then 4 lines, each led by a small icon (the game's animal art or a standard symbol). No "Goal:" or "You lose if" lines: the goal is line 1 and losing is its opposite. Kick, Carry, the stone bounce and the hunters' details are taught when they first become possible. Lose conditions move to How to play.

| Card | Current (words) | Proposed (4 lines) |
|---|---|---|
| Ostrich (Classic) | 7 lines, 85 words. "Goal: Keep one of your 3 eggs alive for 30 rounds." / "Walk up to 2 squares (1 with an egg), or sit on an egg. Sitting on an egg shows others where it is." / "Kick: push a vulture next to you back 3 squares. Not while carrying." / "Stand or sit on each egg within 15 rounds or it goes cold." / "Eat at a leaf at least every 15 turns." / "You lose if every egg is smashed or cold, or you starve." | [egg] Keep 1 egg alive for 30 rounds. / [move dot] Move 2 squares. 1 with an egg. / [warmth ring] Stand on each egg every 15 rounds. / [leaf] Eat every 15 turns. |
| Ostrich (3 players, Hunters) | 93 words; adds "...or the hyena catches you 2 times." | Same 4 lines. Line 1 becomes: Keep 1 egg alive. Don't get caught twice. |
| Ostrich (2 vs 2) | 87 words | [egg] Keep 1 team egg alive for 30 rounds. / [move dot] Move 2 squares. 1 with an egg. / [warmth ring] Either ostrich can warm any egg. / [leaf] Eat every 15 turns. |
| Vulture (Classic) | 6 lines, 81 words. Includes "Land on a gray rock pile to pick up a stone." and "Throw a stone at a square within 1 of you, even your own. It wrecks the square and smashes an egg there. The ostrich kicks it back." (27 words) | [cracked egg] Break every egg by round 30. / [move dot] Fly 2. Each landing sniffs for eggs. / [rock pile] Land on rocks to get a stone. / [crosshair] Throw at your square or next to it. |
| Vulture (3 players) | 89 words | Same, line 1: Break every egg. Don't get caught twice. |
| Vulture (2 vs 2) | 91 words; adds "Your teammate sees your sniffs." | Same 4 lines; line 2: Fly 2. You share sniffs with your partner. |
| Hyena (3 players) | 59 words. "Move up to 2 squares a turn. Birds see you within 2. You smell birds (rose dots)." / "Pounce: If you smell a bird and do not catch it, you smell again and may move 1 square more." / "A bird is out after 2 catches." | [catch ring] Make 3 catches. (goal from config) / [move dot] Move 2 squares. / [dashed area] The outline shows where a bird may be. / [move dot +1] Missed? Move 1 more. |
| Badger (3 players) | 72 words. "Burrow: Stay still to dig in, on any square. Birds cannot see you, and you see any bird next to you. Moving pops you up." | [catch ring] Make 3 catches. / [move dot] Move 2 squares. / [dashed area] The outline shows where a bird may be. / [mound] Stay still to hide underground. |
| Hyena (Hunters) | 75 words; "Goal: Knock out more birds than the badger." and a 18-word lose line | [catch ring] Knock out more birds than the badger. / then the 3 hyena lines above |
| Card subline | "We picked this animal for you." (6) | Keep (6). |
| Card button | "Got it" (2) | Keep. |

The phrase "Birds see you within 2" is better shown than said: see fog of war in section 3 (optional).

### 5.2 Action buttons (`ui.js` render, `ring.js`, `three-ui.js` hint)

| Where | Current | Words | Proposed | Visual |
|---|---|---|---|---|
| Ostrich move | "Walk" / "✓ Walk" | 1 | "Walk" | Check plus outline when selected, same in every theme |
| Ostrich carry | "+ Carry" / "Carry selected · tap a square" | 2 / 5 | "Carry" | Selected state; the dots change to the carry squares |
| Ostrich sit | "Sit" | 1 | "Sit" | Eye icon on the button: the vulture will see |
| Ostrich kick | "Kick" | 1 | "Kick" | Appears only with an animal next to you |
| Vulture fly | "Fly" | 1 | "Fly" | |
| Vulture throw | "Throw stone · 1/1" / "Throw stone (none)" | 4 / 3 | "Throw" | Stone count already in the header; disabled when 0 |
| Hunter stay | "Stay" / "Burrow" | 1 | Keep | |
| Hunter pounce stop | "Stop" | 1 | "Stop" | |
| Button details (`ring.js`): "Walk is selected. Tap a glowing square." (7), "Carry the egg 1 square." (5), "Warm the egg. Others can see you sitting." (8), "Push the animal next to you back 3 squares." (9), "Throw at your square or one next to it. Stones 1/1." (11), "Skip this extra move. You will not catch the bird." (10), "Stay burrowed. Birds still cannot see you." (7), "Stay still to burrow." (4), "Stay put and end your turn." (6) | | | Walk: remove. Carry: "Move the egg 1 square." Sit: "Warm the egg. The vulture sees you." Kick: remove (the arrow shows it). Throw: remove. Stop: "Skip the extra move." Stay burrowed: "Stay hidden." Burrow: "Stay still to hide." Stay: "End your turn." | |

### 5.3 The hint line above the board (`ui.js` render and `three-ui.js` hint)

Proposal: one line, 3 to 7 words, verb first. "Your turn" is shown by the pulse on your piece and the lit controls, and as a 2-word prefix only when the hint is short.

| When | Current | Words | Proposed | Visual |
|---|---|---|---|---|
| Ostrich turn, on an egg | "YOUR TURN · Tap a glowing square to move. + Carry selects a move and does not end the turn." | 20 | "Your turn. Tap to move." | Move dots |
| Ostrich turn | "YOUR TURN · Tap a glowing square to walk. Tap your ostrich for Sit or Carry" | 15 | "Your turn. Tap to move." | |
| Carry selected | "Carry selected. Tap a glowing square. This does not end your turn. You can't kick while carrying an egg." | 19 | "Pick where the egg goes." | Kick button dims |
| Kick selected | "Tap the glowing animal to kick it." | 7 | First time: "Kick it away." Then none. | Rings on animals, arrow and ghost after a tap |
| Vulture turn | "YOUR TURN · Tap a glowing square to fly. Tap yourself to Throw." | 12 | "Your turn. Tap to fly." | Throw button lit |
| Vulture throw | "Tap a red-orange square to throw your stone." | 8 | "Tap to throw." | Crosshairs |
| No stone | "No stone. Land on a glowing rock pile to pick one up." | 11 | "No stone. Go to rocks." | Rock piles pulse (already) |
| Found egg, has stone | "Smash it: tap Throw stone, then your square." | 8 | "Throw on your own square." | Crosshair on your square pulses |
| Found egg, no stone | "You found an egg, but you have no stone. Get one, then come back." | 14 | "Found it. Get a stone first." | Rock piles pulse |
| Hunter turn | "Tap a glowing square to move up to 2. Rose dots: a bird may be here." | 16 | "Your turn. Tap to move." | Dashed area outline |
| Badger turn, not burrowed | "Stay still to burrow. Tap a glowing square to move up to 2. Rose dots: a bird may be here." | 20 | "Tap to move, or Burrow." | |
| Pounce | "One more square. Bright dots: the bird is most likely here." | 11 | "Pounce: 1 more square." | Overlap area filled |
| Hunter senses nothing | "No bird near." (in hint) | 3 | Keep | No outline drawn |
| Setup, eggs | "Tap a glowing square to hide an egg (3 left). Not on rocks, or on or next to food." | 19 | "Hide your eggs. 3 left." | Only allowed squares get dots |
| Setup, ostrich | "Tap a glowing square to place your ostrich." | 8 | "Pick your start." | |
| Waiting, setup | "The ostrich is hiding its eggs…" / "The ostriches are choosing where to start…" | 6 / 6 | "Ostrich is hiding eggs…" / keep | |
| Not your turn | "Vulture's turn…" / "Hyena's turn…" / "Vulture 1's turn (your teammate)…" | 2 to 5 | Keep; drop "(your teammate)" | Teammate chip glows in the header |
| Wrong tap, not your turn | "Wait, it's the Vulture's turn." | 5 | Keep | |
| Wrong tap, move | "Walk up to 2 squares: tap a glowing square (smashed squares are blocked)." | 12 | "Too far." | Shake the tapped square (exists for carry) |
| Wrong tap, fly | "Too far. Fly up to 2 squares: tap a glowing square." | 10 | "Too far." | Shake |
| Wrong tap, carry | "Carry 1 square: tap a glowing square (not onto an egg, food, rocks, a stone mark, or a smashed square)." | 20 | "Not there." | Shake |
| Wrong tap, carry onto food | "Can't carry egg and food" | 5 | "No eggs by food." | Shake |
| Wrong tap, throw | "Throw at a red-orange square: your square or one next to you. A stone at the ostrich just bounces off." | 20 | "Too far." | Shake |
| Wrong tap, kick | "Tap the animal you want to kick: it glows next to you." | 11 | "Tap an animal." | |
| Sit not possible | "Sit only works while you stand on an egg." | 9 | Sit button hidden unless on an egg (already), so remove | |
| Kick not possible | "You can't kick while carrying an egg." / "Nothing to kick next to you." | 7 / 6 | Remove; button dims or is absent | |
| Setup wrong tap | "Tap a glowing square. Eggs can't go on rocks, or on or next to food." | 15 | "Not there." | Shake |
| Hunter wrong tap | "Move up to 2 squares: tap a glowing square." | 9 | "Too far." | Shake |
| Hungry guide | "You're hungry! Go eat (4 left)" | 6 | "Hungry! Go eat." | Path to leaf (exists) |
| First-game tip | "Tip: sit on eggs to keep them warm" | 8 | "Sit on eggs to warm them." | |
| Cold egg guide | "Egg cooling — 6 rounds left! Hurry back!" | 7 | "Egg cooling. Go back." | Egg square glows blue (exists) |
| Guide off button | "Skip guide" | 2 | Keep | |
| Coach marks (code switched off) | "Tap a glowing square to walk" / "Sit to warm this egg (the ring refills)" / "Tap a glowing square to fly and sniff" / "Tip: tap Throw stone to aim" | 5 to 8 | Delete the dead code or reuse the short hints above | |
| Out | "You're out (knocked out). Watching the board — no moves." | 10 | "You're out. Watching." | Your header chip greys |
| Caught, turn lost | "Caught! You lost this turn. Hyena's turn…" | 7 | "Caught! Turn lost." | Pips |
| Team setup | "Waiting for the other ostrich to hide eggs…" (8), "Waiting for the other ostrich to finish placing." (8), "Waiting for all 4 players…" (5), "Pick your hunter." (3) | | Keep the 3- and 5-word ones; "Partner is hiding eggs…" | |

### 5.4 Banner and pop-ups over the board

| When | Current | Words | Proposed | Visual |
|---|---|---|---|---|
| Sniff yes (vulture) | "Egg nearby!" | 2 | Keep | Wave from your square; dashed egg outlines |
| Sniff no | "No egg nearby" | 3 | Keep | Grey wave |
| Sniff, vulture landed on egg | "Found egg!" | 2 | Keep | Solid egg |
| Ostrich sees the sniff | "Vulture smells an egg nearby" | 5 | "Vulture sniffed an egg." | Dashed ring on the 3x3 (exists) |
| Ostrich: egg found | "Vulture found your egg!" | 4 | Keep | |
| Smash | "💥 Smash!" | 1 | "Smashed!" | X lands on the square |
| Egg cold | "An egg went cold." / "❄️ An egg went cold." | 4 | "An egg went cold." (no emoji) | Ring empties |
| Food lead | "Leaf in 3 moves · 4 left" | 6 | Keep without the dot: "Leaf: 3 moves. 4 left." | Path |
| No path to food | "Hungry! 2 left, no open path to a leaf" | 9 | "Hungry. No way to food." | |
| Ate | "Ate the leaf. Hunger restored." | 5 | "Ate." | Food bar refills (exists) |
| Last rounds | "⏳ Final 3 rounds!" / "⏳ Last round!" | 3 / 2 | Keep without emoji | |
| Hunter sense | "Bird may be here." / "Still close." / "Nothing near" | 4 / 2 / 2 | "Bird near." / "Still near." / "Nothing near." | Area outline appears |
| Pounce | "Pounce!" | 1 | Keep | |
| Pounce tag on hunter square | "CAN CATCH" | 2 | Remove | Overlap area is the cue |
| Hunter seen by a bird | "HYENA NEAR" / "BADGER NEAR" | 2 / 3 | "Hyena near!" | Hunter appears with a ping ring |
| Ostrich result of a throw | "Bounced! Egg under ostrich." / "Bounced! No egg." / "The stone missed." / "💥 An egg was smashed!" | 4 / 3 / 3 / 4 | "Kicked it back!" / "Missed." / "Egg smashed." | Stone flies back (fx) |
| Vulture result | "Bounced! ..." / "Miss." / "Picked up a stone." | 1 to 4 | Keep short ones | |
| Ostrich: egg found | "The vulture found an egg! Move it or sit on it." | 11 | "Egg found! Move or sit on it." | |
| Vulture: found egg | "You found an egg. Smash it: tap Throw stone, then your square." | 12 | "Found an egg. Throw on it." | Crosshair on your square |
| Opponent offline | "Opponent offline… they can rejoin with the same link." | 8 | "Opponent offline." | |

### 5.5 Announcements to everyone (`catchtext.js`, server stone lines, `three-ui.js`)

Proposal: a toast at the top edge of the board, one line, neutral color unless it is good or bad news for this phone, and a ping on the square for players who can see it.

| When | Current | Words | Proposed |
|---|---|---|---|
| Start line | "The vulture hunts eggs. The hyena and badger hunt birds." | 11 | Remove the toast; show it on the role card's first line instead, or keep as "Vulture hunts eggs. Hunters hunt birds." (7) |
| Caught, to the bird | "The hyena caught you! Hurt: one more catch and you're out." | 11 | "Caught! One more and you're out." (6), pips fill |
| Walked into the badger | "You walked into the hidden badger! The badger caught you! Hurt: one more catch and you're out." (+ quote) | 19 + quote | "A hidden badger caught you!" (5), pips fill |
| Knocked out, to the bird | "The hyena knocked you out." | 5 | Keep |
| Catch, to the hunter | "Caught the ostrich! One more catch knocks it out." | 9 | "Caught the ostrich!" (3), pip fills on its chip |
| KO, to the hunter | "Ostrich knocked out!" | 3 | Keep |
| Catch, to others | "The hyena caught the ostrich." | 5 | Keep |
| Bird out | "The ostrich is out." / "Ostrich 1 is out." | 4 | Keep |
| Kick | "The ostrich kicked the badger back 2 squares." | 9 | "Ostrich kicked the badger 2 squares." (6) |
| Kick blocked | "The ostrich kicked the vulture, but it had nowhere to go." | 11 | "Kick blocked." (2) |
| Badger pops out | "The badger came out of its burrow!" | 8 | "Badger popped up!" (3) |
| Hunters meet | "The badger ran into the hyena. Nobody is hurt. The hyena slid back 2 squares." | 16 | "Badger shoved the hyena." (4) |
| Stone kicked back | "The ostrich kicked the stone right back!" | 7 | "Kicked it back!" (3) |
| Stone on leaf / rocks | "Boing! The stone bounced off the leaf." / "Clang! The vulture batted it away with a rock." / "The stone landed softly in the leaves." / "The stone clattered back onto the rock pile." | 7 to 9 | "Stone wasted." (2), or no toast; the stone simply vanishes with a puff |
| Badger quotes (`badgerlines.js`) | 6 to 25 words each; the "first burrow" line is 25 | | Keep as flavor only on the badger's own phone, max 8 words; cut the 25-word fact and the "sh*t" line for a family game (Brian's call) |

### 5.6 Square tooltips (long-press, `ui.js`, `three-ui.js`)

Tooltips are the "details on request" layer, so they may run longer than hints, but each should still be one short phrase that names the meaning, not the look.

| Mark | Current | Words | Proposed |
|---|---|---|---|
| Kick target | "Kick it up and left, up to 3 squares (2 for a badger). It may stop early." | 18 | Remove. The arrow and ghost show it. If kept: "Kick here." |
| Throw target | "Throw a stone here" | 4 | "Throw here." |
| Move target | "Move here" / "Fly here" | 2 | Keep |
| Setup | "Hide an egg here" / "Start here" | 4 / 2 | Keep |
| Maybe egg | "Egg might be here (sniff)" | 5 | "Egg may be here." |
| Stone mark | "Stone mark (no carrying eggs here)" | 6 | "Wrecked. Can't land." |
| Smashed | "Smashed egg (square blocked)" | 4 | "Smashed. Can't land." |
| Found egg | "Found egg" | 2 | Keep |
| Your egg | "Your egg: 14 rounds until cold" | 6 | "Your egg. Cold in 14." |
| Food | "Food: resets the ostrich's hunger to 15" | 7 | "Food." |
| Rock pile | "Rock pile (stone refill)" | 4 | "Rocks: get a stone." |
| You | "You (ostrich), carrying an egg" | 5 | "You." |
| Other pieces | "The vulture" / "The ostrich (carrying something)" / "Ostrich 2 (your teammate)" | 2 to 4 | Keep |
| Shared square | "Vulture and ostrich share this square" | 6 | Keep |
| Hunter, to a bird | "Hyena! It catches a bird by landing on it (or if you step onto it)" | 14 | "Hyena. Don't let it land on you." (7) |
| Hunter itself | "You, burrowed: the birds can't see you" | 7 | "You, hidden." |
| Rival hunter | "Your rival, the badger. If it moves onto you, you are knocked back 2. If you move onto it, you bounce back 2." | 24 | "Rival. Landing on it shoves it." (check against rule 8.1) |
| Ambush sight | "A bird is next to you. You can see it from your burrow." | 13 | "Bird next to you." |
| Hurt | "Hurt: caught 1 time. Still in the game." / "Hurt: caught, and loses its next turn." | 8 / 7 | "Caught once." |
| Teammate sniff | "Your teammate sniffed here: an egg is on or next to this square" | 12 | "Partner: egg near." |
| Header chips | "Vulture: caught 0 of 2 times · HURT · loses its next turn" (varies) | 6 to 12 | "Vulture: 1 of 2 catches." |
| Hunter chip | "Hyena: Pounce. Moves 1 square a turn. Wins by knocking out both birds." | 12 | "Hyena: catches birds." (wrong speed and goal today, see 4.6) |
| HUD food | "Ostrich food: turns left before it starves" | 7 | "Turns until hungry." |
| HUD stones | "Vulture stones" | 2 | Keep |
| Mark-tooltips tip | "Hover or tap a square to see what it is." | 9 | "Hold a square for info." |

### 5.7 One-time tips (`tutorial.js` tip bar)

| Tip | Current | Words | Proposed |
|---|---|---|---|
| Smashed | "Red X = a smashed egg. Nobody can step there now." | 10 | "Smashed. Nobody can land here." |
| Stone | "Gray stone = a stone landed here. It stays all game, and the ostrich won't carry an egg onto it." | 20 | "Wrecked. Nobody can land here." (same look as smashed, see vocabulary) |
| Found | "Big yellow egg = found. It stays found until the ostrich carries it away." / ostrich: "The vulture landed on your egg and found it. Sit on it or carry it away." | 14 / 15 | "Found. It stays found until moved." / "Found! Sit on it or move it." |
| Sniff | "After each landing you sniff: "Egg nearby!" means an egg is on your square or next to it, and the possible squares turn green." | 24 | "Each landing sniffs the squares around you." |
| Throw | "Red-orange = you can throw here. Green ? = an egg might be here. A stone at the ostrich just bounces off." | 22 | "Throwing at the ostrich bounces back." |
| Warm | "The ring on each egg drains as it cools. Stand on the egg to refill it." | 16 | "Stand on an egg to warm it." |
| Food | "Step on a green leaf within 7 turns or you starve." | 11 | "Eat within 7 turns." |
| Carry | "Carry egg: move it 1 square to hide it again." | 10 | "Carry moves an egg 1 square." |
| Kick | "Kick: push the animal next to you back 3 squares instead of walking." | 13 | "Kick it away." |
| Tip-bar button | "Turn off tips" | 3 | Keep |

### 5.8 Intro, walkthrough, How to play, end screens (`tutorial.js`, `ui.js`, `index.html`, `three-ui.js`, server)

**Layers before the first move today:** 3 intro cards, then 3 walkthrough cards per role (14 to 46 words each), then the role card (59 to 93 words). Proposal: keep the intro's first card only, delete the walkthrough, keep the 4-line role card, and teach the rest on the board.

| Screen | Current | Words | Proposed |
|---|---|---|---|
| Intro 1 | "Welcome!" / "A hide-and-seek game for 2 to 5 players." | 1 / 9 | Keep |
| Intro 2 | "Real Egyptian vultures crack ostrich eggs with stones. One of you is the ostrich, one is the vulture." | 18 | Keep the fact on the lobby or loading screen; cut from onboarding |
| Intro 3 | "Ostrich: guard your eggs, keep them warm, eat, and kick pests away. Vulture: fly, sniff, grab a stone, throw. Hints show up as you play." | 25 | Remove; the role card covers it |
| Walkthrough, ostrich | "Hide 3 eggs. Keep at least one alive for 30 rounds. The vulture sees you, but not your eggs." (19) / "Walk up to 2 squares. On an egg: Sit (others can see you sitting) or Carry it 1 square. Kick pushes..." (45) / "Step on a leaf at least every 15 turns or you starve. A stone thrown at you just bounces off..." (38) | 102 | Remove (role card plus on-board teaching) |
| Walkthrough, vulture | 14 / 25 / 46 words | 85 | Remove |
| Hunter picker (`KIND.pwTxt`) | Hyena: "If your sense says a bird is within 2, you get one extra 1-square move that turn. A bird is out after 2 catches." (24). Badger: "Stay still to burrow. Birds cannot see you then. Moving pops you up, and you can catch on that move. A bird is out after 2 catches." (27) | 24 / 27 | Hyena: "Pounce: missed? Move 1 more." Badger: "Burrow: stay still to hide." |
| Lobby subtitles | "hide eggs", "hunt eggs", "catch birds", "Pounce · 2 catches" | 2 to 3 | Keep the first three; hunters: "Pounce", "Burrow" |
| Lobby notes | 2 vs 2: 24 words. Hunters: 18 words. "The hunter player picks hyena or badger when they join." (11) | | "Ostriches team up. Vultures share sniffs." (5) / "Two hunters race for knock-outs." (5) / "Hunter picks their animal on joining." (6) |
| Pass & Play | "One phone. Hand it over between turns. This stays a small extra way to play — friends use their own phones." | 21 | "One phone. Pass it between turns." (6) |
| Pass cover | "Pass to the Vulture 🦅" / "The Ostrich goes first and hides the eggs. Vulture, look away!" / "I'm the Vulture — tap to start" | 4 / 11 / 6 | "Pass to the Vulture" with the vulture art / "Vulture, look away!" / "I'm the Vulture" |
| How to play, ostrich section | 5 bullets, about 190 words, names "green leaf", "gray stone or red X" | ~190 | Keep as the reference page (it is the "details on request" layer), but rewrite each bullet to one or two short sentences, remove color names, fix "others can see you sitting", and lead each bullet with the same icon the board uses |
| How to play, Marks | "Glowing yellow square = you can move here · red-orange glow = throw here · gray stone = ... · green leaf = food · gray stones = rock pile · big yellow egg = found egg · red X = smashed (blocked)." | ~50 | Replace with a picture legend: each row is the actual mark drawn by the game plus 2 to 4 words of meaning, so it updates when the look changes |
| How to play buttons | "Got it", "Your animal", "Replay intro", "Replay walkthrough", "Replay move hints & tips", "Ostrich guides: ON (tap to turn off)" | 1 to 7 | "Got it", "My animal", "Replay tips", toggle "Ostrich guides" with a standard switch |
| Key above board | "Legal step" / "Bird may be here" | 2 / 4 | Remove after the first turn. If kept: "Move" / "Bird may be here", and it must follow the mode (Throw, Kick) |
| End, 2 players | "You win!" / "You lose" / "Ostrich wins!" plus "The ostrich kept 2 egg(s) alive for 30 rounds." / "The vulture smashed every egg by round 21." / "The ostrich starved in round 18." | 2 + 8 to 9 | Keep the title. Reason: "2 eggs survived." / "Every egg smashed." / "The ostrich starved." Use singular or plural correctly, not "egg(s)" |
| End, 3 to 5 players | "Your team wins!", "No winner", reasons such as "An egg was still alive after round 30, so the ostrich wins." (13), "Both teams are out of the game, so the hyena wins." (11), "Time ran out and nobody met their goal." (8), Hunters tie line (11) | 8 to 13 | "An egg survived." / "Every bird is out." / "Time ran out. No winner." / "Most knock-outs: hyena." |
| End buttons | "Rematch · Same roles", "Rematch · Change roles", "New Game" | 2 to 3 | "Rematch", "Swap roles", "New game" |
| Arrivals | "Ana, Ben joined — the next game adds them." | 7 | "Ana, Ben join next game." |
| Server reset | "Game was reset" / "The server restarted and this game could not be restored." / "Start a new game" | 3 / 10 / 4 | Keep title and button; body "The game was lost in a restart." |
| Connection | "Connecting… (try 2, the server may be waking up)" / "Could not reach the game server. Check your connection and tap again." | 9 / 12 | "Connecting…" / "Can't connect. Tap to retry." |
| Share | "Play Battle Ostriches with me! Code ABCD" / "Share link" / "Copied!" | | Keep |
| Home | "Hide your eggs. Outwit the hunters." / "Play with friends" / "Play solo" / "Have a code? Type it here to join." / "Pass & Play on this device?" | | Keep the first three; "Have a code?" (3); "Pass & Play" (3) |
| Solo | "How many computers are you playing against?" / "You + 2 computers → Hunter" | 7 / 5 | "How many computers?" (3) / keep |
| Header | "ROUNDS 30 / EGGS 3", "Timer on" | | Keep |

---

## 6. Top 10 changes, ranked by how much they help a first-time family player

1. **Make "you can move here" visible on every theme with the chess-app dot.** Replace the yellow outline with a center dot (the Chess.com and Lichess convention) that has a dark edge and a light edge, so it passes 3:1 on all 13 themes. Today it measures 1.0 to 1.8 on seven themes, so on Papercraft and Field notes a new player sees no move squares at all.
2. **Keep the whole board on screen and give your own animal one look that never changes.** On an iPhone 13-size screen the bottom three rows sit behind the buttons (confirm on a real phone). Add a selection ring under your animal in every theme, use the role-card art for your piece (or keep the theme sprite but always add the ring), and stop the YOU tag, egg number and HURT label from covering each other.
3. **Show the Kick instead of describing it.** Kick rings the animals you can kick; tapping one draws an arrow with one dot per square and a ghost where it lands; solid dots where the ostrich can see, hollow where it can't; tap again to kick. Delete "It may stop early" and the 18-word tooltip.
4. **Cut the hint to one line of 3 to 7 words, verb first.** Today's hints run 8 to 20 words and get clipped mid-sentence in four themes. Wrong taps get a shake and "Too far." instead of a rules paragraph.
5. **Shrink each role card to 4 short lines with icons, and delete the walkthrough.** Cards run 59 to 93 words today, behind 3 intro cards and 3 walkthrough cards. Teach Kick, Carry and the stone bounce the first time each becomes possible (Andersen 2012: up-front tutorials add little for games you can learn by trying).
6. **Stop naming colors and looks in every rule, card, hint and tip.** "Rose dots", "gray rock pile", "red-orange square", "big yellow egg", "Red X =", "Green ? =" become the meaning ("where a bird may be", "rocks", "throw here", "found egg"). Change rulebook 7.3, 7.4 and 10 the same way.
7. **Fix the text that says the wrong thing.** "Others can see you sitting" becomes "The vulture sees you sit" with an eye on the Sit button (and decide whether rule 7.1 should say birds only). Fix the hunter chip's "Moves 1 square a turn" and its goal, the rival tooltip that contradicts rule 8.1, "back 3 squares" (it is away), and "North is the top".
8. **Give each meaning one shape, and stop reusing shapes across meanings.** All wrecked squares get the same X (today smashed is a red X and wrecked is a grey stone that looks like the rock pile). Kick targets get a ring around the animal; throw targets get a crosshair. The vulture's "egg may be here" becomes a dashed egg outline with no green fill. The hunter's 24 dots become one dashed area outline, with the overlap filled on a Pounce. Arcade's red tiles and Toybox's green tiles stop clashing with signals of the same color.
9. **Move announcements off the board into a one-line toast, in neutral color.** Today a hot-pink box covers the middle of the board for 3 seconds for every event, neutral or not. Use the snackbar pattern at the top edge, red only for bad news to this phone, and a two-pulse ping on the square for players who can see it.
10. **Lock signals and button states so themes can't change them, and replace emoji signals with standard symbols.** Selected tool: check plus one outline color everywhere. Disabled: 40% grey everywhere (already). The key above the board follows the mode or goes away. Emoji (🐦, 🦅, 👃!, 💥, ❄️, ⏳, 💡) become the game's animal art or quiet standard symbols (dot, ring, X, eye, arrow, crosshair).

Optional, after these: fog of war for birds (squares more than 2 away a little darker) would show "birds see hunters within 2" without a sentence.

---

## Sources

- Brysbaert, M. (2019). How many words do we read per minute? *Journal of Memory and Language* 109. [PDF](https://www.Gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf), [BPS summary](https://www.bps.org.uk/research-digest/most-comprehensive-review-date-finds-average-persons-reading-speed-slower)
- Nielsen Norman Group. [Why web users scan instead of reading](https://www.nngroup.com/articles/why-web-users-scan-instead-reading/); [10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/); [Icon usability](https://www.nngroup.com/articles/icon-usability/)
- Nielsen, J. [Progressive disclosure](https://jakobnielsenphd.substack.com/p/progressive-disclosure)
- Hodent, C. [*The Gamer's Brain*](https://www.routledge.com/The-Gamers-Brain-How-Neuroscience-and-UX-Can-Impact-Video-Game-Design/Hodent/p/book/9780367638184); [GDC 2016, UX of onboarding and player engagement](https://gdcvault.com/play/1022951/The-Gamer-s-Brain-Part); [Creative Bloq summary of signs and feedback](https://www.creativebloq.com/features/how-neuroscience-and-ux-impacts-video-game-design)
- Andersen, E. et al. (2012). [The impact of tutorials on games of varying complexity](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/), CHI 2012
- Adams, E. (2011). [Eight ways to make a bad tutorial](https://gamedeveloper.com/design/the-designer-s-notebook-eight-ways-to-make-a-bad-tutorial)
- W3C. [WCAG 1.4.1 Use of color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color); [WCAG 1.4.11 Non-text contrast](https://w3c.github.io/wcag21/understanding/non-text-contrast)
- Chess.com. [Show legal moves](https://support.chess.com/en/articles/8708625-how-do-i-turn-on-off-the-legal-moves-dots-on-the-board); Lichess. [chessground README](https://unpkg.com/chessground@8.2.0/README.md)
- Material Design. [Snackbars](https://m2.material.io/components/snackbars); [States, disabled at 38%](https://m2.material.io/go/design-states)
- [Fog of war](https://en.wikipedia.org/wiki/Fog_of_war), Wikipedia
- [Rulebook design: structure, clarity and examples of play](https://neutronium-landing.pages.dev/blog/board-game-rulebook-design)

Evidence files: `ux-shots-2026-11-07/themes-*.png` (one sheet per view, 13 themes each) and `zoom-own-square.png`. Those sheets were never committed here. The handover says they stay on Drive.
