const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  const rawTo = Array.isArray(req.query.to) ? req.query.to[0] : req.query.to;

  if (!rawTo) {
    res.status(400).send('Missing "to" parameter');
    return;
  }

  // Try to decode if it looks percent-encoded (but fall back if decodeURIComponent throws)
  let decodedTo = rawTo;
  try {
    if (/%[0-9A-Fa-f]{2}/.test(rawTo)) {
      decodedTo = decodeURIComponent(rawTo);
    }
  } catch (e) {
    decodedTo = rawTo;
  }

  let result = decodedTo;

  // If it's an ads.luarmor.net URL, route via camper (and encode the original into the camper query)
  if (/^https?:\/\/ads\.luarmor\.net\//i.test(decodedTo)) {
    result = `http://camper.pythonanywhere.com/redirect?to=${encodeURIComponent(decodedTo)}`;
  }

  // If it's NOT ads.luarmor.net then do an immediate 302 redirect
  if (!/^https?:\/\/ads\.luarmor\.net\//i.test(decodedTo)) {
    res.setHeader('Location', result);
    res.statusCode = 302;
    res.end();
    return;
  }

  // Create base64 payload of the final target URL (safe to inject anywhere)
  const targetB64 = Buffer.from(result, 'utf8').toString('base64');

  // Try multiple likely template locations (helps on Vercel)
  const candidates = [
    path.join(process.cwd(), 'api', 'pages', 'redirectDelay.html'),
    path.join(process.cwd(), 'pages', 'redirectDelay.html'),
    path.join(__dirname, 'pages', 'redirectDelay.html')
  ];

  let html = null;
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        html = fs.readFileSync(p, 'utf8');
        break;
      }
    } catch (e) {
      // ignore and continue
    }
  }

  if (!html) {
    res.status(500).send('redirectDelay.html template not found (looked in ' + candidates.join(', ') + ')');
    return;
  }

  // Replace placeholder %TARGET_B64% in the template with the base64 string
  html = html.replace(/%TARGET_B64%/g, targetB64);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.statusCode = 200;
  res.end(html);
}