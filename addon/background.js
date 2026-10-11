import {tabGroupManager} from "./background_state.js";
import {receive, receiveExternal} from "./proxy.js";
import {displayMnemonic} from "./ui/action.js";
import {settings} from "./settings.js";
import "./api.js";

await settings.load();

receiveExternal.startListener(true);
receive.startListener(true);

receive.tgmMethod = message => tabGroupManager[message.method](...message.args);

receive.refreshWindows = message => refreshWindows();

tabGroupManager.onTabGroupChanged = tabGroup => displayMnemonic(tabGroup);

refreshWindows();

browser.windows.onCreated.addListener(displayWindowTabGroupMnemonic);

const ACTION_MENU_SETTINGS = "action-menu-settings";

createActionMenu();

browser.menus.onClicked.addListener(info => {
    if (info.menuItemId === ACTION_MENU_SETTINGS)
        browser.runtime.openOptionsPage();
});

async function createActionMenu() {
    await browser.menus.removeAll();

    browser.menus.create({
        id: ACTION_MENU_SETTINGS,
        title: "Settings",
        contexts: [_MANIFEST_V3? "action": "browser_action"]
    });
}

async function refreshWindows() {
    const windows = await browser.windows.getAll();

    for (const window of windows)
        await displayWindowTabGroupMnemonic(window);
}

async function displayWindowTabGroupMnemonic(window) {
    const tabGroup = await tabGroupManager.getWindowTabGroup(window.id);
    await displayMnemonic(tabGroup, window.id);
}