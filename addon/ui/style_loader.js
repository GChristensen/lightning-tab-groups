function loadCSSFile(id, file) {
    let head = document.getElementsByTagName("head")[0];
    let link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = file;
    link.media = "all";
    head.appendChild(link);
}

function setDarkUITheme() {
    loadCSSFile("dark-theme", "dark_theme.css");
}

function removeDarkUITheme() {
    $("#dark-theme").remove();
}

const colorTheme = localStorage.getItem("color_theme");

if (colorTheme === "dark"
        || (!colorTheme || colorTheme === "auto") && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkUITheme()

