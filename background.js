const ICON_ACTIVE = {
    16: "icons/icon-active-16.png",
    48: "icons/icon-active-48.png",
    128: "icons/icon-active-128.png"
};

const ICON_DISABLED = {
    16: "icons/icon-disabled-16.png",
    48: "icons/icon-disabled-48.png",
    128: "icons/icon-disabled-128.png"
};

function getHost(rawUrl) {
    if (!rawUrl) return null;
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.hostname;
        }
    } catch {
    }
    return null;
}

function updateTabIcon(tabId, enabled) {
    if (!tabId || tabId < 0) return;
    const path = enabled ? ICON_ACTIVE : ICON_DISABLED;
    chrome.action.setIcon({ tabId, path }, () => {
        if (chrome.runtime.lastError) {
        }
    });
}

function refreshTab(tab) {
    if (!tab || !tab.id) return;
    const host = getHost(tab.url);
    if (!host) {
        updateTabIcon(tab.id, false);
        return;
    }

    chrome.storage.local.get(["pf_sites"], (res) => {
        if (chrome.runtime.lastError) return;
        const sites = res && res.pf_sites ? res.pf_sites : {};
        const enabled = sites[host] !== false;
        updateTabIcon(tab.id, enabled);
    });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        refreshTab(tab);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" || changeInfo.url) {
        refreshTab(tab);
    }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.pf_sites) return;
    chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError || !tabs) return;
        tabs.forEach(refreshTab);
    });
});
