# 🕹️ SILHOUETTE-SHIFT — Itch.io Upload & Deployment Guide

Your game is fully compiled, packaged, and ready to be uploaded directly to **[Itch.io](https://itch.io/)** as a playable HTML5 web game!

---

## 📦 Ready-to-Upload File

The ready-to-upload ZIP archive is generated in your project root:
- **File:** `silhouette-shift-itch.zip` (~182 KB)
- **Path:** `c:\Users\chris\Downloads\flow app anti\silhouette-shift-itch.zip`

> **Note:** Whenever you make future code changes, you can re-build and re-package the zip at any time with:
> ```bash
> npm run package:itch
> ```

---

## 🚀 Step-by-Step Itch.io Setup

1. **Log in to Itch.io** and go to **[Create a new project](https://itch.io/game/new)**.
2. **Project Details**:
   - **Title:** `Silhouette-Shift`
   - **Classification:** `Games`
   - **Kind of project:** Select **`HTML`** *(You have a ZIP or HTML file that will be played in the browser)*.
3. **Upload Files**:
   - Click **`Upload files`** and select `silhouette-shift-itch.zip`.
   - Once uploaded, check the checkbox: **`This file will be played in the browser`**.
4. **Embed Options**:
   - **Viewport dimensions**:
     - Width: `960` px
     - Height: `600` px
   - Check **`Automatically start on page load`**.
   - Check **`Fullscreen button`** (allows players to expand to full monitor).
   - Check **`Enable scrollbars`** (leave unchecked or optional).
5. **Frame Permissions (Important for Webcam)**:
   - If Itch.io asks about iframe permissions or if you want webcam access inside the Itch.io iframe:
     - Players can grant camera permission when prompted by their browser.
     - If camera access is blocked by the player's browser or iframe sandbox, the game **automatically falls back to the built-in Shadow Simulator**, guaranteeing 100% playability for every player!
6. **Save & Publish**:
   - Set status to **`Draft`** or **`Public`**.
   - Click **`Save & view page`** to test your live game on Itch.io!

---

## 🎯 Gameplay & Features Configured for Itch.io

- **Relative Asset Paths (`./assets/...`)**: Works flawlessly inside Itch.io's nested `html.itch.zone` CDN iframes.
- **HashRouter Integration**: Avoids 404 subpath errors when hosted as an embedded widget.
- **Dedicated Fullscreen Button (`⛶`)**: Expands the game to full display inside the browser.
- **Pure Web Audio API**: Procedural dark synth electronic music and SFX with zero external audio assets to buffer.
- **Client-Side Vision**: 100% local camera processing (zero server uploads).
- **Fallback Simulation Mode**: Playable with mouse-interactive arms even on machines without a camera.
