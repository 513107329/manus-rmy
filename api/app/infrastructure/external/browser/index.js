const getVisibleContent = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const visibilityContent = []

    const elements = document.querySelectorAll("body *")

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i]
        const rect = element.getBoundingClientRect();
        if (
            rect.top < 0 ||
            rect.left < 0 ||
            rect.bottom > viewportHeight &&
            rect.right > viewportWidth
        ) {
            continue
        }

        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            continue
        }

        if (element.textContent || element.tagName === 'IMG' || element.tagName === "INPUT" || element.tagName === "BUTTON") {
            visibilityContent.push(element.outerHTML)
        }
    }

    return `<div>${visibilityContent.join(" ")}</div>`
}