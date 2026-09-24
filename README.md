# Clean RTL — Persian Text Direction Fixer (Manifest V3)

This Chrome extension runs **locally** (without sending any data to external servers) to fix the direction and alignment of Persian/Arabic text blocks on web pages — **without altering the layout of the entire page**.

## Features
- Automatic detection of text blocks with a majority of Persian/Arabic characters
- Applies `direction: rtl` and `text-align: right` exclusively to target blocks
- Dynamic content support (SPAs) using `MutationObserver` with mutation-loop prevention
- Preserves and cleanly restores original styles when the extension is toggled off
- Safely skips `code`, `pre`, `script`, `style`, `textarea`, `input`, and editable fields
- Skips URLs, emails, and code-like snippets
- Per-site on/off toggle stored in `chrome.storage.local`
- Zero data collection or text tracking; entirely offline

## Installation (Load Unpacked)
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `clear-RTL` directory (this folder).
5. The extension icon will appear in your toolbar. Click it to toggle the extension on/off for the current site and view the count of modified blocks.

## Quick Test
1. Open `test.html` in Chrome (simply drag and drop it from your file manager into the browser).
2. Persian paragraphs should be aligned right-to-left (RTL), while code snippets and English links remain untouched.
3. Toggle the extension off from the popup — everything should revert to its initial state.
4. Check the popup to see the count of adjusted blocks.

## Automated Tests (No Package Installation Required)
```bash
node tests/run-tests.js
