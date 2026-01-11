export function $(selector, context = document) {
    return context.querySelector(selector);
}

export function $$(selector, context = document) {
    return [...context.querySelectorAll(selector)];
}

export function createEl(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

export function css(el, styles) {
    if (!el) return;
    Object.assign(el.style, styles);
}

export function attr(el, name, value) {
    if (!el) return undefined;
    if (value === undefined) {
        return el.getAttribute(name);
    }
    el.setAttribute(name, value);
}

export function on(el, event, handler) {
    if (!el) return () => {};
    el.addEventListener(event, handler);
    return () => el.removeEventListener(event, handler);
}

export function html(el, content) {
    if (!el) return;
    el.innerHTML = content;
}

export function find(el, selector) {
    if (!el) return null;
    return el.querySelector(selector);
}

export function findAll(el, selector) {
    if (!el) return [];
    return [...el.querySelectorAll(selector)];
}

export function addClass(el, ...classes) {
    if (!el) return;
    el.classList.add(...classes);
}

export function removeClass(el, ...classes) {
    if (!el) return;
    el.classList.remove(...classes);
}

export function show(el, display = 'block') {
    if (!el) return;
    el.style.display = display;
}

export function hide(el) {
    if (!el) return;
    el.style.display = 'none';
}

export function fadeIn(el, duration = 250) {
    if (!el) return Promise.resolve();
    return new Promise(resolve => {
        el.style.opacity = '0';
        el.style.display = 'block';
        el.style.transition = `opacity ${duration}ms ease`;
        
        el.offsetHeight;
        
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transition = '';
            resolve();
        }, duration);
    });
}

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

export function trigger(el, eventName, detail = {}) {
    if (!el) return;
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    el.dispatchEvent(event);
}

export function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

export async function ajax(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
}

export function windowSize() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

export function setLoadMessage(msg) {
    var loadTextEl = document.getElementById('loadtext');
    if (loadTextEl) loadTextEl.innerHTML = msg + "&hellip;";
}

window.setLoadMessage = setLoadMessage;

export default { $, $$, createEl, css, attr, on, html, find, findAll, addClass, removeClass, show, hide, fadeIn, fadeOut, trigger, ready, ajax, windowSize, setLoadMessage };
