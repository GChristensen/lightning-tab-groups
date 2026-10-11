import {settings} from "../settings.js";
import {displayTabGroupsView} from "./view_tabgroups.js";
import {uiState} from "./state_base.js";


$(init)

async function init() {
    await settings.load();

    if (settings.show_mouse_controls()) {
        $(".mouse-control").show();
    }

    configureMouseControlsButton();

    document.addEventListener("keydown", e => uiState.onKeyDown(e));

    applyCustomStyles();

    await displayTabGroupsView(true);
}

function configureMouseControlsButton() {
    const enabled = !!settings.show_mouse_controls();

    $("#mouse-controls-button")
        .toggleClass("off", !enabled)
        .attr("title", enabled? "Hide mouse controls": "Show mouse controls")
        .on("click", async () => {
            await settings.load();
            await settings.show_mouse_controls(!enabled);
            location.reload();
        });
}

function applyCustomStyles() {
    if (settings.highlight_selection()) {
        const color = settings.selection_highlight_color() || "";
        const rule = `.active {background-color: ${color};}`;
        document.styleSheets[0].insertRule(rule, 0);
    }

    if (!settings.show_mouse_controls()) {
        const rule = `.tab-group-tab-count {min-width: unset !important;}`;
        document.styleSheets[0].insertRule(rule, 0);
    }
}