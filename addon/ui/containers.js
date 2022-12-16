export const CONTAINERS = {};

try {
    const containers = await browser.contextualIdentities.query({});
    containers.forEach(c => CONTAINERS[c.name.toLowerCase()] = c);
} catch (e) {
    console.error(e);
}