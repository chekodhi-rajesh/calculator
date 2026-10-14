const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("./server");

test("serves the device-local calculator without account or history API routes", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const page = await fetch(baseUrl);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Saved privately in this browser on this device/);
    assert.doesNotMatch(html, /Sign in|Create an account|Register/);

    for (const asset of ["/script.js", "/style.css"]) {
      const response = await fetch(`${baseUrl}${asset}`);
      assert.equal(response.status, 200);
    }

    const removedEndpoint = await fetch(`${baseUrl}/api/history`);
    assert.equal(removedEndpoint.status, 404);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
