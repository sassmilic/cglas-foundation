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
404.html          not-found page
.nojekyll         serve files as-is, no Jekyll build
```

Unit 1 uses a native `<details>`, so the expansion works with no JavaScript.
Units 2 and 3 are inert `<span>`s — to publish one, give it the same
`<details>` / `<summary class="unit">` structure as unit 1. Same for the
projects: swap a `<span>` for an `<a href="...">` to make it live.
