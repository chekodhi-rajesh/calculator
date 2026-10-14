# Calculator

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm install
npm start
```

Open `http://localhost:3000`. Calculation history is saved in this browser's private IndexedDB storage. It stays on this device and browser profile and is not uploaded or synced to a server. Other people using this same browser profile may be able to view its history.

## Hosting

You can host the static calculator files on any web server that serves `index.html`, `script.js`, and `style.css` from the same origin. For the included Node.js server, use:

```sh
npm install
npm start
```

Use the same browser and profile to access a device's saved history. Browser storage may be erased when site data is cleared.
