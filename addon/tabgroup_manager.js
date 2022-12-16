import {localeCompare} from "./utils.js";
import {settings} from "./settings.js";

export const DEFAULT_TAB_GROUP = "default";
export const ALL_GROUPS_SPECIFIER = "all";
const TAB_GROUP_FORMAT = "lightning-tab-groups";
const TAB_GROUP_STATE = "tab-groups";

export class TabGroupManager {
    static DEFAULT_STATE = {[DEFAULT_TAB_GROUP]: {name: DEFAULT_TAB_GROUP, uuid: DEFAULT_TAB_GROUP}};

    #tabGroups = TabGroupManager.DEFAULT_STATE;
    #seenWebRequests = new Set();
    #recentTabGroup;
    #tabsByWindows = {};
    #tabImport;

    onTabGroupChanged;

    constructor() {
        this.#installListeners();
        return this.#loadState()
            .then(this.#trackExistingTabs.bind(this))
            .then(() => this);
    }

    async #loadState() {
        const state = await settings.get(TAB_GROUP_STATE) || {};
        this.#tabGroups = state.tab_groups || TabGroupManager.DEFAULT_STATE;
        this.#recentTabGroup = state.recent_tab_group;
    }

    async #saveState() {
        const state = {
            tab_groups: this.#tabGroups,
            recent_tab_group: this.#recentTabGroup
        };

