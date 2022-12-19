import {DEFAULT_TAB_GROUP} from "../tabgroup_manager.js";
import {capitalize, sleep} from "../utils.js";
import {settings} from "../settings.js";
import {TRANSPARENT_COLOR} from "./themes.js";

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

    async renderTabGroups(containerElement) {
        let ctr = 0;
        let html = ""
        for (const tabGroup of this.#tabGroups)
            html += this.#renderTabGroupRow(ctr++);

        containerElement.html(html);

        containerElement.waitForImages(() => {
            //await sleep(100);
            const rowCountItems = containerElement.find(".tab-group-tab-count");
            const maxWidth = Math.max(...rowCountItems.map(function() {return $(this).width()}).toArray());
            rowCountItems.css("width", `${maxWidth}px`);
        });
    }

    #renderTabGroupRow(rowIndex) {
        const tabGroup = this.#tabGroups[rowIndex];
        const displayNumber = rowIndex + 1;
        const icon = this.#renderTabGroupIcon(tabGroup);
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

        return `<div class="tab-group-line ${active}" data-uuid="${tabGroup.uuid}">
                    <div class="tab-group-key" accesskey="${key}">${key}.</div>
                    ${icon}
                    <div class="tab-group-name" style="${color}">${tabGroupName}</div>
                    <div class="tab-group-tab-count">
                        <div class="tab-count"><img class="small-tab-icon invert-filter" src="/ui/icons/tab-small.svg">${tabCount}</div>
                        <div class="tab-group-buttons">
                            <img class="button-edit-tab-group action-button" src="/ui/icons/edit.svg" title="Edit"><!--
                            --><img class="button-delete-tab-group action-button" src="/ui/icons/delete.svg" title="Delete">
                        </div>
                    </div>
                </div>`;
    }

    #renderTabGroupIcon(tabGroup) {
        let result = "";

        if (this.#showContainerIcon) {
            let icon = "";

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

            result = `<div class="tab-group-icon">${icon}</div>`;
        }

        return result;
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

            return $(`<div class="tab-group-container-icon" style="${iconStyle}"></div>`);
        }
    }
}