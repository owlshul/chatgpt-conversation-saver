# ChatGPT Conversation Saver (Floating Button)

A minimal Chrome/Chromium extension for **chatgpt.com** (and **chat.openai.com**) that adds a floating **Save** button to export the entire chat as **.txt** (raw text) or **PDF** (via browser print → Save as PDF).

## Features
- Captures **every letter** in order with clear roles: `USER` and `ASSISTANT`
- **Auto-names** the file using the chat title (fallback to chat ID)
- Handles **long conversations** (auto-scroll to load content)
- Simple UI (floating button + modal)
- Works on `https://chatgpt.com/*` and `https://chat.openai.com/*`
- PDF export fixed via **blob HTML** + opener-triggered `print()`

## Install (Developer Mode)
1. Download this repo.
2. Open Chrome/Brave/Edge and go to `chrome://extensions`.
3. Toggle **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Open any ChatGPT chat → click the **Save** pill at the bottom-right.

## Usage
- Click **Save** → filename auto-filled from the chat title → choose **TXT** or **PDF** → **Save**.
- For PDF, allow pop‑ups for `chatgpt.com` if your browser blocks it.

## Files
- `manifest.json`: MV3 manifest targeting chatgpt.com + chat.openai.com
- `content.js`: Injects floating button; loads all messages; extracts & downloads text; PDF via blob + print
- `content.css`: Button and modal styles

## Permissions
- `host_permissions`: `https://chatgpt.com/*`, `https://chat.openai.com/*`
- `storage` (reserved for future preferences)

## Build a ZIP (for sharing / Web Store)
```
zip -r chatgpt-conversation-saver-v1.1.0.zip manifest.json content.js content.css
```

## Roadmap
- Markdown export (preserve code fences)
- Per-message timestamps and message IDs
- Keyboard shortcut (e.g., Alt+S)
- Bulk export (sidebar list)

## License
MIT