        return settings.set(TAB_GROUP_STATE, state);
    }

    async #getWindowTabGroupUUID(window) {
        const windowTabGroup = await browser.sessions.getWindowValue(window.id, "tabGroup");
        return windowTabGroup || DEFAULT_TAB_GROUP;
    }

    async #setWindowTabGroupUUID(window, uuid) {
        return browser.sessions.setWindowValue(window.id, "tabGroup", uuid);
    }

    async #getTabWindowTabGroupUUID(tab) {
        const tabWindow = await browser.windows.get(tab.windowId);
        return this.#getWindowTabGroupUUID(tabWindow);
    }

    async #getCurrentWindowTabGroupUUID() {
        const currentWindow = await browser.windows.getCurrent();
        return this.#getWindowTabGroupUUID(currentWindow);
    }

    async getCurrentWindowTabGroupName() {
        const currentWindow = await browser.windows.getCurrent();
        const uuid = await this.#getWindowTabGroupUUID(currentWindow);

        if (uuid)
            return this.#tabGroups[uuid]?.name;
    }

    async #setCurrentWindowTabGroupUUID(uuid) {
        const currentWindow = await browser.windows.getCurrent();
        return this.#setWindowTabGroupUUID(currentWindow, uuid);
    }

    async #addToActiveTabGroup(tab) {
        const windowTabGroup = await this.#getTabWindowTabGroupUUID(tab);
        if (windowTabGroup !== DEFAULT_TAB_GROUP)
            await browser.sessions.setTabValue(tab.id, "tabGroup", windowTabGroup);

        this.#trackTab(tab, windowTabGroup);
    }

    async #addToTabGroup(tab, tabGroup) {
        await browser.sessions.setTabValue(tab.id, "tabGroup", tabGroup);
    }

    async #getTabGroupUUID(tab, raw) {
        const tabGroup = await browser.sessions.getTabValue(tab.id, "tabGroup");
        if (raw)
            return tabGroup;
        else
            return tabGroup || DEFAULT_TAB_GROUP;
    }

    async #setPlaceholderTab(tab) {
        await browser.sessions.setTabValue(tab.id, "placeholderTab", "true");
    }

    async #isPlaceholderTab(tab) {
        const placeholderTab = await browser.sessions.getTabValue(tab.id, "placeholderTab");
        return placeholderTab === "true";
    }

    #installListeners() {
        //browser.windows.onCreated.addListener(this.#onWindowCreated.bind(this));
        browser.windows.onRemoved.addListener(this.#onWindowRemoved.bind(this));
        browser.tabs.onCreated.addListener(this.#onTabCreated.bind(this));
        browser.tabs.onAttached.addListener(this.#onTabAttached.bind(this));
        browser.tabs.onRemoved.addListener(this.#onTabRemoved.bind(this));
        browser.tabs.onDetached.addListener(this.#onTabDetached.bind(this));

        browser.webRequest.onBeforeRequest.addListener(this.#onBeforeTabCreated.bind(this), {
                urls: ['<all_urls>'],
                types: [browser.webRequest.ResourceType.MAIN_FRAME],
            },
            [browser.webRequest.OnBeforeRequestOptions.BLOCKING]
        );
    }

    async #onWindowCreated(browserWindow) {
        // if (this.#recentTabGroup)
        //     await this.#setWindowTabGroupUUID(browserWindow, this.#recentTabGroup);
    }

    async #onWindowRemoved(windowId, removeInfo) {
        this.#untrackWindow(windowId);
    }

    async #onTabCreated(tab) {
        if (!this.#tabImport) {
            const uuid = await this.#getTabGroupUUID(tab, true);

            if (!uuid)
                await this.#addToActiveTabGroup(tab);
        }
    }

    async #onTabRemoved(tabId, removeInfo) {
        this.#untrackTab(tabId);
    }

    #onTabAttached(tabId, attachInfo) {
        return this.#addToActiveTabGroup({id: tabId, windowId: attachInfo.newWindowId});
    }

    async #onTabDetached(tabId, detachInfo) {
        this.#untrackTab(tabId);
    }

    async #onBeforeTabCreated(request) {
        if (request.frameId !== 0 || request.tabId === -1 || this.#seenWebRequests.has(request.requestId))
            return {};

        this.#seenWebRequests.add(request.requestId);
        setTimeout(() => this.#seenWebRequests.delete(request.requestId), 2000);

        const tab = await browser.tabs.get(request.tabId);

        if (tab) {
            const windowTabGroup = await this.#getTabWindowTabGroupUUID(tab);
            const tabGroup = this.#tabGroups[windowTabGroup];

            if (tabGroup.container) {
                const cookieStoreId = tabGroup.container.cookieStoreId;

                if (request.cookieStoreId !== cookieStoreId) {
                    try {
                        await browser.tabs.create({url: request.url, cookieStoreId});
                        browser.tabs.remove(tab.id);
                    }
                    catch (e) {
                        console.error(e);
                    }
                    return {cancel: true};
                }
            }
        }

        return {};
    }

    async #trackExistingTabs() {
        const tabs = await browser.tabs.query({});

        this.#tabsByWindows = {};

        for (const tab of tabs) {
            const tabGroup = await this.#getTabGroupUUID(tab);
            this.#trackTab(tab, tabGroup);
        }
    }

    #trackTab(tab, tabGroup) {
        let tabGroupWindows = this.#tabsByWindows[tabGroup] || {};
        let windowTabs = tabGroupWindows[tab.windowId] || [];

        windowTabs.push(tab.id);
        tabGroupWindows[tab.windowId] = windowTabs;
        this.#tabsByWindows[tabGroup] = tabGroupWindows;
    }

    #findCachedTab(tabId, foundf) {
        for (const tabGroup in this.#tabsByWindows) {
            let tabGroupWindows = this.#tabsByWindows[tabGroup];

            for (const windowId in tabGroupWindows) {
                const tabs = tabGroupWindows[windowId];
                const index = tabs.indexOf(tabId);

                if (index >= 0)
                    return foundf(tabGroup, windowId, tabs, index);
            }
        }
    }

    #untrackTab(tabId) {
        this.#findCachedTab(tabId, (_1, _2, tabs, index) => tabs.splice(index, 1));
    }

    #untrackWindow(windowId) {
        for (const tabGroup in this.#tabsByWindows) {
            let tabGroupWindows = this.#tabsByWindows[tabGroup];

            const index = tabGroupWindows.indexOf(windowId);

            if (index >= 0)
                tabGroupWindows.splice(index, 1)
        }
    }

    #getCachedTabGroupUUID(tabId) {
        return this.#findCachedTab(tabId, tabGroup => tabGroup);
    }

    async isTabGroupExist(name) {
        name = name.toLowerCase();
        for (const tabGroup of Object.values(this.#tabGroups))
            if (tabGroup.name.toLowerCase() === name)
                return true;
    }

    async createTabGroup(options) {
        if (options.name === ALL_GROUPS_SPECIFIER || options.name === DEFAULT_TAB_GROUP)
            throw new Error("Can not create group with this name: " + options.name);

        options.uuid = crypto.randomUUID();
        this.#tabGroups[options.uuid] = options;

        await this.#saveState();
        return options;
    }

    async modifyTabGroup(tabGroup) {
        if (tabGroup?.name === ALL_GROUPS_SPECIFIER)
            throw new Error("Can not modify group with this name: " + tabGroup.name);

        this.#tabGroups[tabGroup.uuid] = tabGroup;

        return this.#saveState();
    }

    containerEntity(container) {
        if (container)
            return {
                name: container.name.toLowerCase(),
                cookieStoreId: container.cookieStoreId
            };
    }

    #removeTabGroup(uuid) {
        delete this.#tabGroups[uuid];
    }

    async switchToTabGroup(uuid, activeTab) {
        let windowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        uuid = uuid || DEFAULT_TAB_GROUP;

        try {
            if (windowTabGroup !== uuid) {
                await this.#setCurrentWindowTabGroupUUID(uuid);
                this.#recentTabGroup = uuid;

                const tabs = await browser.tabs.query({currentWindow: true});

                const [tabsToHide, tabsToShow] = await this.#separateTabs(tabs, uuid);

                if (tabsToShow.length) {
                    if (activeTab)
                        await browser.tabs.update(activeTab.id, {active: true});
                    else {
                        tabsToShow.sort((a, b) => b.lastAccessed - a.lastAccessed);
                        await browser.tabs.update(tabsToShow[0].id, {active: true});
                    }

                    if (tabsToShow.length > 1) {
                        let placeholderTab;

                        for (const tab of tabsToShow)
                            if (await this.#isPlaceholderTab(tab) && tab.url === "about:blank") {
                                placeholderTab = tab;
                                browser.tabs.remove(tab.id);
                                break;
                            }

                        if (placeholderTab)
                            tabsToShow.splice(tabsToShow.indexOf(placeholderTab), 1);
                    }

                }
                else {
                    const placeholderTab = await browser.tabs.create({active: true});
                    await this.#setPlaceholderTab(placeholderTab);
                }

                await browser.tabs.hide(tabsToHide.map(t => t.id));
                await browser.tabs.show(tabsToShow.map(t => t.id));
                await this.#saveState();

                if (this.onTabGroupChanged) {
                    const tabGroup = this.getTabGroup(uuid);
                    this.onTabGroupChanged(tabGroup);
                }
            }
            else if (activeTab) {
                await browser.tabs.update(activeTab.id, {active: true});
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    async #separateTabs(tabs, uuid) {
        const tabsToHide = [];
        const tabsToShow = [];

        await Promise.all(tabs.map(async tab => {
            try {
                const tabGroup = await this.#getTabGroupUUID(tab);

                if (tabGroup !== uuid)
                    tabsToHide.push(tab);
                else
                    tabsToShow.push(tab);
            } catch (e) {
                console.error(e);
            }
        }));

        return [tabsToHide, tabsToShow];
    }

    async getTabGroupTabs(uuid, currentWindow = true) {
        uuid = uuid || DEFAULT_TAB_GROUP;
        const params = {};

        if (currentWindow)
            params.currentWindow = true;

        const tabs = await browser.tabs.query(params);

        const result = [];
        for (const tab of tabs) {
            const tabGroup = this.#findCachedTab(tab.id, tabGroup => tabGroup);
            if (tabGroup === uuid)
                result.push(tab);
        }

        return result;
    }

    filterTabs(tabs, filter) {
        let result = tabs;

        if (filter) {
            filter = filter.toLowerCase();

            const filterf = tab => {
                const urlMatches = tab.url.toLowerCase().includes(filter);
                const titleMatches = tab.title?.toLowerCase()?.includes(filter);
                return urlMatches || titleMatches;
            };

            result = tabs.filter(filterf);
        }

        return result;
    }

    getTabGroup(uuid) {
        if (uuid)
            return this.#tabGroups[uuid];
        else
            return this.#tabGroups[DEFAULT_TAB_GROUP];
    }

    async getWindowTabGroup(windowId) {
        const uuid = windowId
            ? await this.#getWindowTabGroupUUID({id: windowId})
            : await this.#getCurrentWindowTabGroupUUID();

        return this.getTabGroup(uuid);
    }

    async computeTabGroups(sort) {
        const currentWindow = await browser.windows.getCurrent();
        const windowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        const result = [];

        let groups = Object.values(this.#tabGroups);

        if (sort)
            groups = this.#sortTabGroups(groups);

        let hasContainers = false;
        for (let group of groups) {
            group = {...group};

            if (group.container)
                hasContainers = true;

            const [totalTabs, windowTabs] = this.#computeTabCount(group.uuid, currentWindow.id);

            group.active = group.uuid === windowTabGroup;
            group.windowTabsCount = windowTabs;
            group.allTabsCount = totalTabs;

            result.push(group);
        }

        return result;
    }

    #computeTabCount(tabGroup, windowId) {
        const tabGroupTabs = this.#tabsByWindows[tabGroup];
        let result = [0, 0];

        if (tabGroupTabs) {
            let totalTabs = 0;

            for (const windowId in tabGroupTabs)
                totalTabs += tabGroupTabs[windowId].length;

            result = [totalTabs, tabGroupTabs[windowId]?.length || 0]
        }

        return result
    }

    #sortTabGroups(groups) {
        const defaultGroupIdx = groups.findIndex(g => g.uuid === DEFAULT_TAB_GROUP);
        const defaultGroup = groups[defaultGroupIdx];
        groups.splice(defaultGroupIdx, 1);
        groups.sort(localeCompare("name"))
        return [defaultGroup, ...groups];
    }

    async moveTabGroup(uuid, direction) {
        const newState = {};
        let keys = Object.keys(this.#tabGroups);
        const index = keys.indexOf(uuid);

        if (direction && (index < keys.length - 1) || !direction && index > 0) {
            const leftPart = keys.slice(0, index);
            const rightPart = keys.slice(index + 1, keys.length);

            if (direction) {
                leftPart.push(rightPart.shift());
                keys = [...leftPart, uuid, ...rightPart];
            }
            else {
                rightPart.unshift(leftPart.pop());
                keys = [...leftPart, uuid, ...rightPart];
            }

            for (const key of keys)
                newState[key] = this.#tabGroups[key];

            this.#tabGroups = newState;
            await this.#saveState();
        }
    }

    async copyTabGroup(uuid) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        uuid = uuid || currentWindowTabGroup;

        let outputObject;
        if (uuid === ALL_GROUPS_SPECIFIER) {
            outputObject = [];
            for (const uuid in this.#tabGroups) {
                const group = await this.#exportTabGroup(uuid);
                outputObject.push(group);
            }
        }
        else
            outputObject = await this.#exportTabGroup(uuid);

        const output = JSON.stringify(outputObject, null, 2);
        await navigator.clipboard.writeText(output);
    }

    async #exportTabGroup(uuid) {
        const tabGroup = this.#tabGroups[uuid];
        const tabs = await this.getTabGroupTabs(uuid, false);
        return {
            format: TAB_GROUP_FORMAT,
            version: 1,
            tabGroup: tabGroup,
            tabs: tabs.map(t => t.url)
        };
    }

    async #parseClipboardContent(verbose) {
        const input = await navigator.clipboard.readText();
        let inputObject;

        try {
            inputObject = JSON.parse(input);
        } catch (e) {
            console.error(e)
        }

        return inputObject;
    }

    async pasteTabGroup() {
        const inputObject = await this.#parseClipboardContent(true);

        try {
            this.#tabImport = true;

            if (Array.isArray(inputObject)) {
                for (const object of inputObject)
                    if (object?.format === TAB_GROUP_FORMAT)
                        await this.#importTabGroup(object);
            }
            else if (inputObject?.format === TAB_GROUP_FORMAT)
                await this.#importTabGroup(inputObject);
        }
        finally {
            this.#tabImport = false;
        }

        await this.#saveState();
        await this.#trackExistingTabs();

        return inputObject;
    }

    async #importTabGroup(object) {
        const uuid = object.tabGroup.uuid;
        this.#tabGroups[uuid] = object.tabGroup;

        const comparator = localeCompare("name");
        const containers = await this.getContainers();
        const container = object.tabGroup.container? containers.find(c => !comparator(c, object.tabGroup.container)): null;

        if (container)
            this.#tabGroups[uuid].container.cookieStoreId = container.cookieStoreId;
        else
            delete this.#tabGroups[uuid].container;

        const tabs = await this.getTabGroupTabs(uuid, false);
        const tabsToCreate = object.tabs.filter(url => !tabs.some(t => t.url === url));
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupUUID();

        for (const url of tabsToCreate) {
            try {
                const tab = await browser.tabs.create({url, active: false});

                await this.#addToTabGroup(tab, uuid);

                if (currentWindowTabGroup !== uuid)
                    browser.tabs.hide(tab.id);
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    async getContainers() {
        let containers = [];

        try {
            containers = await browser.contextualIdentities.query({})
        } catch (e) {
            console.error(e);
        }

        return containers;
    }

    async reloadTabGroup(uuid, filter) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        uuid = uuid || currentWindowTabGroup;

        let tabs;
        if (uuid === ALL_GROUPS_SPECIFIER)
            tabs = await browser.tabs.query({});
        else
            tabs = await this.getTabGroupTabs(uuid, false);

        tabs = this.filterTabs(tabs, filter);

        for (const tab of tabs)
            try {
                await browser.tabs.update(tab.id, {url: tab.url});
            }
            catch (e) {
                console.error(e);
            }
    }

    async closeTabGroup(uuid, filter) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        uuid = uuid || currentWindowTabGroup;

        let tabs;
        if (uuid === ALL_GROUPS_SPECIFIER)
            tabs = await browser.tabs.query({});
        else
            tabs = await this.getTabGroupTabs(uuid, false);

        const filteredTabs = this.filterTabs(tabs, filter);

        if ((currentWindowTabGroup === uuid || ALL_GROUPS_SPECIFIER === uuid) && filteredTabs.length === tabs.length) {
            const placeholderTab = await browser.tabs.create({active: true});
            await this.#setPlaceholderTab(placeholderTab);
        }

        await browser.tabs.remove(filteredTabs.map(t => t.id));
    }

    async deleteTabGroup(uuid) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        uuid = uuid || currentWindowTabGroup;

        if (uuid !== DEFAULT_TAB_GROUP) {
            if (uuid === ALL_GROUPS_SPECIFIER) {
                let groups = Object.values(this.#tabGroups);
                groups = groups.filter(g => g.uuid !== DEFAULT_TAB_GROUP);

                await this.switchToTabGroup(DEFAULT_TAB_GROUP);

                for (const group of groups) {
                    this.#removeTabGroup(group.uuid);
                    await this.closeTabGroup(group.uuid);
                }
            }
            else {
                this.#removeTabGroup(uuid);

                if (uuid === currentWindowTabGroup)
                    await this.switchToTabGroup(DEFAULT_TAB_GROUP);

                await this.closeTabGroup(uuid);
            }

            await this.#saveState();
        }
    }

    async tabGroupInNewWindow(uuid, filter) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        uuid = uuid || currentWindowTabGroup;

        const currentWindow = await browser.windows.getCurrent();

        let tabs
        if (uuid === ALL_GROUPS_SPECIFIER) {
            tabs = await browser.tabs.query({});
            uuid = DEFAULT_TAB_GROUP;
        }
        else
            tabs = await this.getTabGroupTabs(uuid, false);

        if (tabs.length) {
            const filteredTabs = this.filterTabs(tabs, filter);

            const newWindow = await browser.windows.create({});
            await this.#setWindowTabGroupUUID(newWindow, uuid);
            const tabGroup = this.getTabGroup(uuid);
            this.onTabGroupChanged(tabGroup);

            let currentWindowTabs = await browser.tabs.query({windowId: currentWindow.id});
            const newWindowTabs = await browser.tabs.query({windowId: newWindow.id});

            currentWindowTabs = currentWindowTabs.filter(t => !t.hidden);

            if (uuid === currentWindowTabGroup && filteredTabs.length === currentWindowTabs.length) {
                const placeholderTab = await browser.tabs.create({windowId: currentWindow.id});
                await this.#setPlaceholderTab(placeholderTab);
            }

            await browser.tabs.move(filteredTabs.map(t => t.id), {windowId: newWindow.id, index: -1});
            await browser.tabs.remove(newWindowTabs.map(t => t.id));

            filteredTabs.forEach(t => this.#addToTabGroup(t, uuid));
        }
    }

    async moveVisibleTabsToGroup(params) {
        const moveActiveTab = params.action === "move-tab";
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupUUID();
        const switching = params.action2 === "switching";
        params.uuid = params.uuid || DEFAULT_TAB_GROUP;

        if (params.uuid !== currentWindowTabGroup) {
            const windowVisibleTabs = (await browser.tabs.query({currentWindow: true})).filter(t => !t.hidden);

            let tabsToMove = windowVisibleTabs;
            let tabToActivate;

            if (moveActiveTab)
                //tabsToMove = await browser.tabs.query({active: true, currentWindow: true});
                tabsToMove = await browser.tabs.query({highlighted: true, currentWindow: true});
            else {
                const highlightedTabs = await browser.tabs.query({highlighted: true, currentWindow: true});

                if (highlightedTabs.length > 1)
                    tabsToMove = highlightedTabs;

                tabsToMove = this.filterTabs(tabsToMove, params.filter);
            }

            if (windowVisibleTabs.length === tabsToMove.length && !switching) {
                tabToActivate = await browser.tabs.create({});
                await this.#setPlaceholderTab(tabToActivate);
            }
            else if (!switching) {
                const notSelectedTabs = windowVisibleTabs.filter(t => !tabsToMove.some(st => st.id === t.id));
                notSelectedTabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
                tabToActivate = notSelectedTabs[0];
            }

            for (const tab of tabsToMove)
                await this.#addToTabGroup(tab, params.uuid);

            if (switching)
                await this.switchToTabGroup(params.uuid);
            else {
                await browser.tabs.update(tabToActivate.id, {active: true});
                await browser.tabs.hide(tabsToMove.map(t => t.id));
            }

            /* await */ this.#trackExistingTabs();
        }
    }

    async searchTabs(text) {
        const tabs = await browser.tabs.query({});
        const pattern = new RegExp(text, "i");
        const result = [];

        for (const tab of tabs) {
            const titleMatch = tab.title?.match(pattern);
            const urlMatch = tab.url?.match(pattern);

            if (titleMatch || urlMatch) {
                const uuid = this.#getCachedTabGroupUUID(tab.id);
                result.push({tab, tabGroup: uuid});
            }
        }

        return result;
    }
}