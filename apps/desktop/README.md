# Desktop (Tauri v2)

Wraps the `pos-web` frontend as a Windows/macOS desktop app (and Android/iPad later).

## Completing setup (requires Rust toolchain)

Tauri needs Rust + platform build tools. Install prerequisites:
https://tauri.app/start/prerequisites/

Then initialize the Rust side (`src-tauri/`) from this folder:

```bash
cd apps/desktop
npm install
npm run tauri init
```

During `tauri init`, point Tauri at the web frontend:

- App name: `Restaurant POS`
- Frontend dev server URL: `http://localhost:5173`
- Frontend dist dir: `../pos-web/dist`
- Dev command: `npm run dev:web` (from repo root)
- Build command: `npm run build:web` (from repo root)

## Config notes (PH1 / PH9)

- `DEFAULT_API_URL` should default to `http://localhost:4000/api`.
- The app settings screen (PH9) lets the cashier change the API URL to the
  main cashier PC's LAN address, e.g. `http://192.168.1.10:4000`.
