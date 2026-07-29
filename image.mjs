/* /api/image?q=...  ->  { results: [{ img, full, source, title }] }
   Server-side Bing Images scrape. Netlify Function v2 (Node 18+ global fetch).
   Shape matches what the live v10 function returned:
     img    = Bing thumbnail (tse*.mm.bing.net/th/id/OIP...&pid=Api)  [hotlink-safe]
     full   = original publisher image URL
     source = publisher page URL
     title  = result title
   Relevance ranking is done CLIENT-side in index.html; this returns Bing order. */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const decode = s => s
  .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
  .replace(/&amp;/g, '&').replace(/&#38;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'").replace(/&apos;/g, "'");

export default async (req) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();

  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=86400',
      'access-control-allow-origin': '*'
    }
  });

  if (!q) return json({ results: [] });

  try {
    const url = 'https://www.bing.com/images/search?q=' + encodeURIComponent(q)
      + '&form=HDRSC2&first=1&count=35&adlt=moderate';
    const r = await fetch(url, {
      headers: {
        'user-agent': UA,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache'
      }
    });
    if (!r.ok) return json({ results: [], error: 'bing-' + r.status });

    const html = await r.text();
    const results = [];
    const seen = new Set();

    // Each result carries m="{...json...}" on the a.iusc anchor.
    const re = /class="iusc"[^>]*?\sm="([^"]+)"/g;
    let m;
    while ((m = re.exec(html)) !== null && results.length < 30) {
      let meta;
      try { meta = JSON.parse(decode(m[1])); } catch { continue; }
      const img = meta.turl;
      if (!img || seen.has(img)) continue;
      seen.add(img);

      // Title: the m payload sometimes carries `t`; otherwise the following
      // a.inflnk aria-label holds it.
      let title = meta.t || '';
      if (!title) {
        const tail = html.slice(re.lastIndex, re.lastIndex + 2500);
        const t = tail.match(/class="inflnk"[^>]*aria-label="([^"]*)"/);
        if (t) title = decode(t[1]).replace(/^View image (?:title|details):?\s*/i, '');
      }

      results.push({
        img,
        full: meta.murl || img,
        source: meta.purl || meta.murl || img,
        title: title.trim()
      });
    }

    return json({ results });
  } catch (e) {
    return json({ results: [], error: String((e && e.message) || e) });
  }
};

export const config = { path: '/api/image' };
