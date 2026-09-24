import { defineSsrMiddleware } from '#q-app';

const apiBase = () => process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000';
const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!,
  );

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
};

async function api<T>(path: string): Promise<T | null> {
  const response = await fetch(`${apiBase()}/api/v1${path}`, {
    headers: { Accept: 'application/json' },
  });
  return response.ok ? ((await response.json()) as T) : null;
}

const urlset = (urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;

/**
 * Serves robots.txt and a sitemap index listing only profiles that carry a verified
 * signal, so incomplete or unverified records are never offered to crawlers. Profiles
 * are split into files of 10,000 URLs (the protocol allows 50,000 per file).
 */
export default defineSsrMiddleware(({ app, resolve }) => {
  app.get(resolve.urlPath('/robots.txt'), (c) => {
    const origin = new URL(c.req.url).origin;
    return c.text(
      `User-agent: *\nDisallow: /account\nDisallow: /search?\nSitemap: ${origin}/sitemap.xml\n`,
    );
  });

  app.get(resolve.urlPath('/sitemap.xml'), async (c) => {
    const origin = new URL(c.req.url).origin;
    const index = await api<{ pages: number; updated_at: string | null }>('/sitemap');
    if (!index) return c.text('Sitemap unavailable', 503);
    const lastmod = index.updated_at ? `<lastmod>${index.updated_at}</lastmod>` : '';
    const files = [
      `<sitemap><loc>${origin}/sitemaps/pages.xml</loc></sitemap>`,
      ...Array.from(
        { length: index.pages },
        (_, i) =>
          `<sitemap><loc>${origin}/sitemaps/profiles-${i + 1}.xml</loc>${lastmod}</sitemap>`,
      ),
    ];
    return c.body(
      `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.join('')}</sitemapindex>`,
      200,
      XML_HEADERS,
    );
  });

  app.get(resolve.urlPath('/sitemaps/:file'), async (c) => {
    const origin = new URL(c.req.url).origin;
    const file = c.req.param('file') ?? '';

    if (file === 'pages.xml') {
      const pages = ['/', '/search', '/verification'];
      return c.body(
        urlset(pages.map((path) => `<url><loc>${origin}${path}</loc></url>`)),
        200,
        XML_HEADERS,
      );
    }

    const page = /^profiles-(\d{1,4})\.xml$/.exec(file)?.[1];
    if (!page) return c.notFound();
    const profiles = await api<{ slug: string; updated_at: string }[]>(`/sitemap/${page}`);
    if (!profiles) return c.notFound();
    return c.body(
      urlset(
        profiles.map(
          (profile) =>
            `<url><loc>${origin}/profiles/${escapeXml(encodeURIComponent(profile.slug))}</loc><lastmod>${profile.updated_at}</lastmod></url>`,
        ),
      ),
      200,
      XML_HEADERS,
    );
  });
});
