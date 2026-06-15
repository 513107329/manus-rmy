/** Browser page evaluation scripts (ported from api/app/infrastructure/external/browser/playwrightBrowserFunc.py) */

export const GET_VISIBLE_CONTENT_FUNC = `() => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const visibilityContent = [];
  const elements = document.querySelectorAll('body *');
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const rect = element.getBoundingClientRect();
    if (
      rect.top < 0 ||
      rect.left < 0 ||
      (rect.bottom > viewportHeight && rect.right > viewportWidth)
    ) {
      continue;
    }
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      continue;
    }
    if (
      element.textContent ||
      element.tagName === 'IMG' ||
      element.tagName === 'INPUT' ||
      element.tagName === 'BUTTON'
    ) {
      visibilityContent.push(element.outerHTML);
    }
  }
  return '<div>' + visibilityContent.join(' ') + '</div>';
}`;

export const GET_INTERACTIVE_VISIBLE_CONTENT_FUNC = `() => {
  document.querySelectorAll('[data-manus-id]').forEach((el) => el.removeAttribute('data-manus-id'));
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const interactiveElements = [];
  let indexCounter = 1;
  const elements = document.querySelectorAll('body *');
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const rect = element.getBoundingClientRect();
    if (
      rect.top < 0 ||
      rect.left < 0 ||
      rect.bottom > viewportHeight ||
      rect.right > viewportWidth
    ) {
      continue;
    }
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      continue;
    }
    const tagName = element.tagName.toUpperCase();
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (!interactiveTags.includes(tagName)) {
      continue;
    }
    const manusId = 'manus-element-' + indexCounter;
    element.setAttribute('data-manus-id', manusId);
    let text = element.textContent ? element.textContent.trim() : '';
    let attributes = '';
    if (tagName === 'INPUT') {
      attributes = ' type="' + element.type + '"';
      if (element.value) attributes += ' value="' + element.value + '"';
      if (element.placeholder) attributes += ' placeholder="' + element.placeholder + '"';
    } else if (tagName === 'A' && element.href) {
      attributes = ' href="' + element.href + '"';
    }
    interactiveElements.push({
      index: indexCounter,
      tagName,
      text,
      attributes,
      outerHTML: '<' + tagName + attributes + '>' + text + '</' + tagName + '>',
    });
    indexCounter++;
  }
  return interactiveElements;
}`;

export const INJECT_CONSOLE_FUNC = `() => {
  window.console.logs = [];
  const originalConsoleLog = window.console.log;
  window.console.log = function(...args) {
    originalConsoleLog.apply(window.console, args);
    window.console.logs.push(args.join(' '));
  };
}`;

export const GET_CONSOLE_LOGS_FUNC = `(maxLines) => {
  const logs = window.console.logs || [];
  if (maxLines != null) return logs.slice(-maxLines);
  return logs;
}`;

export const IS_ELEMENT_VISIBLE_FUNC = `(element) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return !(
    rect.width === 0 ||
    rect.height === 0 ||
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  );
}`;

export const SCROLL_ELEMENT_INTO_VIEW_FUNC = `(element) => {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}`;
