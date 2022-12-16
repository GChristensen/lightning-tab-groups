export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,  ms))
}

export function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function camelCaseToSnakeCase(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2').toUpperCase();
}

export function snakeCaseToCamelCase(str) {
    return str.toLowerCase()
        .replace(/(_)([a-z])/g, (_match, _p1, p2) => p2.toUpperCase())
}

export function merge(to, from) {
    for (const [k, v] of Object.entries(from)) {
        if (!to.hasOwnProperty(k))
            to[k] = v;
    }
    return to;
}

export function localeCompare(prop, desc, caseSensitive) {
    const options = {sensitivity: "base"};

    if (caseSensitive)
        options.sensitivity = "case";

    if (prop && !desc)
        return (a, b) => a[prop].localeCompare(b[prop], undefined, options);
    else if (prop && desc)
        return (a, b) => b[prop].localeCompare(a[prop], undefined, options);
    else if (!prop && desc)
        return (a, b) => b.localeCompare(a, undefined, options);
    else if (!prop && !desc)
        return (a, b) => a.localeCompare(b, undefined, options);
}

export function isDarkTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}