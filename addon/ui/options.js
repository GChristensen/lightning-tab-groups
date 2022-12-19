import {settings} from "../settings.js";
import {send} from "../proxy.js";

$(init);

async function init() {
    await settings.load();

    loadOptions();
    configureOptions();
}

function loadCheck(option, defaultValue) {
    const elementId = `#option-${option.replace(/_/g, "-")}`;

    $(elementId).prop("checked", settings[option]() || defaultValue);
}

function loadInput(option, defaultValue = "") {
    const elementId = `#option-${option.replace(/_/g, "-")}`;

    $(elementId).val(settings[option]() || defaultValue);
}

function setSaveCheckHandler(option, callback) {
    const elementId = `#option-${option.replace(/_/g, "-")}`;

    $(elementId).on("click", async e => {
        await settings.load();
        await settings[option](e.target.checked);
        if (callback)
            return callback(e);
    });
}

function setSaveInputHandler(option) {
    const elementId = `#option-${option.replace(/_/g, "-")}`;

    let inputTimeout;
    $(elementId).on("input", e => {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(async () => {
            await settings.load();
            await settings[option](e.target.value);
        }, 1000)
    });
}

function setSaveInputChangeHandler(option) {
    const elementId = `#option-${option.replace(/_/g, "-")}`;

    $(elementId).on("change", async e => {
        await settings.load();
        await settings[option](e.target.value);
    });
}

function setSaveSelectHandler(option, callback) {
    const elementId = `#option-${option.replace(/_/g, "-")}`;

    $(elementId).on("change", async e => {
        await settings.load();
        await settings[option](e.target.value);

        if (callback)
            callback(e.target.value)
    });
}

function loadOptions() {
    loadInput("color_theme", "auto");
    //loadInput("default_mnemonic_color");
    //loadInput("default_mnemonic_text_color");
    loadCheck("highlight_selection");
    loadInput("selection_highlight_color");
    loadCheck("use_solid_mnemonic");
    loadCheck("capitalize_default_tab_group");
    loadCheck("sort_tab_groups_alphabetically");
    loadCheck("show_overlay_tab_group_buttons");
}

function configureOptions() {
    setSaveSelectHandler("color_theme", onThemeChanged);
    //setSaveInputChangeHandler("default_mnemonic_color");
    //setSaveInputChangeHandler("default_mnemonic_text_color");
    setSaveCheckHandler("highlight_selection");
    setSaveInputChangeHandler("selection_highlight_color");
    setSaveCheckHandler("use_solid_mnemonic");
    setSaveCheckHandler("capitalize_default_tab_group");
    setSaveCheckHandler("sort_tab_groups_alphabetically");
    setSaveCheckHandler("show_overlay_tab_group_buttons");

    $('#option-selection-highlight-color').spectrum({
        type: "component",
        showPalette: false
    });

    $('#option-default-mnemonic-color').spectrum({
        type: "component",
        showPalette: false
    });

    $('#option-default-mnemonic-text-color').spectrum({
        type: "component",
        showPalette: false
    });
}

function onThemeChanged(theme) {
    localStorage.setItem("color_theme", theme);

    return send.refreshWindows();
}
