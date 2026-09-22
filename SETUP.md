# Deploying to GitHub Pages

Live URL once published: **https://sassmilic.github.io/cglas-foundation/**

No custom domain, no DNS, no `CNAME` file.

## Your steps

1. **Create the repo.** On github.com → New repository → name it exactly
   `cglas-foundation`, **Public**, and do *not* add a README, .gitignore or licence
   (the local repo already has commits).

2. **Push.** From this folder:

   ```sh
   git remote add origin https://github.com/sassmilic/cglas-foundation.git
   git push -u origin main
   ```

   If you use SSH instead: `git@github.com:sassmilic/cglas-foundation.git`

3. **Turn on Pages.** Repo → **Settings** → **Pages** →
   **Source: Deploy from a branch** → branch `main`, folder `/ (root)` → **Save**.

4. **Wait ~1 minute**, then open <https://sassmilic.github.io/cglas-foundation/>.
   Build status shows under the repo's **Actions** tab if it doesn't appear.

That's it. Every later `git push` to `main` republishes automatically.

## Local preview

```sh
python3 -m http.server 8000
```

<http://localhost:8000/> — note `404.html` links with absolute `/cglas-foundation/`
paths (correct in production, broken locally), because GitHub serves that one
file for missing URLs at any depth.

## Files

```
index.html        name, title, and the unit menu; unit 1 expands in place
project-two.html  unit 1 / project 2 — the only live project page
style.css         tokens at the top, light + dark
lightbox.js       click a gallery thumbnail to enlarge it
images/           research images; -thumb.jpg in the grid, -full.jpg enlarged
404.html          not-found page
.nojekyll         serve files as-is, no Jekyll build
```

Images are committed as JPEG (browsers cannot display HEIC). To add one, convert
the original and drop both sizes into `images/`:

```sh
sips -s format jpeg -s formatOptions 80 -Z 800  ~/Downloads/IMG_XXXX.HEIC --out images/<slug>-thumb.jpg
sips -s format jpeg -s formatOptions 65 -Z 1800 ~/Downloads/IMG_XXXX.HEIC --out images/<slug>-full.jpg
```

then copy one `<li>` block in the gallery, updating `data-full`, `data-caption`,
`src`, `alt`, and the `width`/`height` (read them with `sips -g pixelWidth -g
pixelHeight images/<slug>-thumb.jpg`).

Unit 1 uses a native `<details>`, so the expansion works with no JavaScript.
Units 2 and 3 are inert `<span>`s — to publish one, give it the same
`<details>` / `<summary class="unit">` structure as unit 1. Same for the
projects: swap a `<span>` for an `<a href="...">` to make it live.
