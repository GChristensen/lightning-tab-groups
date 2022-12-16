import {settings} from "../settings.js";
import {DEFAULT_TAB_GROUP} from "../tabgroup_manager.js";
import {capitalize} from "../utils.js";
import {DEFAULT_THEME, THEMES, TRANSPARENT_COLOR_KEY} from "./themes.js";

const action = _MANIFEST_V3
    ? browser.action
    : browser.browserAction;

const ACTION_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   width="16"
   height="16"
   version="1.1"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  <g>
    <circle
       style="fill:$FILL_COLOR$;fill-opacity:1;stroke-opacity:1;$STROKE_OPTIONS$"
       cx="8"
       cy="8"
       r="$RADIUS$" />
    <text
       xml:space="preserve"
       style="font-weight:bold;font-size:8pt;font-family:Segoe UI,Tahoma,Arial,sans-serif;fill:$TEXT_COLOR$"
       transform="translate(0 1)"
       x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">$LETTER$</text>
  </g>
</svg>`;

export async function displayMnemonic(tabGroup, windowId) {
    const theme = settings.color_theme() || DEFAULT_THEME;
    const emoji = tabGroup.name.match(/^[\p{Emoji}\u200d]+/gu)?.[0];
    const letter = tabGroup.uuid === DEFAULT_TAB_GROUP
        ? "&#x1F5F2;"
        : emoji || tabGroup.name[0]?.toUpperCase();
    const title = tabGroup.uuid === DEFAULT_TAB_GROUP
        ? (settings.capitalize_default_tab_group()? capitalize(tabGroup.name): tabGroup.name)
        : tabGroup.name;
    let fillColor =
        (tabGroup.colorKey === TRANSPARENT_COLOR_KEY? "transparent": tabGroup.color)
            || settings.default_mnemonic_color() || THEMES[theme].foregroundColor;
    let strokeOptions = "";
    let textColor = "";
    let radius = "8";

    if (settings.use_solid_mnemonic()) {
        fillColor = (tabGroup.colorKey === TRANSPARENT_COLOR_KEY? "transparent": tabGroup.color)
            || settings.default_mnemonic_color() || THEMES[theme].foregroundColor;
        textColor = settings.default_mnemonic_text_color() || "white";//THEMES[theme].backgroundColor;

        if (!tabGroup.color || tabGroup.colorKey === TRANSPARENT_COLOR_KEY)
            textColor = THEMES[theme].backgroundColor;
        else if (tabGroup.colorKey === "4")
            textColor = "#823535";
        else if (tabGroup.colorKey === "5")
            textColor = "#692B2B";
    }
    else {
        textColor = tabGroup.color || settings.default_mnemonic_text_color() || THEMES[theme].foregroundColor;
        strokeOptions = "stroke-width:0.8pt;stroke:" + fillColor;
        fillColor = "transparent";
        radius = "calc(8px - 0.8pt)"
    }

    const svg = ACTION_SVG
        .replace("$FILL_COLOR$", fillColor)
        .replace("$TEXT_COLOR$", textColor)
        .replace("$STROKE_OPTIONS$", strokeOptions)
        .replace("$RADIUS$", radius)
        .replace("$LETTER$", letter);
    const svgURL = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    windowId = windowId || (await browser.windows.getCurrent()).id;

    action.setTitle({title: title, windowId});
    action.setIcon({path: svgURL, windowId});
}

