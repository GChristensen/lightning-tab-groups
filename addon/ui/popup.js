import {settings} from "../settings.js";
import {displayTabGroupsView} from "./view_tabgroups.js";
import {uiState} from "./state_base.js";


$(init)

async function init() {
    await settings.load();

    document.addEventListener("keydown", e => uiState.onKeyDown(e));

    applyCustomStyles();

    await displayTabGroupsView(true);
}

function applyCustomStyles() {
    if (settings.highlight_selection()) {
        const color = settings.selection_highlight_color() || "";
        const rule = `.active td {background-color: ${color};}`;
        document.styleSheets[0].insertRule(rule, 0);
    }
}