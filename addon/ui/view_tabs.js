import {uiState} from "./state_base.js";
import {tabGroupManagerProxy} from "../proxy.js";
import {TabRenderer} from "./renderer_tab.js";
import {showTabGroupsView} from "./view_tabgroups.js";
import {settings} from "../settings.js";

const MAX_POPUP_WIDTH = 500;

const tabGroupManager = tabGroupManagerProxy;

let tabGroup;
let searchMode;

$(init);

async function init() {
    $(document).on("error", ".tab-icon", onImageError);
    $("#tabs").on("click", ".tab-link a", onTabLinkClick);
    $("#search-input").on("input", onSearchInput);
}

export async function displayTabsView(uuid) {
    tabGroup = await tabGroupManager.getTabGroup(uuid);
    searchMode = !uuid;

    $(".view").hide();

    const body = $("body");
    const tabsView = $("#tabs-view");

    await setUpTabsView(body, tabsView, searchMode);
    uiState.setState(new TabsUIState());

    setTimeout(() => {
        const scrollbar = document.body.scrollHeight > window.innerHeight;

        if (scrollbar)
            body.css("padding-right", `${16}px`);
    }, 0);
}

async function setUpTabsView(body, tabsView, searchMode) {
    // voodoo to mitigate the flickering extension popup scrollbars
    body.css("min-width", `unset`);
    body.css("min-height", `unset`);

    if (searchMode) {
        $("#tabs").empty();
        $("#search-input-container").show();

        $("#tabs-title-text").text("Search tabs");
        body.css("width", `${MAX_POPUP_WIDTH}px`);
        body.css("height", `max-content`);
    }
    else {
        $("#search-input-container").hide();

        $("#tabs-title-text").text(tabGroup.name);
        await listTabs(tabGroup);

        const viewWidth = Math.min(tabsView.width(), MAX_POPUP_WIDTH);
        body.css("width", `${viewWidth + 10}px`);
        body.css("height", `max-content`);
        //body.css("height", `150px`);
    }

    tabsView.show();

    if (searchMode)
        $("#search-input").focus();
}

function onImageError(e) {
    e.target.src = "/ui/icons/globe.svg";
}

async function listTabs(tabGroup) {
    const groupTabsTable = $("#tabs");
    let tabs = await tabGroupManager.getTabGroupTabs(tabGroup.uuid, false);
    tabs = tabs.map(tab => ({tab, tabGroup: tabGroup.uuid}));

    groupTabsTable.empty();

    if (tabs?.length) {
        const renderer = new TabRenderer([tabGroup], tabs);

        renderer.searchResults = false;
        renderer.renderTabs(groupTabsTable);
    }
}

let searchInputTimeout;
function onSearchInput(e) {
    clearTimeout(searchInputTimeout);
    searchInputTimeout = setTimeout(async () => {
        if (searchMode)
            searchTabs(e.target.value);
        else
            filterTabs(e.target.value);
    }, 1000);
}

async function searchTabs(text) {
    const searchResultsDiv = $("#tabs");

    if (text && text.length > 1) {
        const tabs = await tabGroupManager.searchTabs(text);

        if (tabs?.length) {
            const tabGroups = await tabGroupManager.computeTabGroups(settings.sort_tab_groups_alphabetically());
            const renderer = new TabRenderer(tabGroups, tabs);

            searchResultsDiv.empty();
            renderer.renderTabs(searchResultsDiv);
        }
    }
    else
        searchResultsDiv.empty();
}

async function filterTabs(text) {
    const filteringResultsDiv = $("#tabs");

    if (text && text.length > 1) {
        let tabs = await tabGroupManager.getTabGroupTabs(tabGroup.uuid, false);
        tabs = await tabGroupManager.filterTabs(tabs, text);
        tabs = tabs.map(tab => ({tab, tabGroup: tabGroup.uuid}));

        filteringResultsDiv.empty();

        if (tabs?.length) {
            const renderer = new TabRenderer([tabGroup], tabs);
            renderer.searchResults = false;

            renderer.renderTabs(filteringResultsDiv);
        }
    }
    else
        return listTabs(tabGroup);
}

async function selectTabByKey(key) {
    const tabLine = $(`#tabs [accesskey="${key}"]`)
        .closest(".tab-line");

    return selectTab(tabLine);
}

async function selectTabByEnter() {
    const tabLine = $(`#tabs .tab-line.active`);

    return selectTab(tabLine);
}

async function onTabLinkClick(e) {
    const tabLine = $(e.target).closest(".tab-line");

    e.preventDefault();
    return selectTab(tabLine);
}

async function selectTab(tabLineDiv) {
    const uuid = tabLineDiv.attr("data-uuid");
    const tabId = parseInt(tabLineDiv.attr("data-tab-id"));

    if (uuid) {
        await tabGroupManager.switchToTabGroup(uuid);
        await browser.tabs.update(tabId, {active: true});
        window.close();
    }
}

function advanceSelection(direction) {
    const activeTab = $(`#tabs .active`);
    let nextTab = direction? activeTab.next(): activeTab.prev();

    if (nextTab.hasClass(`tab-group-line`))
        nextTab = direction? nextTab.next(): nextTab.prev();

    if (nextTab.length === 0) {
        if (direction)
            nextTab = $(`#tabs > div:first-of-type`);
        else
            nextTab = $(`#tabs > div:last-of-type`);
    }

    if (nextTab.hasClass(`tab-group-line`))
        nextTab = direction? nextTab.next(): nextTab.prev();

    activeTab.removeClass("active");
    nextTab.addClass("active");
}

function closeSelection() {
    const tabId = getSelectedTabId();

    browser.tabs.remove(tabId);
}

function getSelectedTabId() {
    const tabLine = $(`#tabs .tab-line.active`);
    const tabId = tabLine.attr("data-tab-id");

    return parseInt(tabId);
}

function startTabFiltering() {
    $("#search-input-container").show();
    $("#search-input").focus();
}

class TabsUIState {
    onKeyDown(e) {
        const key = e.key;
        const searchInputContainer = $("#search-input-container");

        if (searchInputContainer.is(":hidden") && /^[a-z\d]$/i.test(key))
            selectTabByKey(key);
        else if (searchInputContainer.is(":visible") && e.ctrlKey && /^[a-z\d]$/i.test(key))
            selectTabByKey(key);
        else if (key === "ArrowUp") {
            e.preventDefault();
            advanceSelection(false);
        }
        else if (key === "ArrowDown") {
            e.preventDefault();
            advanceSelection(true);
        }
        else if (key === "Enter")
            selectTabByEnter();
        else if (key === "ArrowLeft")
            showTabGroupsView();
        else if (key === "Delete")
            closeSelection();
        else if (searchInputContainer.is(":hidden") && key === "=") {
            e.preventDefault();
            startTabFiltering();
        }
    }
}