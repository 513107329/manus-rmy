GET_VISIBLE_CONTENT_FUNC = """
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
"""

GET_INTERACTIVE_VISIBLE_CONTENT_FUNC = """
const getInteractiveVisibleContent = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const interactiveElements = [];
    let indexCounter = 1;

    const elements = document.querySelectorAll("body *");

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const rect = element.getBoundingClientRect();

        // 1. 过滤完全在视口外的元素
        if (
            rect.top < 0 ||
            rect.left < 0 ||
            rect.bottom > viewportHeight ||
            rect.right > viewportWidth
        ) {
            continue;
        }

        // 2. 过滤隐藏的元素
        const style = window.getComputedStyle(element);
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
        ) {
            continue;
        }

        // 3. 过滤非交互元素
        const tagName = element.tagName.toUpperCase();
        const interactiveTags = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];

        if (!interactiveTags.includes(tagName)) {
            continue;
        }

        // 4. 提取文本内容
        let text = element.textContent
            ? element.textContent.trim()
            : "";

        // 5. 提取属性（如 input 的 type, value, placeholder）
        let attributes = "";
        if (tagName === "INPUT") {
            attributes = ` type="${element.type}"`;
            if (element.value) {
                attributes += ` value="${element.value}"`;
            }
            if (element.placeholder) {
                attributes += ` placeholder="${element.placeholder}"`;
            }
        } else if (tagName === "A") {
            if (element.href) {
                attributes += ` href="${element.href}"`;
            }
        }

        // 6. 格式化输出
        interactiveElements.push({
            index: indexCounter++,
            tagName: tagName,
            text: text,
            attributes: attributes,
            outerHTML: `<${tagName}${attributes}>${text}</${tagName}>`
        });
    }

    return interactiveElements;
}
"""

INJECT_CONSOLE_FUNC = """
const injectConsole = () => {
    window.console.logs = []
    const originalConsoleLog = window.console.log;
    window.console.log = function(...args) {
        originalConsoleLog.apply(window.console, args);
        window.console.logs.push(args.join(" "));
    };
}
"""
