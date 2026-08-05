# Tier Lab

**Live: [mazhar-tier-lab.netlify.app](https://mazhar-tier-lab.netlify.app)**

A tier-list builder that finds the images for you. Type "Cabo Verde {flag}" and it goes and gets the flag — no uploading, no hunting for a transparent PNG, no dragging files in from a downloads folder.

Single self-contained `index.html`, no build step, no framework, no dependencies. One serverless function does the image search. That is the whole stack.

---

## Why it exists

Every tier-list site has the same problem: you have a list of forty-eight things in your head and the tool makes you find forty-eight images before you can rank anything. Tier Lab inverts it. You type names, it resolves images, you rank.

The **Smart image prompt** is the mechanism. You write a search phrase once with `{name}` as a placeholder — `{name} flag`, `{name} restaurant official logo`, `{name} candy bar package` — and every item you add runs that search against its own name. One prompt, forty-eight correct images.

---

## How the image search works

Resolution runs as a chain, cheapest and most reliable first:

1. **Curated store.** 73 verified images embedded directly in the page as data URLs — fast-food logos, Corvette C8 factory colors, Pokémon GO Megas. Instant, offline, and immune to a search engine returning a stock photo of the wrong car.
2. **Name-anchored Wikipedia and Wikimedia Commons.** Results are rejected unless the title contains the item's own name, which kills the single most common failure: searching "Rapid Red Metallic" and getting a generic red car.
3. **`/api/image`** — the project's own Netlify Function. Server-side image search, returned as `{ results: [{ img, full, source, title }] }`, with hotlink-safe thumbnail URLs.
4. **Wikipedia page images → iTunes artwork → Openverse** as progressive fallbacks.

Generic results are then **relevance-ranked client-side**: words from the item's own name are weighted 3×, other words in the prompt 1×. This is what fixed color-variant searches, where "Shadow Black" and "Carbonized Gray" were previously returning the same three cars.

**Find another** cycles through the remaining candidates for any single item without re-running the whole board.

---

## The part worth reading the code for

The `/api/image` function's source was lost. The site was live and the endpoint was working in production, but the file existed on no machine I had access to.

Rather than guess at a reimplementation, I called the live endpoint, read the shape of what came back, and worked backwards from the response:

- `img` values were `*.mm.bing.net/th/id/OIP...&pid=Api` thumbnails — so the backend was a **Bing Images scrape**, not the DuckDuckGo implementation the project notes claimed.
- The presence of both `img` and a separate `full` field meant the scraper was reading Bing's `m="{...}"` payload on `a.iusc` anchors, where `turl` is the thumbnail and `murl` is the publisher's original.
- `source` mapped to `purl`, the publisher page.
- Titles came from `m.t` where present, otherwise the adjacent `a.inflnk` `aria-label`.

That was enough to rebuild it exactly. It was unit-tested against a fixture of Bing's real markup (the build sandbox has no egress to bing.com), deployed, and verified against production on the first attempt.

The rebuilt function is [`netlify/functions/image.mjs`](netlify/functions/image.mjs).

---

## Features

- **Smart image prompt** with `{name}` substitution — one phrase resolves every item
- **Keyboard ranking** — select an item, press `1`–`8` to send it to that tier, `0` or `Backspace` to return it. Ranking forty-eight items takes about three minutes instead of twenty
- **Drag and drop** for anyone who prefers it
- **Autosave and restore** — the working board persists to `localStorage` and reloads on your next visit. Boards embed base64 images and can exceed the ~5MB quota, so a failed write retries with embedded images stripped rather than silently losing the save
- **Named saves** with a delete control, guarded against writing an untitled list
- **Editable tiers** — rename and recolor every row
- **Branded PNG export** with title and site URL, sized for sharing
- **Share codes** — base64 board state, so someone can load your list and re-rank it themselves
- **Presets** — Fast food, Corvette C8 colors, Pokémon GO Megas
- **Upload your own image** for any item the search cannot resolve
- **Undo** at every mutation

---

## Running it

Open `index.html`. That is it — everything except live image search works from the filesystem, because the curated store is embedded.

For the full search chain you need the function, which means Netlify:

```bash
npm i -g netlify-cli
netlify dev
```

Deploying by zip drop: the archive must contain `index.html`, `netlify.toml`, **and** `netlify/functions/image.mjs`. The `[functions]` block in `netlify.toml` is required — without it the function is skipped silently and `/api/image` returns 404 while the rest of the site looks perfectly fine.

**Health check after any deploy:**

```bash
curl "https://<your-site>/api/image?q=big+mac"
```

A non-empty `results` array means the scrape is intact. `{"results":[],"error":"bing-###"}` means it broke — roll back.

---

## Structure

```
index.html                     entire app: markup, styles, logic, curated images
netlify.toml                   publish dir, functions dir, /api/image redirect
netlify/functions/image.mjs    server-side image search
```

No `package.json`, no bundler, no lockfile. `index.html` is large because the curated images live inside it, which is the deliberate trade: a bigger first paint in exchange for a board that fills instantly and still works with no network.

---

## License

MIT
