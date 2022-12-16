import {isDarkTheme} from "../utils.js";

export const DEFAULT_THEME = "auto";
export const TRANSPARENT_COLOR = "__TRANSPARENT__";
export const TRANSPARENT_COLOR_KEY = "9";

export const THEMES = {
    "light": {
        foregroundColor: "black",
        backgroundColor: "white"
    },
    "dark": {
        foregroundColor: "#FBFBEA",
        backgroundColor: "#1C1B22"
    },
    "auto": {
        get foregroundColor() { return isDarkTheme()? THEMES["dark"].foregroundColor: THEMES["light"].foregroundColor },
        get backgroundColor() { return isDarkTheme()? THEMES["dark"].backgroundColor: THEMES["light"].backgroundColor }
    }
};

export const COLOR_MNEMONICS = [
    "",
    "#37ADFF",
    "#00C79A",
    "#51CD00",
    "#FFCB00",
    "#FF9F00",
    "#FF623D",
    "#FF4BDA",
    "#AF51F5",
    TRANSPARENT_COLOR
];