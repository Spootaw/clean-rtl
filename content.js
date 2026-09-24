(() => {
  "use strict";

  const PF_ATTR = "data-persianflow";
  const PF_STRUCT_ATTR = "data-persianflow-struct";
  const STORAGE_KEY = "pf_sites";

  const BLOCK_SELECTOR = [
    "p",
    "li",
    "div",
    "section",
    "article",
    "aside",
    "header",
    "footer",
    "main",
    "td",
    "th",
    "figcaption",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote"
  ].join(",");

  const SKIP_SELECTOR = [
    "script",
    "style",
    "noscript",
    "textarea",
    "input",
    "select",
    "option",
    "pre",
    "code",
    "kbd",
    "samp",
    "[contenteditable='true']"
  ].join(",");

  const PERSIAN_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const LATIN_RE = /[A-Za-z]/g;

  const STYLE_PROPS = [
    "direction",
    "text-align",
    "margin-left",
    "margin-right",
    "padding-left",
    "padding-right"
  ];

  let enabled = true;
  let observer = null;
  let scanTimer = null;
  let scanning = false;

  function getHost() {
    return typeof location !== "undefined" && location.hostname
        ? location.hostname
        : "local";
  }

  function isPersian(text) {
    if (!text) return false;

    const persianCount = (text.match(PERSIAN_RE) || []).length;
    const latinCount = (text.match(LATIN_RE) || []).length;
    const letterCount = persianCount + latinCount;

    return persianCount > 0 && (letterCount === 0 || persianCount / letterCount >= 0.3);
  }

  function isSkipped(element) {
    return !element ||
        element.nodeType !== 1 ||
        element.matches(SKIP_SELECTOR) ||
        Boolean(element.closest(SKIP_SELECTOR));
  }

  function hasBlockChildren(element) {
    return Array.from(element.children).some((child) =>
        child.matches(BLOCK_SELECTOR) ||
        child.matches("ul, ol, dl")
    );
  }

  function readSnapshot(element) {
    const snapshot = {};

    for (const property of STYLE_PROPS) {
      snapshot[property] = {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      };
    }

    return snapshot;
  }

  function saveSnapshot(element, attribute) {
    if (!element.hasAttribute(attribute)) {
      element.setAttribute(attribute, JSON.stringify(readSnapshot(element)));
    }
  }

  function applyRtl(element, isContainer = false) {
    const attribute = isContainer ? PF_STRUCT_ATTR : PF_ATTR;
    saveSnapshot(element, attribute);

    element.style.setProperty("direction", "rtl", "important");
    element.style.setProperty("text-align", "right", "important");

    if (isContainer) {
      element.style.setProperty("margin-left", "0", "important");
      element.style.setProperty("margin-right", "0", "important");
      element.style.setProperty("padding-left", "0", "important");
      element.style.setProperty("padding-right", "1.5em", "important");
    }
  }

  function restoreElement(element, attribute) {
    const serialized = element.getAttribute(attribute);
    if (!serialized) return;

    try {
      const snapshot = JSON.parse(serialized);

      for (const property of STYLE_PROPS) {
        const saved = snapshot[property];

        if (saved && saved.value) {
          element.style.setProperty(property, saved.value, saved.priority || "");
        } else {
          element.style.removeProperty(property);
        }
      }
    } catch {
    }

    element.removeAttribute(attribute);
  }

  function restoreAll() {
    document.querySelectorAll(`[${PF_ATTR}]`).forEach((element) => {
      restoreElement(element, PF_ATTR);
    });

    document.querySelectorAll(`[${PF_STRUCT_ATTR}]`).forEach((element) => {
      restoreElement(element, PF_STRUCT_ATTR);
    });
  }

  function scan() {
    if (!enabled || scanning || !document.body) return;

    scanning = true;

    try {
      const persianBlocks = [];

      document.querySelectorAll(BLOCK_SELECTOR).forEach((element) => {
        if (isSkipped(element)) return;
        if (hasBlockChildren(element)) return;

        const text = element.innerText || element.textContent || "";
        if (isPersian(text)) {
          persianBlocks.push(element);
        }
      });

      const usedContainers = new Set();

      for (const block of persianBlocks) {
        applyRtl(block, false);

        const list = block.closest("ul, ol");
        if (list && !usedContainers.has(list)) {
          applyRtl(list, true);
          usedContainers.add(list);
        }

        const quote = block.closest("blockquote");
        if (quote && !usedContainers.has(quote)) {
          applyRtl(quote, true);
          usedContainers.add(quote);
        }
      }

      document.querySelectorAll(`[${PF_ATTR}]`).forEach((element) => {
        const text = element.innerText || element.textContent || "";
        if (!isPersian(text)) restoreElement(element, PF_ATTR);
      });

      document.querySelectorAll(`[${PF_STRUCT_ATTR}]`).forEach((element) => {
        const hasPersianDescendant = Array.from(
            element.querySelectorAll(BLOCK_SELECTOR)
        ).some((child) => {
          const text = child.innerText || child.textContent || "";
          return isPersian(text);
        });

        if (!hasPersianDescendant) restoreElement(element, PF_STRUCT_ATTR);
      });
    } finally {
      scanning = false;
    }
  }

  function scheduleScan() {
    if (!enabled) return;

    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 150);
  }

  function startObserver() {
    if (observer || typeof MutationObserver === "undefined" || !document.body) {
      return;
    }

    observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        if (mutation.type === "childList") return true;

        if (mutation.type === "attributes") {
          return mutation.attributeName !== PF_ATTR &&
              mutation.attributeName !== PF_STRUCT_ATTR;
        }

        return mutation.type === "characterData";
      });

      if (relevant) scheduleScan();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "dir", PF_ATTR, PF_STRUCT_ATTR]
    });
  }

  function getCount() {
    return document.querySelectorAll(`[${PF_ATTR}]`).length;
  }

  function sendStatus(sendResponse) {
    sendResponse({
      ok: true,
      enabled,
      count: getCount()
    });
  }

  function setEnabled(value, sendResponse) {
    enabled = Boolean(value);

    if (enabled) {
      scan();
      startObserver();
    } else {
      clearTimeout(scanTimer);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      restoreAll();
    }

    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const sites = result && result[STORAGE_KEY] || {};
      sites[getHost()] = enabled;

      chrome.storage.local.set({ [STORAGE_KEY]: sites }, () => {
        sendResponse({
          ok: !chrome.runtime.lastError,
          enabled,
          count: getCount()
        });
      });
    });
  }

  function init() {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const sites = result && result[STORAGE_KEY] || {};
      enabled = sites[getHost()] !== false;

      if (enabled) {
        scan();
        startObserver();
      }
    });
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.storage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || !message.type) return false;

      if (message.type === "PF_GET_STATUS") {
        sendStatus(sendResponse);
        return false;
      }

      if (message.type === "PF_SET_ENABLED") {
        setEnabled(message.value, sendResponse);
        return true;
      }

      return false;
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { isPersian };
  }
})();
