import serveStatic from "serve-static-bun";

const port = process.env.PORT ?? 3000;

Bun.serve({ fetch: serveStatic(".", { index: "play.html" }), port });

console.log(`Serving http://localhost:${port}`);
