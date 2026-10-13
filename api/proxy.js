export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.setHeader('Content-Type', resp.headers.get('content-type') || 'text/plain; charset=utf-8');
    const text = await resp.text();
    return res.status(200).send(text);
  } catch (err) {
    return res.status(502).send(err?.message || 'Proxy error');
  }
}
