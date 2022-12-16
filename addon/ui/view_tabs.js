import {uiState} from "./state_base.js";
import {tabGroupManagerProxy} from "../proxy.js";
import {TabRenderer} from "../tab_renderer.js";
import {advanceSelection, onTabLinkClick, selectTabByEnter, selectTabByKey} from "./view_search.js";
import {displayTabGroupsView} from "./view_tabgroups.js";

const tabGroupManager = tabGroupManagerProxy;

$(init);

async function init() {
    $(document).on("error", ".tab-icon", onImageError);
    $("#group-tabs").on("click", ".tab-link a", onTabLinkClick);
}

export async function displayTabsView(uuid) {
    const tabGroup = await tabGroupManager.getTabGroup(uuid);

    $(".view").hide();
    $("#tabs-title-text").text(tabGroup.name);

    await listTabs(tabGroup);

    const body = $("body");
    const tabsView = $("#tabs-view");
    body.css("min-width", `${tabsView.width() + 0}px`);
    body.css("min-height", `${tabsView.height() + 0}px`);

    tabsView.show();

    uiState.setState(new TabsUIState());
}

function onImageError(e) {
    e.target.src = "/ui/icons/globe.svg";
}

async function listTabs(tabGroup) {
    const groupTabsTable = $("#group-tabs");
    let tabs = await tabGroupManager.getTabGroupTabs(tabGroup.uuid, false);
    tabs = tabs.map(tab => ({tab, tabGroup: tabGroup.uuid}));

    groupTabsTable.empty();

    if (tabs?.length) {
        const renderer = new TabRenderer([tabGroup], tabs);

        renderer.searchResults = false;
        renderer.renderTabs(groupTabsTable);
    }
}

class TabsUIState {
    onKeyDown(e) {
        const key = e.key;

        if (/^[a-z\d]$/i.test(key))
            selectTabByKey(key);
        else if (key === "ArrowUp") {
            e.preventDefault();
            advanceSelection(false, "group-tabs");
        }
        else if (key === "ArrowDown") {
            e.preventDefault();
            advanceSelection(true, "group-tabs");
        }
        else if (key === "Enter")
            selectTabByEnter();
        else if (key === "ArrowLeft")
            displayTabGroupsView();
    }
}