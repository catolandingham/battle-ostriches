# Cartoon card build

These scripts made `public/art/cutaways/*.webp` and `public/cutaway-scenes.js`. They read the approved
source drawings from the art build box (`/workspace/bw/scenes/...`), which are not in this repo.

- `scenes.py`: every scene as 30 steps of 50 ms (the wrap: 14); each step lists drawings with position, size, turn and opacity.
- `spr.py`: turns a source drawing into a clean anti-aliased greyscale drawing at 3x.
- `erase_data.py`: stray marks removed from the source drawings (the hyena "third eye" and others) and lines redrawn.
- `egg5a.py`: the egg smash (Brian's pick 5a) in the same form.
- `export.py`: writes the drawings and the scene file. `python3 export.py` (all) or `python3 export.py egg-smash`.
- `capture.js` (run from the repo root: `node tools/cutaways/capture.js [scene]`) records each scene in the real game on a 390x844 phone at 3x; `sheets.py` makes contact sheets.

To add a scene: write a function in `scenes.py` that returns 30 steps, add its card rect and a `SCENES` row,
run `export.py`, then add a row to `TABLE` in `public/cutaways.js` (and, if it is a new kind of moment,
a candidate in `candidates()`).
