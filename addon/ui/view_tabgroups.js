import {tabGroupManagerProxy} from "../proxy.js";
import {uiState, UIState} from "./state_base.js";
import {displayEditTabGroupView} from "./view_edit_tabgroup.js";
import {ALL_GROUPS_SPECIFIER, DEFAULT_TAB_GROUP} from "../tabgroup_manager.js";
import {TabGroupRenderer} from "../tabgroup_renderer.js";
import {CONTAINERS} from "./containers.js";
import {settings} from "../settings.js";
import {displaySearchView} from "./view_search.js";
import {displayTabsView} from "./view_tabs.js";

const tabGroupManager = tabGroupManagerProxy;

$(init);

function init() {
    $("#tab-groups").on("click", ".tab-group-line", onTabGroupClick);
    $("#add-tab-group-button").on("click", createTabGroup);
    $("#tab-groups-title-help").on("click", displayShortcuts);
}

export async function displayTabGroupsView(initial) {
    const tabGroupsTable = $("#tab-groups");
    const tabGroups = await tabGroupManager.computeTabGroups(settings.sort_tab_groups_alphabetically());
    const renderer = new TabGroupRenderer(tabGroups, CONTAINERS);

    tabGroupsTable.empty();
    renderer.renderTabGroups(tabGroupsTable);

    uiState.setState(new TabGroupsUIState());

    const body = $("body");
    const tabGroupsView = $("#tab-groups-view");
    body.css("min-width", `${tabGroupsView.width() + 0}px`);
    body.css("min-height", `${tabGroupsView.height() + 0}px`);

    $(".view").hide();
    $("#tab-groups-view").show();
}

function onTabGroupClick(e) {
    const uuid = $(".tab-group-name", $(e.target).closest("tr")).attr("data-uuid");
    return selectTabGroup(uuid);
}

function advanceSelection(direction) {
    const activeTR = $("#tab-groups tr.active");
    let nextTR = direction? activeTR.next(): activeTR.prev();

    if (nextTR.length === 0) {
        if (direction)
            nextTR = $("#tab-groups tr:first-of-type");
        else
            nextTR = $("#tab-groups tr:last-of-type");
    }

    activeTR.removeClass("active");
    nextTR.addClass("active");
}

function getSelectedTabGroup() {
    return $("tr.active")
        .find(".tab-group-name")
        .attr("data-uuid");
}

function getInitiallyActiveTabGroup() {
    return $("tr.initially-active")
        .find(".tab-group-name")
        .attr("data-uuid");
}

function selectGroupByEnter() {
    const uuid = getSelectedTabGroup();

    if (uuid)
        return selectTabGroup(uuid);
}

function selectGroupByKey(key) {
    const uuid = $(`[accesskey="${key}"]`)
        .closest("tr")
        .find(".tab-group-name")
        .attr("data-uuid");

    if (uuid)
        return selectTabGroup(uuid);
}

async function selectTabGroup(uuid) {
    await tabGroupManager.switchToTabGroup(uuid);
    window.close();
}

function deleteSelection() {
    const uuid = getSelectedTabGroup();

    if (uuid.toLowerCase() !== DEFAULT_TAB_GROUP) {
        $("#confirm-delete").show();
        uiState.setState(new TabGroupDeleteUIState());
    }
}

function showSelectionTabs() {
    const uuid = getSelectedTabGroup();

    return displayTabsView(uuid);
}

function createTabGroup() {
    return displayEditTabGroupView();
}

function editSelection() {
    const uuid = getSelectedTabGroup();

    return displayEditTabGroupView(uuid);
}

async function moveTabsToSelection(bySwitching) {
    const uuid = getSelectedTabGroup();
    const action2 = bySwitching? "switching": "";

    await tabGroupManager.moveVisibleTabsToGroup({uuid, action: "move", action2});
    window.close();
}

async function moveCurrentTabToSelection(bySwitching) {
    const uuid = getSelectedTabGroup();
    const action2 = bySwitching? "switching": "";

    await tabGroupManager.moveVisibleTabsToGroup({uuid, action: "move-tab", action2});
    window.close();
}

async function moveTabsToNewWindow() {
    const uuid = getSelectedTabGroup();

    await tabGroupManager.tabGroupInNewWindow(uuid);
    window.close();
}

async function closeSelection() {
    const uuid = getSelectedTabGroup();

    await tabGroupManager.closeTabGroup(uuid);
    window.close();
}

async function reloadSelection() {
    const uuid = getSelectedTabGroup();

    await tabGroupManager.reloadTabGroup(uuid);
}

async function moveSelection(direction) {
    if (!settings.sort_tab_groups_alphabetically()) {
        const uuid = getSelectedTabGroup();

        await tabGroupManager.moveTabGroup(uuid, direction);
        return displayTabGroupsView();
    }
}

async function copySelection(all) {
    const uuid = all? ALL_GROUPS_SPECIFIER: getSelectedTabGroup();

    await tabGroupManager.copyTabGroup(uuid);
}

async function pasteTabGroup() {
    await tabGroupManager.pasteTabGroup();
    return displayTabGroupsView();
}

async function displayShortcuts() {
    await browser.tabs.create({url: "/ui/help/shortcuts.html", active: true});
    window.close();
}

async function displayHelp() {
    await browser.tabs.create({url: "/ui/help/manual.html", active: true});
    window.close();
}

class TabGroupsUIState extends UIState {
    onKeyDown(e) {
        const key = e.key;

        if (key === "ArrowUp") {
            if (e.ctrlKey)
                moveSelection();
            else
                advanceSelection(false);
        }
        else if (key === "ArrowDown") {
            if (e.ctrlKey)
                moveSelection(true);
            else
                advanceSelection(true);
        }
        else if (key === "ArrowRight")
            showSelectionTabs();
        else if (key === "Enter")
            selectGroupByEnter();
        else if (key === "Delete") {
            if (e.ctrlKey)
                closeSelection();
            else
                deleteSelection();
        }
        else if (key === "Insert") {
            if (e.ctrlKey)
                editSelection();
            else
                createTabGroup();
        }
        else if (key === "End") {
            if (e.shiftKey)
                moveTabsToNewWindow();
            else
                moveTabsToSelection(e.ctrlKey);
        }
        else if (key === "Home")
            moveCurrentTabToSelection(e.ctrlKey);
        else if (key === "PageUp")
            copySelection(e.shiftKey);
        else if (key === "PageDown")
            pasteTabGroup();
        else if (/^[a-z\d]$/i.test(key))
            selectGroupByKey(key);
        else if (key === "/")
            reloadSelection();
        else if (key === "=") {
            e.preventDefault();
            displaySearchView();
        }
        else if (key === "F1")
            displayHelp();
    }
}

class TabGroupDeleteUIState extends UIState {
    async onKeyDown(e) {
        const key = e.key;

        if (key === "y") {
            const uuid = getSelectedTabGroup();
            await tabGroupManager.deleteTabGroup(uuid);
            $("#confirm-delete").hide();
            if (uuid === getInitiallyActiveTabGroup())
                window.close();
            else
                displayTabGroupsView();
        }
        else if (key === "n") {
            $("#confirm-delete").hide();
            this.stateMachine.setState(new TabGroupsUIState());
        }
    }
}