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

async function refreshWindows() {
    const windows = await browser.windows.getAll();

    for (const window of windows)
        await displayWindowTabGroupMnemonic(window);
}

async function displayWindowTabGroupMnemonic(window) {
    const tabGroup = await tabGroupManager.getWindowTabGroup(window.id);
    await displayMnemonic(tabGroup, window.id);
}