import {DEFAULT_TAB_GROUP} from "./tabgroup_manager.js";
import {settings} from "./settings.js";
import {capitalize} from "./utils.js";
import {TRANSPARENT_COLOR} from "./ui/themes.js";

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

        for (const tabGroup of this.#tabGroups) {
            const tabs = this.#getTabGroupTabs(tabGroup.uuid);

            if (tabs?.length) {
                for (const tab of tabs) {
                    const tabRowHTML = this.#renderTabRow(tabCounter++, tab);
                    containerElement.append(tabRowHTML);
                }

                if (this.searchResults) {
                    const tabGroupRowHTML = this.#renderTabGroupRow(tabGroup);

                    containerElement.append(tabGroupRowHTML);
                }
            }
        }
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

        return `<tr class="divider-tab-group-line">
                    <td class="divider-tab-group" colspan="3">
                        <div>
                            <hr class="tab-group-divider" style="${borderColor}">
                            <span class="tab-group-name" style="${color}">&nbsp;${tabGroupName}</span>
                        </div>
                    </td>
                </tr>`;
    }

    #renderTabRow(rowIndex, {tab, tabGroup}) {
        const displayNumber = rowIndex + 1;
        const key = displayNumber < 36 ? displayNumber.toString(36) : "-";
        const favIconURL = tab.favIconUrl || "/ui/icons/globe.svg";

        return `<tr class="tab-line">
                  <td class="tab-key" accesskey="${key}">${key}.</td>
                  <td class="tab-icon"><img class="tab-icon" src="${favIconURL}"></td>
                  <td class="tab-link" data-uuid="${tabGroup}" data-tab-id="${tab.id}"><a href="${tab.url}" target="_blank">${tab.title}</a></td>                        
                </tr>`;
    }

    #getTabGroupTabs(uuid) {
        if (this.#tabs)
            return this.#tabs.filter(t => t.tabGroup === uuid);
    }
}