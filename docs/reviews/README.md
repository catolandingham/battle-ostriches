# Review screenshots

The phone screenshots that used to live in this folder are not in the working tree. On 2026-11-13 the folder held 221 images, about 21 MB: 105 JPGs in `busy-2026-11-08/`, plus PNG phone shots and contact sheets in `egg-layout-shots/`, `bw-theme-shots/`, `part1c-shots/`, and `lobby-wait-shots/`. Eleven of those files were exact copies of another file already in the tree (822,645 extra bytes).

The last commit that still contains the full archive is:

`548f054995d139568c4613e4db85ee2629ee3bee`

That is `main` at "Hyena pounce, the egg throw, and Look out! moments (#30)". Nothing in history was rewritten. To recover one file:

```
git show 548f054995d139568c4613e4db85ee2629ee3bee:docs/reviews/busy-2026-11-08/classic-start-blue.jpg
```

The written reviews stayed. The only image still here is `BW-THEME-MOCKUP-2026-11-08.png`, because the handover still points at it. It is a smaller copy (1280 pixels wide) of the same black-and-white mockup. The full-size original is in the commit above. `bw-theme-mockup-2026-11-08.html` and `move-style-playground.html` are the mockup pages, not screenshots, so they stayed too.

Do not commit new review screenshots into this folder. `.gitignore` ignores `.jpg`, `.jpeg`, `.png`, `.webp`, and `.gif` under `docs/reviews/`, except the mockup named above. New captures go in `shots/`, which is already ignored, or on Drive.
