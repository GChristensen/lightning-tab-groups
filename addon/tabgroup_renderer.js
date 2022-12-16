import {DEFAULT_TAB_GROUP} from "./tabgroup_manager.js";
import {capitalize} from "./utils.js";
import {settings} from "./settings.js";
import {TRANSPARENT_COLOR} from "./ui/themes.js";

export class TabGroupRenderer {
    #tabGroups;
    #containers;
    #showContainerIcon;
    #flatCount;

    constructor(tabGroups, containers) {
        this.#tabGroups = tabGroups;
        this.#containers = containers;
        this.#showContainerIcon = tabGroups.some(tg => !!tg.container);
        this.#flatCount = tabGroups.every(tg => tg.allTabsCount === tg.windowTabsCount);
    }

    renderTabGroups(containerElement) {
        let ctr = 0;
        for (const tabGroup of this.#tabGroups) {
            const tabGroupHTML = this.#renderTabGroupRow(ctr++);
            containerElement.append(tabGroupHTML);
        }
    }

    #renderTabGroupRow(rowIndex) {
        const tabGroup = this.#tabGroups[rowIndex];
        const displayNumber = rowIndex + 1;
        let icon = "";

        if (this.#showContainerIcon) {
            if (tabGroup.container) {
                const iconDiv = this.#renderTabGroupContainerIcon(tabGroup);

                if (iconDiv) {
                    iconDiv.css("display", "inline-block");
                    iconDiv.css("width", "16px");
                    iconDiv.css("height", "16px");
                    icon = iconDiv[0].outerHTML.replace(/&quot;/ig, "'");
                }
            }

            if (!icon)
                icon = `<span style="width: 16px; display: inline-block;">&nbsp;</span>`;
        }


        let tabGroupName = tabGroup.name;
        const tabCount = this.#flatCount
            ? tabGroup.allTabsCount
            : `${tabGroup.allTabsCount}/${tabGroup.windowTabsCount}`;
        const active = tabGroup.active? "active initially-active": "";
        const key = displayNumber < 36 ? displayNumber.toString(36) : "-";
        const color = tabGroup.color && tabGroup.color !== TRANSPARENT_COLOR
            ? `color: ${tabGroup.color};`
            : "";

        if (tabGroup.uuid === DEFAULT_TAB_GROUP && settings.capitalize_default_tab_group())
            tabGroupName = capitalize(tabGroupName);

        return `<tr class="tab-group-line ${active}">
                    <td class="tab-group-key" accesskey="${key}">${key}.</td>
                    <td class="tab-group-icon">${icon}</td>
                    <td data-uuid="${tabGroup.uuid}" class="tab-group-name" style="${color}">${tabGroupName}</td>
                    <td class="tab-group-tab-count"><img class="small-tab-icon invert-filter" src="/ui/icons/tab-small.svg">${tabCount}</td>
                </tr>`;
    }

    #renderTabGroupContainerIcon(tabGroup) {
        let container;
        let iconUrl = "resource://usercontext-content/circle.svg";
        let iconColor = "gray";
        let iconStyle = "";

        container = Object.values(this.#containers).find(c => c.cookieStoreId === tabGroup.container.cookieStoreId);

        if (container) {
            iconUrl = container.iconUrl;
            iconColor = container.colorCode;
            iconStyle = `mask-image: url('${iconUrl}'); mask-size: 16px 16px; `
                + `mask-repeat: no-repeat; mask-position: center; background-color: ${iconColor};`

            return $(`<div class="tab-group-row-container-icon" style="${iconStyle}"></div>`);
        }
    }
}