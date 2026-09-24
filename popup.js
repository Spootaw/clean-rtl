// popup.js — کنترل وضعیت افزونه برای سایت فعلی
document.addEventListener("DOMContentLoaded", () => {
  const toggleEl = document.getElementById("toggle");
  const statusEl = document.getElementById("status-text");
  const countEl = document.getElementById("count");

  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query) {
    statusEl.textContent = "فقط داخل کروم کار می‌کند";
    return;
  }

  function refreshStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        statusEl.textContent = "صفحه فعال یافت نشد";
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: "PF_GET_STATUS" }, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) {
          statusEl.textContent = "اسکریپت صفحه هنوز آماده نیست";
          countEl.textContent = "—";
          return;
        }
        statusEl.textContent = res.enabled ? "فعال ✅" : "غیرفعال ⛔";
        countEl.textContent = String(res.count);
        toggleEl.checked = !!res.enabled;
      });
    });
  }

  toggleEl.addEventListener("change", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "PF_SET_ENABLED", value: toggleEl.checked },
        (res) => {
          if (chrome.runtime.lastError || !res || !res.ok) {
            statusEl.textContent = "خطا در اعمال تنظیم";
            return;
          }
          statusEl.textContent = res.enabled ? "فعال ✅" : "غیرفعال ⛔";
          countEl.textContent = String(res.count);
        }
      );
    });
  });

  refreshStatus();
});
