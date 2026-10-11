import {settings} from "../settings.js";
import {send} from "../proxy.js";
import {isDarkTheme} from "../utils.js";

const $ = selector => document.querySelector(selector);
const radios = name => document.querySelectorAll(`input[name='${name}']`);

const SWITCHES = [
    "highlight_selection",
    "use_solid_mnemonic",
    "capitalize_default_tab_group",
    "sort_tab_groups_alphabetically",
    "show_mouse_controls"
];

const PREVIEW_GROUPS = [
    {name: "default", count: 12, color: "#9aa0a6", isDefault: true},
    {name: "Work", count: 8, color: "#37adff", active: true},
    {name: "Research", count: 14, color: "#ff9f00"},
    {name: "Reading", count: 5, color: "#00c79a"},
    {name: "Archive", count: 31, color: "#af51f5"}
];

const EDIT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>`;
const MOVE_TABS_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h14M13 6l6 6-6 6"/></svg>`;
const DELETE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>`;

init();

async function init() {
    await settings.load();

    $("#addon-version").textContent = `Version ${_ADDON_VERSION}`;

    loadOptions();
    configureOptions();
    applyPageTheme();
    updatePreviews();
}

function elementId(option) {
    return `#option-${option.replace(/_/g, "-")}`;
}

function setRadio(name, value) {
    radios(name).forEach(r => r.checked = r.value === value);
}

async function saveOption(option, value) {
    await settings.load();
    await settings[option](value);
}

function loadOptions() {
    setRadio("color-theme", settings.color_theme() || "auto");

    for (const option of SWITCHES)
        $(elementId(option)).checked = !!settings[option]();

    loadHighlightColor(settings.selection_highlight_color() || "");
}

function configureOptions() {
    radios("color-theme").forEach(r => r.addEventListener("change", onThemeChanged));

    for (const option of SWITCHES)
        $(elementId(option)).addEventListener("change", async e => {
            if (option === "highlight_selection" && e.target.checked && !settings.selection_highlight_color())
                await selectHighlightColor(radios("highlight-color")[0].value);

            updatePreviews();
            await saveOption(option, e.target.checked);
        });

    radios("highlight-color").forEach(r => r.addEventListener("change", e => selectHighlightColor(e.target.value)));

    const colorInput = $("#option-selection-highlight-color");
    colorInput.addEventListener("input", e => {
        loadHighlightColor(e.target.value);
        updatePreviews();
    });
    colorInput.addEventListener("change", e => selectHighlightColor(e.target.value));

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyPageTheme);
}

function loadHighlightColor(color) {
    const swatch = [...radios("highlight-color")].find(r => r.value === color);
    const isCustom = !!color && !swatch;

    setRadio("highlight-color", color);
    $("#custom-color").classList.toggle("selected", isCustom);
    $("#custom-color-label").textContent = isCustom? color.toUpperCase(): "Custom";

    if (swatch)
        $("#option-selection-highlight-color").value = swatch.dataset.hex;
    else if (/^#[0-9a-f]{6}$/i.test(color))
        $("#option-selection-highlight-color").value = color;
}

async function selectHighlightColor(color) {
    loadHighlightColor(color);
    updatePreviews();
    await saveOption("selection_highlight_color", color);
}

async function onThemeChanged(e) {
    const theme = e.target.value;

    localStorage.setItem("color_theme", theme);
    await saveOption("color_theme", theme);
    applyPageTheme();

    return send.refreshWindows();
}

function applyPageTheme() {
    const theme = settings.color_theme() || "auto";
    const dark = theme === "dark" || theme === "auto" && isDarkTheme();

    document.documentElement.dataset.theme = dark? "dark": "light";
}

function updatePreviews() {
    const highlight = $(elementId("highlight_selection")).checked;

    $("#highlight-colors").classList.toggle("disabled", !highlight);
    $("#mnemonic-preview").classList.toggle("solid", $(elementId("use_solid_mnemonic")).checked);

    renderPopupPreview(highlight);
}

function renderPopupPreview(highlight) {
    const capitalize = $(elementId("capitalize_default_tab_group")).checked;
    const sort = $(elementId("sort_tab_groups_alphabetically")).checked;
    const mouse = $(elementId("show_mouse_controls")).checked;
    const color = settings.selection_highlight_color() || "";

    let groups = PREVIEW_GROUPS;
    if (sort)
        groups = [groups[0], ...groups.slice(1).sort((a, b) => a.name.localeCompare(b.name))];

    const container = $("#popup-groups");
    container.replaceChildren(...groups.map((group, i) => {
        const row = document.createElement("div");
        row.className = "pg";
        row.classList.toggle("active", !!group.active);

        if (group.active && highlight)
            row.style.backgroundColor = color;

        const key = document.createElement("span");
        key.className = "pg-key";
        if (group.active && mouse)
            key.innerHTML = MOVE_TABS_ICON;
        else
            key.textContent = `${i + 1}.`;

        const dot = document.createElement("span");
        dot.className = "pg-dot";
        dot.style.backgroundColor = group.color;

        const name = document.createElement("span");
        name.className = "pg-name";
        name.textContent = group.isDefault && capitalize? "Default": group.name;

        const count = document.createElement("span");
        count.className = "pg-count";
        count.textContent = group.count;

        row.append(key, dot, name, count);

        if (group.active && mouse) {
            const tools = document.createElement("span");
            tools.className = "pg-tools";
            tools.innerHTML = EDIT_ICON + DELETE_ICON;
            row.append(tools);
        }

        return row;
    }));

    $(".popup").classList.toggle("no-mouse", !mouse);
}