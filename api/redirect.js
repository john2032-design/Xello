const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  const rawTo = Array.isArray(req.query.to) ? req.query.to[0] : req.query.to;

  if (!rawTo) {
    res.status(400).send('Missing "to" parameter');
    return;
  }

  let result = rawTo;

  // If incoming is an ads.luarmor.net URL, rewrite to the camper proxy
  if (/^https?:\/\/ads\.luarmor\.net\//i.test(result)) {
    result = `http://camper.pythonanywhere.com/redirect?to=${result}`;
  }

  // If it's not an ads.luarmor.net URL, do immediate 302 redirect.
  if (!/^https?:\/\/ads\.luarmor\.net\//i.test(rawTo)) {
    res.setHeader("Location", result);
    res.statusCode = 302;
    res.end();
    return;
  }

  // SAFELY inject the raw URL by using JSON.stringify(result)
  const safeJsString = JSON.stringify(result);

  // read template (adjust path if your runtime places files elsewhere)
  const templatePath = path.join(__dirname, 'pages', 'redirectDelay.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // replace placeholder %TARGET_URL% with the JS string literal
  html = html.replace('%TARGET_URL%', safeJsString);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.statusCode = 200;
  res.end(html);
}