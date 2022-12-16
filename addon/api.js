import {settings} from "./settings.js";
import {receiveExternal} from "./proxy.js";
import {tabGroupManager} from "./background_state.js";
import {COLOR_MNEMONICS} from "./ui/themes.js";

receiveExternal.ltgGetVersion = async (message, sender) => {
    return _ADDON_VERSION;
};

receiveExternal.ltgGetTabGroups = async (message, sender) => {
    return tabGroupManager.computeTabGroups(settings.sort_tab_groups_alphabetically());
};

receiveExternal.ltgGetCurrentWindowTabGroupName = async (message, sender) => {
    return tabGroupManager.getCurrentWindowTabGroupName();
};

receiveExternal.ltgGetTabGroupTabs = async (message, sender) => {
    let result = await tabGroupManager.getTabGroupTabs(message.uuid);

    if (message.filter)
       result = tabGroupManager.filterTabs(result, message.filter);

    return result;
};

receiveExternal.ltgIsTabGroupExist = async (message, sender) => {
    return tabGroupManager.isTabGroupExist(message.name);
};

receiveExternal.ltgCreateTabGroup = async (message, sender) => {
    const options = {name: message.name};

    if (message.colorKey) {
        options.colorKey = message.colorKey;
        options.color = COLOR_MNEMONICS[parseInt(message.colorKey)];
    }

    if (message.container) {
        const containers = await tabGroupManager.getContainers();
        options.container = containers.find(c => c.cookieStoreId === message.container);
    }

    return tabGroupManager.createTabGroup(options);
};

receiveExternal.ltgSwitchToTabGroup = async (message, sender) => {
    return tabGroupManager.switchToTabGroup(message.uuid, message.activeTab);
};

receiveExternal.ltgDeleteTabGroup = async (message, sender) => {
    return tabGroupManager.deleteTabGroup(message.uuid);
};

receiveExternal.ltgCloseTabGroup = async (message, sender) => {
    return tabGroupManager.closeTabGroup(message.uuid, message.filter);
};

receiveExternal.ltgReloadTabGroup = async (message, sender) => {
    return tabGroupManager.reloadTabGroup(message.uuid, message.filter);
};

receiveExternal.ltgTabGroupInNewWindow = async (message, sender) => {
    return tabGroupManager.tabGroupInNewWindow(message.uuid, message.filter);
};

receiveExternal.ltgMoveVisibleTabsToGroup = async (message, sender) => {
    return tabGroupManager.moveVisibleTabsToGroup(message.params);
};

receiveExternal.ltgCopyTabGroup = async (message, sender) => {
    return tabGroupManager.copyTabGroup(message.uuid);
};

receiveExternal.ltgPasteTabGroup = async (message, sender) => {
    return tabGroupManager.pasteTabGroup();
};