const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  const rawTo = Array.isArray(req.query.to) ? req.query.to[0] : req.query.to;

  if (!rawTo) {
    res.status(400).send('Missing "to" parameter');
    return;
  }

  let result = rawTo;

  if (/^https?:\/\/ads\.luarmor\.net\//i.test(result)) {
    result = `http://camper.pythonanywhere.com/redirect?to=${result}`;
  }

  if (!/^https?:\/\/ads\.luarmor\.net\//i.test(rawTo)) {
    res.setHeader("Location", result);
    res.statusCode = 302;
    res.end();
    return;
  }

  const targetUrl = JSON.stringify(result);

  const templatePath = path.join(__dirname, 'pages/redirectDelay.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace('%TARGET_URL%', targetUrl);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.statusCode = 200;
  res.end(html);
}