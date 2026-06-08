const { resolvePublicSiteBaseFromRequest } = require('../utils/publicSiteUrl');

exports.serveRobots = (req, res) => {
    const base = resolvePublicSiteBaseFromRequest(req);
    const lines = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /hesabim', ''];

    if (base) {
        lines.push(`Sitemap: ${base}/sitemap.xml`);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`${lines.join('\n')}\n`);
};
