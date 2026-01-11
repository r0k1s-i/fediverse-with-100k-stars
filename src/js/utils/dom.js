/**
 * DOM Utility Functions - jQuery Replacement
 * Native DOM API wrappers for cleaner code
 */

/**
 * Query single element (querySelector wrapper)
 * @param {string} selector - CSS selector
 * @param {Element} context - Optional parent element
 * @returns {Element|null}
 */
export function $(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * Query all elements (querySelectorAll wrapper)
 * @param {string} selector - CSS selector
 * @param {Element} context - Optional parent element
 * @returns {Element[]}
 */
export function $$(selector, context = document) {
    return [...context.querySelectorAll(selector)];
}

/**
 * Create element from HTML string
 * @param {string} html - HTML string
 * @returns {Element}
 */
export function createEl(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * Set CSS styles on element
 * @param {Element} el - Target element
 * @param {Object} styles - Styles object
 */
export function css(el, styles) {
    if (!el) return;
    Object.assign(el.style, styles);
}

/**
 * Get/set element attribute
 * @param {Element} el - Target element
 * @param {string} name - Attribute name
 * @param {string} [value] - Optional value to set
 * @returns {string|undefined}
 */
export function attr(el, name, value) {
    if (!el) return undefined;
    if (value === undefined) {
        return el.getAttribute(name);
    }
    el.setAttribute(name, value);
}

/**
 * Add event listener with optional cleanup
 * @param {Element} el - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @returns {Function} - Cleanup function
 */
export function on(el, event, handler) {
    if (!el) return () => {};
    el.addEventListener(event, handler);
    return () => el.removeEventListener(event, handler);
}

/**
 * Set inner HTML
 * @param {Element} el - Target element
 * @param {string} html - HTML content
 */
export function html(el, content) {
    if (!el) return;
    el.innerHTML = content;
}

/**
 * Find element within parent
 * @param {Element} el - Parent element
 * @param {string} selector - CSS selector
 * @returns {Element|null}
 */
export function find(el, selector) {
    if (!el) return null;
    return el.querySelector(selector);
}

/**
 * Find all elements within parent
 * @param {Element} el - Parent element
 * @param {string} selector - CSS selector
 * @returns {Element[]}
 */
export function findAll(el, selector) {
    if (!el) return [];
    return [...el.querySelectorAll(selector)];
}

/**
 * Add class(es) to element
 * @param {Element} el - Target element
 * @param {...string} classes - Class names
 */
export function addClass(el, ...classes) {
    if (!el) return;
    el.classList.add(...classes);
}

/**
 * Remove class(es) from element
 * @param {Element} el - Target element
 * @param {...string} classes - Class names
 */
export function removeClass(el, ...classes) {
    if (!el) return;
    el.classList.remove(...classes);
}

/**
 * Show element (set display)
 * @param {Element} el - Target element
 * @param {string} display - Display value (default: 'block')
 */
export function show(el, display = 'block') {
    if (!el) return;
    el.style.display = display;
}

/**
 * Hide element
 * @param {Element} el - Target element
 */
export function hide(el) {
    if (!el) return;
    el.style.display = 'none';
}

/**
 * Fade in element
 * @param {Element} el - Target element
 * @param {number} duration - Duration in ms
 * @returns {Promise}
 */
export function fadeIn(el, duration = 250) {
    if (!el) return Promise.resolve();
    return new Promise(resolve => {
        el.style.opacity = '0';
        el.style.display = 'block';
        el.style.transition = `opacity ${duration}ms ease`;
        
        // Force reflow
        el.offsetHeight;
        
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transition = '';
            resolve();
        }, duration);
    });
}

/**
 * Fade out element
 * @param {Element} el - Target element
 * @param {number} duration - Duration in ms
 * @returns {Promise}
 */
export function fadeOut(el, duration = 250) {
    if (!el) return Promise.resolve();
    return new Promise(resolve => {
        el.style.transition = `opacity ${duration}ms ease`;
        el.style.opacity = '0';
        setTimeout(() => {
            el.style.display = 'none';
            el.style.transition = '';
            resolve();
        }, duration);
    });
}

/**
 * Trigger custom event
 * @param {Element|Window} el - Target element or window
 * @param {string} eventName - Event name
 * @param {Object} detail - Optional event detail
 */
export function trigger(el, eventName, detail = {}) {
    if (!el) return;
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    el.dispatchEvent(event);
}

/**
 * DOM ready callback (like $(document).ready())
 * @param {Function} fn - Callback function
 */
export function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

/**
 * Fetch helper with error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function ajax(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
}

/**
 * Get window dimensions
 * @returns {{ width: number, height: number }}
 */
export function windowSize() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

// Export $ and $$ as default for common usage
export default { $, $$, createEl, css, attr, on, html, find, findAll, addClass, removeClass, show, hide, fadeIn, fadeOut, trigger, ready, ajax, windowSize };
