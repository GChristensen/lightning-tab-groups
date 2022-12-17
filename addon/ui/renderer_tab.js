import {DEFAULT_TAB_GROUP} from "../tabgroup_manager.js";
import {settings} from "../settings.js";
import {capitalize} from "../utils.js";
import {TRANSPARENT_COLOR} from "./themes.js";

export class TabRenderer {
    #tabGroups;
    #tabs;

    searchResults = true;

    constructor(tabGroups, tabs) {
        this.#tabGroups = tabGroups;
        this.#tabs = tabs;
    }

    renderTabs(containerElement) {
        let tabCounter = 0;
        let html = "";

        for (const tabGroup of this.#tabGroups) {
            const tabs = this.#getTabGroupTabs(tabGroup.uuid);

            if (tabs?.length) {
                for (const tab of tabs) {
                    const tabRowHTML = this.#renderTabRow(tabCounter++, tab);

                    html += tabRowHTML;
                }

                if (this.searchResults) {
                    const tabGroupRowHTML = this.#renderTabGroupRow(tabGroup);

                    html += tabGroupRowHTML;
                }
            }
        }

        containerElement.html(html);
    }

    #renderTabGroupRow(tabGroup) {
        let tabGroupName = tabGroup.name;
        const color = tabGroup.color && tabGroup.color !== TRANSPARENT_COLOR
            ? `color: ${tabGroup.color};`
            : "";
        const borderColor = tabGroup.color && tabGroup.color !== TRANSPARENT_COLOR
            ? `border-color: ${tabGroup.color};`
            : "";

        if (tabGroup.uuid === DEFAULT_TAB_GROUP && settings.capitalize_default_tab_group())
            tabGroupName = capitalize(tabGroupName);

        return `<div class="divider-tab-group">
                    <hr class="tab-group-divider" style="${borderColor}">
                    <span class="divider-tab-group-name" style="${color}">&nbsp;${tabGroupName}</span>
                </div>`;
    }

    #renderTabRow(rowIndex, {tab, tabGroup}) {
        const displayNumber = rowIndex + 1;
        const key = displayNumber < 36 ? displayNumber.toString(36) : "-";
        const favIconURL = tab.favIconUrl || "/ui/icons/globe.svg";
        const title = tab.title.replace("\"", "&#34;")

        return `<div class="tab-line" data-uuid="${tabGroup}" data-tab-id="${tab.id}">
                  <div class="tab-key" accesskey="${key}">${key}.</div>
                  <div class="tab-icon"><img class="tab-icon" src="${favIconURL}"></div>
                  <div class="tab-link"><a href="${tab.url}" title="${title}" target="_blank">${tab.title}</a></div>                        
                </div>`;
    }

    #getTabGroupTabs(uuid) {
        if (this.#tabs)
            return this.#tabs.filter(t => t.tabGroup === uuid);
    }
}