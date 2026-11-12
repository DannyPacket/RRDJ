// Local preview server for the league site, plus a drop box for the page's exported PNG.
// Usage: node serve_site.js <site dir> [port=8080] [upload dir=<site dir>/../exports]
// GET serves the site (no caching, so a rebuilt reports.json shows on reload).
// PUT /__upload/<name>.png saves the request body to <upload dir>/<name>.png; the weekly run uses it to pull the
// "Export image" PNG out of the browser without a download prompt. Same origin as the page, localhost only.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8080);
const uploads = path.resolve(process.argv[4] || path.join(root, '..', 'exports'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  // Data pulls run in the signed-in Yahoo/Fantrax tabs and drop their JSON here (CORS for those two sites only).
  const origin = req.headers.origin || '';
  const okOrigin = /^https:\/\/([\w-]+\.)*(yahoo\.com|fantrax\.com)$/.test(origin);
  if (okOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  if (req.method === 'OPTIONS') { res.writeHead(okOrigin ? 204 : 403); return res.end(); }
  if (req.method === 'PUT' && url.startsWith('/__upload/')) {
    const name = path.basename(url);
    if (!/^[\w.-]+\.(png|json)$/.test(name)) { res.writeHead(400); return res.end('bad name'); }
    fs.mkdirSync(uploads, { recursive: true });
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const file = path.join(uploads, name);
      fs.writeFileSync(file, Buffer.concat(chunks));
      console.log('saved', file);
      res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end(file);
    });
    return;
  }
  let file = path.join(root, url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (e, data) => {
      if (e) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
}).listen(port, '127.0.0.1', () => console.log('RRDJ at http://localhost:' + port + ' · uploads to ' + uploads));
