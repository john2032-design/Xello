const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  const rawTo = Array.isArray(req.query.to) ? req.query.to[0] : req.query.to;

  if (!rawTo) {
    res.status(400).send('Missing "to" parameter');
    return;
  }

  // If user passed an encoded value (contains %xx sequences) decode it safely.
  let decodedTo = rawTo;
  try {
    if (/%[0-9A-Fa-f]{2}/.test(rawTo)) {
      decodedTo = decodeURIComponent(rawTo);
    }
  } catch (e) {
    // if decode fails, fall back to rawTo
    decodedTo = rawTo;
  }

  let result = decodedTo;

  // If it's an ads.luarmor.net URL, route via camper (and encode the original URL into the camper query)
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

  // For the delay page: inject a safe JS string literal (JSON.stringify produces a quoted + escaped string)
  const safeJsString = JSON.stringify(result);

  // Try a few likely places for the template (helps on Vercel / different runtimes)
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
      // ignore and try next
    }
  }

  if (!html) {
    res.status(500).send('redirectDelay.html template not found (looked in ' + candidates.join(', ') + ')');
    return;
  }

  // Replace placeholder (must match exactly what's in your HTML)
  html = html.replace('%TARGET_URL%', safeJsString);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.statusCode = 200;
  res.end(html);
}