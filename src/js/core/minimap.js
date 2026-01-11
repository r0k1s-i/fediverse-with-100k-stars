import { map, constrain } from '../utils/math.js';
import { $, css, addClass, fadeIn, fadeOut, find, html, on, ajax } from '../utils/dom.js';

var border_width = 1;
var padding = 30;

var ready = false;
var count = 0;
var timer = null;
var dragged = false;

var soundOnEl, soundOffEl, heatvisionEl, tourEl, homeEl;

var domElement = $('#minimap');
var minimapEl = find(domElement, '#zoom-levels');
var volumeEl = find(domElement, '#volume');
var aboutEl = find(domElement, '#about');
var cursorEl = find(domElement, '#zoom-cursor');

var POWER = 3;
var position = 0;
var curve = function(t) {
  return Math.pow(t, 1 / POWER);
};
var curve_inverse = function(t) {
  return Math.pow(t, POWER);
};

function clickEvent(e) {
  var id = e.target.id || '';

  if (dragged || (id !== 'css-world' && id !== 'css-camera' && id !== 'glContainer')) {
    dragged = false;
    return;
  }

  unfocus();
}

function touchEvent(e) {
  var id = e.target.id || '';

  if (dragged || (id !== 'css-world' && id !== 'css-camera' && id !== 'glContainer')) {
    dragged = false;
    return;
  }

  unfocus();
}

window.addEventListener('click', clickEvent);

window.addEventListener('resize', function() {
  var firstTime = window.firstTime;
  if (!ready) {
    if (timer) {
      updateCount();
      clearTimeout(timer);
    }
    timer = setTimeout(function() {
      if (firstTime == false)
        window.dispatchEvent(new Event('resize'));
    }, 500);

    return;
  }

  var volumeHeight = volumeEl ? volumeEl.offsetHeight : 0;
  var aboutHeight = aboutEl ? aboutEl.offsetHeight : 0;
  var offset = volumeHeight + aboutHeight + padding;
  var h = domElement ? domElement.offsetHeight - offset : 0;

  if (minimapEl) {
    minimapEl.style.height = (h - border_width * 2) + 'px';
  }

  if (domElement && !domElement.classList.contains('ready')) {
    addClass(domElement, 'ready');
  }
});

window.addEventListener('mouseup', onWindowMouseUp);
window.addEventListener('touchend', onWindowMouseUp);
window.dispatchEvent(new Event('resize'));

export function initializeMinimap() {
  this.updateMinimap();
}

export function updateMinimap() {
  var camera = window.camera;

  if (!camera) {
    return;
  }

  var normal = cmap(camera.position.target.z, 1.1, 40000, 0, 1);
  position = cmap(curve(normal), 0, 1, 0, 100);
  updateCursorPosition(true);
}

export function setScrollPositionFromTouch(touch) {
  var minimapRect = minimapEl ? minimapEl.getBoundingClientRect() : { top: 0, height: 1 };
  var y = touch.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);
  updateCursorPosition();
}

export function setMinimap(b) {
  dragged = !!b;
}

export function showSunButton() {
  if (homeEl) {
    css(homeEl, { opacity: '1.0', display: 'inline' });
  }
}

export function hideSunButton() {
  if (homeEl) {
    fadeOut(homeEl);
  }
}

if (minimapEl) {
  minimapEl.addEventListener('mousedown', onElementMouseDown);
  minimapEl.addEventListener('touchstart', onElementTouchStart);
}

if (aboutEl) {
  aboutEl.addEventListener('click', function(e) {
    var detailContainerEl = window.detailContainerEl || $('#detailContainer');

    var line_height = 20;
    e.preventDefault();

    if (detailContainerEl) {
      addClass(detailContainerEl, 'about');
    }

    css($('#css-container'), { display: 'none' });

    fetch('detail/about.html')
      .then(function(response) { return response.text(); })
      .then(function(data) {
        html($('#detailBody'), data);
      });

    var titleSpan = find($('#detailTitle'), 'span');
    if (titleSpan) html(titleSpan, '100,000 Stars');

    if (detailContainerEl) {
      css(detailContainerEl, { paddingTop: line_height * 3 + 'px' });
      fadeIn(detailContainerEl);
    }
  });
}

var muted = localStorage.getItem('sound') === '0';

fetch('src/assets/icons/sound-on.svg')
  .then(function(response) { return response.text(); })
  .then(function(resp) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(resp, 'image/svg+xml');
    soundOnEl = doc.querySelector('svg');
    if (soundOnEl) {
      addClass(soundOnEl, 'icon');
      css(soundOnEl, { display: muted ? 'none' : 'block' });
      soundOnEl.addEventListener('click', function(e) {
        e.preventDefault();
        css(soundOnEl, { display: 'none' });
        var muteSound = window.muteSound;
        if (muteSound) muteSound();
        if (soundOffEl) {
          css(soundOffEl, { display: 'inline-block' });
        }
      });
      if (volumeEl) volumeEl.appendChild(soundOnEl);
      updateCount();
    }
  });

fetch('src/assets/icons/sound-off.svg')
  .then(function(response) { return response.text(); })
  .then(function(resp) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(resp, 'image/svg+xml');
    soundOffEl = doc.querySelector('svg');
    if (soundOffEl) {
      addClass(soundOffEl, 'icon');
      css(soundOffEl, { display: !muted ? 'none' : 'block' });
      soundOffEl.addEventListener('click', function(e) {
        e.preventDefault();
        css(soundOffEl, { display: 'none' });
        var unmuteSound = window.unmuteSound;
        if (unmuteSound) unmuteSound();
        if (soundOnEl) {
          css(soundOnEl, { display: 'inline-block' });
        }
      });
      if (volumeEl) volumeEl.appendChild(soundOffEl);
      updateCount();
    }
  });

