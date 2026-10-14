const path = require("node:path");
const express = require("express");
const helmet = require("helmet");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
  app.get("/script.js", (req, res) => res.sendFile(path.join(__dirname, "script.js")));
  app.get("/style.css", (req, res) => res.sendFile(path.join(__dirname, "style.css")));
  app.use((req, res) => res.status(404).send("Not found"));
  return app;
}

if (require.main === module) {
  const server = createApp().listen(process.env.PORT || 3000, () => {
    console.log(`Calculator is listening on port ${server.address().port}`);
  });
}

module.exports = { createApp };
