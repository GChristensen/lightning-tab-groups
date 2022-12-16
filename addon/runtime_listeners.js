const ADDON_SETTINGS_KEY = "addon-settings";

browser.runtime.onInstalled.addListener(async details => {
    if (details.reason === "install") {
    }
    else if (details.reason === "update") {
    }
});