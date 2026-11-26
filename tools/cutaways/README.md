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

## Stone kick-back cartoons (2026-11-25)

The seven `bounce-*` scenes (kick-back A, leaf A and rock B, each with and without the egg in the ostrich's beak, and the
trampoline, which never has the egg) are built on this Mac from the drawings already in `public/art/cutaways`, not from the art box:

- `bounce_lib.py`: the drawings (approved drawings, parts cut out of them, and the placeholder drawings) and a renderer.
- `bounce_scenes.py`: the scenes, in 50 ms steps. They run 34 or 38 steps, inside the 2 s the board waits for a cartoon.
- `bounce_export.py`: run `python3 tools/cutaways/bounce_export.py [preview-folder]` from the repo root (needs numpy,
  opencv-python and Pillow). It writes `public/art/cutaways/sk-*.webp` and adds the `bounce-*` scenes to
  `public/cutaway-scenes.js` without touching the others. `export.py` rewrites that file from the art box, so run
  `bounce_export.py` again after it. With a preview folder it also writes every step, a contact sheet and an mp4 each.

Placeholders that need Brian's approval: `sk-leaf`, `sk-rockpile`, `sk-rockpile2`, `sk-toprock`, `sk-shake`, the egg in the
ostrich's beak (`sk-beakegg`), and the trampoline pose (the approved ostrich drawing leaning back, holding `sk-leaf` taut in her
bill). `sk-*-m` files are mirrored copies of approved drawings.
