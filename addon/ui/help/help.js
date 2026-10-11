const colorTheme = localStorage.getItem("color_theme");

if (colorTheme === "dark"
        || (!colorTheme || colorTheme === "auto") && window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.dataset.theme = "dark";
