const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

const distDir = path.join(__dirname, 'dist');
const indexHtml = path.join(distDir, 'index.html');

app.use(express.static(distDir));

// SPA fallback with a helpful message when build is missing
app.get('*', (_, res) => {
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res
    .status(200)
    .send(`
<!doctype html>
<html lang="ru"><head><meta charset="utf-8" />
<title>Tatti Admin</title><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:24px">
  <h1 style="margin:0 0 12px">Сборка не найдена</h1>
  <p>Похоже, папка <code>dist/</code> отсутствует. Сделай одно из двух:</p>
  <ol>
    <li><b>Dev-режим</b>: <code>npm run dev</code> (откроется http://localhost:5173)</li>
    <li><b>Prod-сборка</b>: <code>npm run build</code>, затем <code>npm start</code> (эта страница обновится автоматически)</li>
  </ol>
</body></html>
`);
});

app.listen(PORT, () => console.log('Static server listening on', PORT));
