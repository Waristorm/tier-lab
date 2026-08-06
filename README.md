# Tier Lab

**Live: [usetierlab.netlify.app](https://usetierlab.netlify.app)**

A tier-list builder that finds the images for you. Type "Cabo Verde {flag}" and it goes and gets the flag. No uploading, no hunting for a transparent PNG, no dragging files in from a downloads folder.

Single self-contained `index.html`, no build step, no framework, no dependencies. One serverless function does the image search. That is the whole stack.

---

## Why it exists

Every tier-list site has the same problem: you have a list of forty-eight things in your head and the tool makes you find forty-eight images before you can rank anything. Tier Lab inverts it. You type names, it resolves images, you rank.

The **Smart image prompt** is the mechanism. You write a search phrase once with `{name}` as a placeholder, such as `{name} flag`, `{name} restaurant official logo` or `{name} candy bar package`, and every item you add runs that search against its own name. One prompt, forty-eight correct images.

---

## How the image search works

Resolution runs as a chain, cheapest and most reliable first:

1. **Name-anchored Wikipedia and Wikimedia Commons.** Results are rejected unless the title contains the item's own name, which kills the single most common failure: searching "Rapid Red Metallic" and getting a generic red car.
2. **`/api/image`**, the project's own Netlify Function. Server-side image search, returned as `{ results: [{ img, full, source, title }] }`, with hotlink-safe thumbnail URLs.
3. **Wikipedia page images, then Openverse** as progressive fallbacks.

Generic results are then **relevance-ranked client-side**: words from the item's own name are weighted 3x, other words in the prompt 1x. This is what fixed color-variant searches, where "Shadow Black" and "Carbonized Gray" were previously returning the same three cars.

**Find another** cycles through the remaining candidates for any single item without re-running the whole board.

---

## Inside `/api/image`

The function scrapes Bing Images server-side and normalises every hit into one small, stable shape.

- **Thumbnails** are `*.mm.bing.net/th/id/OIP...&pid=Api` URLs, which are hotlink-safe and load fast enough to fill a whole board at once.
- **`img` and `full`** both come from Bing's `m="{...}"` payload on `a.iusc` anchors. `turl` is the thumbnail, `murl` is the publisher's original, so a tile can show a light image and still hand you the full-resolution one.
- **`source`** is `purl`, the publisher page, so every image keeps a link back to where it came from.
- **`title`** comes from `m.t` where present, otherwise the adjacent `a.inflnk` `aria-label`.

It is unit-tested against a fixture of Bing's real markup, because the build sandbox has no egress to bing.com.

Source: [`netlify/functions/image.mjs`](netlify/functions/image.mjs).

---

## Features

- **Smart image prompt** with `{name}` substitution, so one phrase resolves every item
- **Keyboard ranking.** Select an item, press `1` to `8` to send it to that tier, `0` or `Backspace` to return it. Ranking forty-eight items takes about three minutes instead of twenty
- **Drag and drop** for anyone who prefers it
- **Autosave and restore.** The working board persists to `localStorage` and reloads on your next visit. Boards embed base64 images and can exceed the ~5MB quota, so a failed write retries with embedded images stripped rather than silently losing the save
- **Named saves** with a delete control, guarded against writing an untitled list
- **Editable tiers.** Rename and recolor every row
- **Branded PNG export** with title and site URL, sized for sharing
- **Share codes.** Base64 board state, so someone can load your list and re-rank it themselves
- **Presets.** Fast food, Corvette C8 colors, Pokemon GO Megas
- **Upload your own image** for any item the search cannot resolve
- **Undo** at every mutation

---

## Running it

Image search needs the function, which means Netlify:

```bash
npm i -g netlify-cli
netlify dev
```

Deploying by zip drop: the archive must contain `index.html`, `netlify.toml`, **and** `netlify/functions/image.mjs`. The `[functions]` block in `netlify.toml` is required. Without it the function is skipped silently and `/api/image` returns 404 while the rest of the site looks perfectly fine.

**Health check after any deploy:**

```bash
curl "https://<your-site>/api/image?q=big+mac"
```

A non-empty `results` array means the scrape is intact. `{"results":[],"error":"bing-###"}` means it broke, so roll back.

---

## Structure

```
index.html entire app: markup, styles, logic
netlify.toml publish dir, functions dir, /api/image redirect
netlify/functions/image.mjs server-side image search
```

No `package.json`, no bundler, no lockfile.

---

## License

MIT
