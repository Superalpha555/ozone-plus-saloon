export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div style="font-family:sans-serif;text-align:center;padding:2rem;">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end.</p>
    </div>
  </body>
</html>`;
}
