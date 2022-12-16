import {uiState} from "./state_base.js";
import {tabGroupManagerProxy} from "../proxy.js";
import {TabRenderer} from "../tab_renderer.js";
import {settings} from "../settings.js";

const tabGroupManager = tabGroupManagerProxy;

$(init);

async function init() {
    $("#search-input").on("input", onSearchInput);
    $(document).on("error", "img.tab-icon", onImageError);
    $("#search-results").on("click", ".tab-link a", onTabLinkClick);
}

export async function displaySearchView() {
    $(".view").hide();

    const body = $("body");
    const searchTabsView = $("#search-tabs-view");
    body.css("min-width", `${searchTabsView.width() + 0}px`);
    body.css("min-height", `${searchTabsView.height() + 0}px`);

    searchTabsView.show();

    uiState.setState(new SearchUIState());

    $("#search-input").focus();
}

let searchInputTimeout;
function onSearchInput(e) {
    clearTimeout(searchInputTimeout);
    searchInputTimeout = setTimeout(async () => {
        searchTabs(e.target.value);
    }, 1000);
}

function onImageError(e) {
    e.target.src = "/ui/icons/globe.svg";
}

async function searchTabs(text) {
    const searchResultsTable = $("#search-results");

    if (text && text.length > 1) {
        const tabs = await tabGroupManager.searchTabs(text);

        if (tabs?.length) {
            const tabGroups = await tabGroupManager.computeTabGroups(settings.sort_tab_groups_alphabetically());
            const renderer = new TabRenderer(tabGroups, tabs);

            searchResultsTable.empty();
            renderer.renderTabs(searchResultsTable);
        }
    }
    else
        searchResultsTable.empty();
}

export async function selectTabByKey(key) {
    const tabTD = $(`.tab-line td[accesskey="${key}"]`)
        .closest("tr")
        .find(".tab-link");

    return selectTab(tabTD);
}

export async function selectTabByEnter() {
    const tabTD = $(`.tab-line.active`)
        .find(".tab-link");

    return selectTab(tabTD);
}

export async function onTabLinkClick(e) {
    const tabTD = $(e.target).closest("td");

    e.preventDefault();
    return selectTab(tabTD);
}

export async function selectTab(tabTD) {
    const uuid = tabTD.attr("data-uuid");
    const tabId = parseInt(tabTD.attr("data-tab-id"));

    if (uuid) {
        await tabGroupManager.switchToTabGroup(uuid);
        await browser.tabs.update(tabId, {active: true});
        window.close();
    }
}

export function advanceSelection(direction, container = "search-results") {
    const activeTR = $(`#${container} tr.active`);
    let nextTR = direction? activeTR.next(): activeTR.prev();

    if (nextTR.hasClass(`tab-group-line`))
        nextTR = direction? nextTR.next(): nextTR.prev();

    if (nextTR.length === 0) {
        if (direction)
            nextTR = $(`#${container} tr:first-of-type`);
        else
            nextTR = $(`#${container} tr:last-of-type`);
    }

    if (nextTR.hasClass(`tab-group-line`))
        nextTR = direction? nextTR.next(): nextTR.prev();

    activeTR.removeClass("active");
    nextTR.addClass("active");
}

class SearchUIState {
    onKeyDown(e) {
        const key = e.key;

        if (e.ctrlKey && /^[a-z\d]$/i.test(key))
            selectTabByKey(key);
        else if (key === "ArrowUp") {
            e.preventDefault();
            advanceSelection();
        }
        else if (key === "ArrowDown") {
            e.preventDefault();
            advanceSelection(true);
        }
        else if (key === "Enter")
            selectTabByEnter();
    }
}