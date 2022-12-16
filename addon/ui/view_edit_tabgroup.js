import {uiState} from "./state_base.js";
import {tabGroupManagerProxy} from "../proxy.js";
import {displayTabGroupsView} from "./view_tabgroups.js";
import {CONTAINERS} from "./containers.js";
import {TRANSPARENT_COLOR} from "./themes.js";

const tabGroupManager = tabGroupManagerProxy;

let editedTabGroup;

$(init);

async function init() {
    $(".color-selector").on("click", e => {
        setTabGroupColor(e.target.id.at(-1));
    });

    $("#tab-group-container").on("input", onContainerInput)
}

export async function displayEditTabGroupView(uuid) {
    $(".view").hide();
    $("#create-tab-group-view").show();
    $("#tab-group-name").focus();

    if (uuid) {
        await loadTabGroup(uuid);
        uiState.setState(new EditTabGroupUIState());
    }
    else {
        $("#edit-tab-group-title-text").text("Create tab group")
        uiState.setState(new CreateTabGroupUIState());
    }
}

async function loadTabGroup(uuid) {
    editedTabGroup = await tabGroupManager.getTabGroup(uuid);

    if (editedTabGroup) {
        const tabGroupNameText = $("#tab-group-name");
        tabGroupNameText.val(editedTabGroup.name);

        if (editedTabGroup.color) {
            $("#tab-group-color-value").val(editedTabGroup.color);
            $("#tab-group-color-key").val(editedTabGroup.colorKey);
            tabGroupNameText.css("color", editedTabGroup.color);
        }
        else {
            $("#tab-group-color-value").val("");
            $("#tab-group-color-key").val("0");
            tabGroupNameText.css("color", "var(--default-color)");
        }

        if (editedTabGroup.container) {
            $("#tab-group-container").val(editedTabGroup.container.name);
        }
        else {
            $("#tab-group-container").val("");
        }
    }
}

async function createTabGroup() {
    const name = $("#tab-group-name").val().trim();
    const color = $("#tab-group-color-value").val().trim();
    const colorKey = $("#tab-group-color-key").val().trim();
    const container = $("#tab-group-container").val().trim().toLowerCase();
    const options = {name};

    if (name) {
        if (color)
            options.color = color;

        if (colorKey)
            options.colorKey = colorKey;

        if (container)
            options.container = await tabGroupManager.containerEntity(CONTAINERS[container]);

        const tabGroup = await tabGroupManager.createTabGroup(options);

        await tabGroupManager.switchToTabGroup(tabGroup.uuid);
        window.close();
    }
}

async function saveTabGroup() {
    const color = $("#tab-group-color-value").val().trim();
    const colorKey = $("#tab-group-color-key").val().trim();
    const name =  $("#tab-group-name").val().trim().trim();
    const container = $("#tab-group-container").val().trim().toLowerCase();

    if (name)
        editedTabGroup.name = name;

    if (color)
        editedTabGroup.color = color;
    else
        editedTabGroup.color = undefined;

    if (colorKey)
        editedTabGroup.colorKey = colorKey;
    else
        editedTabGroup.color = "0";

    if (container)
        editedTabGroup.container = await tabGroupManager.containerEntity(CONTAINERS[container]);
    else
        editedTabGroup.container = undefined;

    await tabGroupManager.modifyTabGroup(editedTabGroup);

    const windowTabGroup = await tabGroupManager.getWindowTabGroup()
    if (windowTabGroup.uuid === editedTabGroup.uuid)
        await tabGroupManager.onTabGroupChanged(editedTabGroup);

    return displayTabGroupsView();
}

function setTabGroupColor(key) {
    let color = "";

    if (/^[1-8]$/.test(key))
        color = $(`#tab-group-color-${key}`).css("background-color");
    else if (key === "0")
        color = "";
    else if (key === "9")
        color = TRANSPARENT_COLOR;

    $("#tab-group-color-key").val(key);
    $("#tab-group-color-value").val(color);
    $("#tab-group-name").css("color", !color || color === TRANSPARENT_COLOR
        ? "var(--default-color)"
        : color);
}

function onContainerInput(e) {
    const element = e.originalEvent.target;
    const container = element.value
        ? Object.keys(CONTAINERS).find(k => k.toLowerCase().startsWith(element.value.toLowerCase()))
        : undefined;
    const input = element.value;

    if (container && e.originalEvent.inputType === "insertText") {
        element.value = container;
        element.setSelectionRange(input.length, element.value.length, "forward");
    }
}

class EditingUIState {
    onKeyDown(e) {
        const key = e.key;

        if (e.ctrlKey && /^[0-9]$/.test(key)) {
            e.preventDefault();
            setTabGroupColor(key);
        }
    }
}

class CreateTabGroupUIState extends EditingUIState {
    onKeyDown(e) {
        super.onKeyDown(e);
        const key = e.key;

        if (key === "Enter") {
            e.preventDefault();
            createTabGroup();
        }
    }
}

class EditTabGroupUIState  extends EditingUIState {
    onKeyDown(e) {
        super.onKeyDown(e);
        const key = e.key;

        if (key === "Enter") {
            e.preventDefault();
            saveTabGroup();
        }
    }
}