fetch('src/assets/icons/big-tour.svg')
  .then(function(response) { return response.text(); })
  .then(function(resp) {
    var iconNavEl = window.iconNavEl || $('#icon-nav');
    var tour = window.tour;

    var parser = new DOMParser();
    var doc = parser.parseFromString(resp, 'image/svg+xml');
    tourEl = doc.querySelector('svg');
    if (tourEl) {
      addClass(tourEl, 'icon');
      tourEl.id = 'tour-button';
      tourEl.setAttribute('data-tip', 'Take a tour.');
      tourEl.addEventListener('click', function(e) {
        e.preventDefault();
        if (tour) tour.start();
      });
      if (iconNavEl) iconNavEl.appendChild(tourEl);

      loadHeatVisionIcon();
    }
    updateCount();
  });

function loadHeatVisionIcon() {
  fetch('src/assets/icons/heat-vision.svg')
    .then(function(response) { return response.text(); })
    .then(function(resp) {
      var iconNavEl = window.iconNavEl || $('#icon-nav');
      var toggleHeatVision = window.toggleHeatVision;

      var parser = new DOMParser();
      var doc = parser.parseFromString(resp, 'image/svg+xml');
      heatvisionEl = doc.querySelector('svg');
      if (heatvisionEl) {
        addClass(heatvisionEl, 'icon');
        heatvisionEl.setAttribute('data-tip', 'Toggle Spectral Index.');
        heatvisionEl.addEventListener('click', function(e) {
          e.preventDefault();
          if (toggleHeatVision) toggleHeatVision();
        });
        heatvisionEl.addEventListener('mouseenter', function(e) {
          if (tourEl) tourEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        });
        heatvisionEl.addEventListener('mouseleave', function(e) {
          if (tourEl) tourEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        });
        if (iconNavEl) iconNavEl.appendChild(heatvisionEl);

        loadHomeIcon();
      }
    });
}

function loadHomeIcon() {
  fetch('src/assets/icons/center-sun.svg')
    .then(function(response) { return response.text(); })
    .then(function(resp) {
      var iconNavEl = window.iconNavEl || $('#icon-nav');

      var parser = new DOMParser();
      var doc = parser.parseFromString(resp, 'image/svg+xml');
      homeEl = doc.querySelector('svg');
      if (homeEl) {
        addClass(homeEl, 'icon');
        homeEl.setAttribute('data-tip', 'Center camera position to the Sun.');
        homeEl.addEventListener('mouseenter', function(e) {
          if (tourEl) tourEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        });
        homeEl.addEventListener('mouseleave', function(e) {
          if (tourEl) tourEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        });
        homeEl.addEventListener('click', function(e) {
          e.preventDefault();
          unfocus(true);
        });
        css(homeEl, { display: 'none' });
        if (iconNavEl) iconNavEl.appendChild(homeEl);
      }
    });
}

function onElementMouseDown(e) {
  var minimapRect = minimapEl ? minimapEl.getBoundingClientRect() : { top: 0 };
  var y = e.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);

  updateCursorPosition();

  window.addEventListener('mousemove', drag);
}

function onElementTouchStart(e) {
  var touch = e.touches[0];
  var minimapRect = minimapEl ? minimapEl.getBoundingClientRect() : { top: 0 };
  var y = touch.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);

  updateCursorPosition();
  window.scrollbaring = true;
}

function drag(e) {
  var minimapRect = minimapEl ? minimapEl.getBoundingClientRect() : { top: 0 };
  var y = e.pageY - minimapRect.top;
  var height = minimapEl ? minimapEl.offsetHeight : 1;
  position = cmap(y, 0, height, 0, 100);

  updateCursorPosition();
}

function dragTouch(e) {
  if (e.touches.length != 1)
    return;
}

function onWindowMouseUp(e) {
  window.removeEventListener('mousemove', drag);
  window.removeEventListener('touchmove', dragTouch);
}

function updateCursorPosition(silent) {
  if (cursorEl) {
    css(cursorEl, { top: position + '%' });
  }
  if (!silent) {
    updateCameraPosition();
  }
}

function updateCameraPosition() {
  var camera = window.camera;

  if (camera) {
    var normal = position / 100;
    camera.position.target.z = cmap(curve_inverse(normal), 0, 1, 1.1, 40000);
    camera.position.target.pz = camera.position.target.z;
  }
}

function cmap(v, i1, i2, o1, o2) {
  return Math.max(Math.min(map(v, i1, i2, o1, o2), o2), o1);
}

function unfocus(home) {
  var centerOnSun = window.centerOnSun;
  var zoomOut = window.zoomOut;
  var shouldShowFediverseSystem = window.shouldShowFediverseSystem;
  var goToFediverseCenter = window.goToFediverseCenter;
  var fediverseInteraction = window.fediverseInteraction;

  fadeOut($('#detailContainer'));
  css($('#css-container'), { display: 'block' });
  if (!!home) {
    if (typeof shouldShowFediverseSystem === "function" && shouldShowFediverseSystem()) {
      goToFediverseCenter();
      if (typeof fediverseInteraction !== "undefined") {
        fediverseInteraction.lastViewedInstance = null;
      }
    } else {
      if (centerOnSun) centerOnSun();
      setTimeout(hideSunButton, 500);
      if (zoomOut) zoomOut(555);
    }
  }
}

function updateCount() {
  if (count < 3) {
    count++;
  } else if (!ready) {
    ready = true;
  }
}

window.initializeMinimap = initializeMinimap;
window.updateMinimap = updateMinimap;
window.setScrollPositionFromTouch = setScrollPositionFromTouch;
window.setMinimap = setMinimap;
window.showSunButton = showSunButton;
window.hideSunButton = hideSunButton;
