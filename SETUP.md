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
index.html            name, title, and the unit menu; unit 1 expands in place
project-one.html      unit 1 / week 1 — Drawing Week
project-two.html      unit 1 / project 2 — Research Week
project-three-a.html  unit 1 / week 3A — The Infraordinary
project-four.html     unit 1 / project 4 — Refashioned
project-four-b.html   unit 1 / week 4B — Cardboard Orchestra
project-five.html     unit 1 / project 5 — Space Oddity
project-six.html      unit 1 / project 6 — Printmaking
project-seven.html    unit 1 / project 7 — 3D Design — Diorama
project-eight.html    unit 1 / project 8 — Screenprinting
style.css         tokens at the top, light + dark
lightbox.js       click a gallery thumbnail to enlarge it
banner.js         banner opens as big pixels and refines into the image (WebGL2)
images/           research images; -thumb.jpg in the grid, -full.jpg enlarged
404.html          not-found page
.nojekyll         serve files as-is, no Jekyll build
```

Each project page ends with "← index" and a "next: … →" link to the page after
it in the home menu's order; the last page (Print Making) has only "← index". When you add a
project page, give it the same footer and point the previous last page's
"next" link at it.

Images are committed as JPEG (browsers cannot display HEIC). To add one, convert
the original and drop both sizes into `images/`:

```sh
sips -s format jpeg -s formatOptions 80 -Z 800  ~/Downloads/IMG_XXXX.HEIC --out images/<slug>-thumb.jpg
sips -s format jpeg -s formatOptions 65 -Z 1800 ~/Downloads/IMG_XXXX.HEIC --out images/<slug>-full.jpg
```

then copy one `<li>` block in the gallery, updating `data-full`, `data-caption`,
`src`, `alt`, and the `width`/`height` (read them with `sips -g pixelWidth -g
pixelHeight images/<slug>-thumb.jpg`).

### Banners

Each banner ships as AVIF (with JPEG fallback) at 800w, 1600w and its full
width, plus a 32px placeholder inlined on the page as `--lqip`. From the
largest JPEG (`images/banner-<name>-<max>.jpg`):

```sh
for w in 800 1600 <max>; do
  magick images/banner-<name>-<max>.jpg -resize ${w}x -strip /tmp/b.png
  avifenc -q 45 -s 4 /tmp/b.png images/banner-<name>-$w.avif
  [ -f images/banner-<name>-$w.jpg ] || magick /tmp/b.png -quality 82 images/banner-<name>-$w.jpg
done
magick images/banner-<name>-<max>.jpg -resize 32x -strip -quality 60 webp:- | base64
```

Paste the base64 into `style="--lqip: url(data:image/webp;base64,…)"` on the
`<figure class="banner">`, copy the `<picture>` markup from any project page,
and add `<script src="banner.js" defer></script>` before `</body>`.

Unit 1 uses a native `<details>`, so the expansion works with no JavaScript.
Units 2 and 3 are inert `<span>`s — to publish one, give it the same
`<details>` / `<summary class="unit">` structure as unit 1. Same for the
projects: swap a `<span>` for an `<a href="...">` to make it live.
