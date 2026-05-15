const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 8080);
const host = "127.0.0.1";
const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requestedPath = request.url === "/" ? "index.html" : decodeURIComponent(request.url.slice(1));
  const resolvedPath = path.resolve(root, requestedPath);

  if (!resolvedPath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(resolvedPath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": types[path.extname(resolvedPath)] || "text/plain" });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Quick To-Do running at http://${host}:${port}`);
});
