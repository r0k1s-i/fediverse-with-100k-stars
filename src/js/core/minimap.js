
import { map, constrain } from '../utils/math.js';

var border_width = 1;
var padding = 30;

var ready = false;
var count = 0;
var timer = null
var dragged = false;

var $soundOn, $soundOff, $heatvision, $tour, $home;

var $domElement = $('#minimap');
var $minimap = $domElement.find('#zoom-levels');
var $volume = $domElement.find('#volume').load(updateCount);
var $about = $domElement.find('#about').load(updateCount);
var $cursor = $domElement.find('#zoom-cursor');

var POWER = 3;
var position = 0; 
var curve = function(t) {
return Math.pow(t, 1 / POWER);
};
var curve_inverse = function(t) {
return Math.pow(t, POWER);
};

var $window = $(window);

function clickEvent( e ){
var id = $(e.target).attr('id');

if (dragged || (id !== 'css-world' && id !== 'css-camera' && id !== 'glContainer')) {
    dragged = false;
    return;
}

unfocus();
}

function touchEvent( e ){
var event = e.originalEvent;
var id = $(event.target).attr('id');

if (dragged || (id !== 'css-world' && id !== 'css-camera' && id !== 'glContainer')) {
    dragged = false;
    return;
}

unfocus();    
}

$window.click( clickEvent );

$window
.resize(function() {
    var firstTime = window.firstTime;
    if (!ready) {
    if (timer) {
        updateCount();
        clearTimeout(timer);
    }
    timer = setTimeout(function() {
        if( firstTime == false )
        $window.trigger('resize');
    }, 500);

    return;

    }

    var offset = $volume.outerHeight() + $about.outerHeight() + padding;
    var h = $domElement.height() - offset;

    $minimap.height(h - border_width * 2);

if (!$domElement.hasClass('ready')) {
    $domElement.addClass('ready');
}

})
.bind('mouseup', onWindowMouseUp)
.bind('touchend', onWindowMouseUp)
.trigger('resize');

export function initializeMinimap() {
this.updateMinimap();
};

export function updateMinimap() {
    var camera = window.camera;

if (!camera) {
    return;
}

var normal = cmap(camera.position.target.z, 1.1, 40000, 0, 1);
position = cmap(curve(normal), 0, 1, 0, 100);
updateCursorPosition(true);

};

export function setScrollPositionFromTouch( touch ){
var y = (touch.pageY - $minimap.offset().top);
position = cmap(y, 0, $minimap.height(), 0, 100);
updateCursorPosition();
}

export function setMinimap(b) {
dragged = !!b;
};

export function showSunButton() {
if ($home) {
    $home.css({opacity:1.0,display:'inline'});
}
};

export function hideSunButton() {
if ($home) {
    $home.fadeOut();
}
};

$minimap
.bind('mousedown', onElementMouseDown);

$minimap
.bind('touchstart', onElementTouchStart);

$about
.click(function(e) {
    var $detailContainer = window.$detailContainer; 
    if (!$detailContainer) $detailContainer = $('#detailContainer');

    var line_height = 20;
    e.preventDefault();

    $detailContainer.addClass('about');

    $('#css-container').css('display', 'none');

    $.get('detail/about.html', function(data) {
    $('#detailBody').html(data);
    });

    $('#detailTitle').find('span').html('100,000 Stars');

    $detailContainer.css({
    paddingTop: line_height * 3 + 'px'
    });

    $detailContainer.fadeIn();

});

var muted = localStorage.getItem('sound') === '0';

$.get('src/assets/icons/sound-on.svg', function(resp) {
$soundOn = $(resp).find('svg').addClass('icon')
    .css({
    display: muted ? 'none' : 'block'
    })
    .click(function(e) {
    e.preventDefault();
    $soundOn.css({ display: 'none' });
    var muteSound = window.muteSound;
    muteSound();
    if ($soundOff) {
        $soundOff.css({ display: 'inline-block' });
    }
    });
$volume.append($soundOn);
});

$.get('src/assets/icons/sound-off.svg', function(resp) {
$soundOff = $(resp).find('svg').addClass('icon')
    .css({
    display: !muted ? 'none' : 'block'
    })
    .click(function(e) {
    e.preventDefault();
    $soundOff.css({ display: 'none' });
    var unmuteSound = window.unmuteSound;
    unmuteSound();
    if ($soundOn) {
        $soundOn.css({ display: 'inline-block' });
    }
    });
    $volume.append($soundOff);
});

$.get('src/assets/icons/big-tour.svg', function(resp) {
    var $iconNav = window.$iconNav || $('#icon-nav');
    var tour = window.tour;

$tour = $(resp).find('svg').addClass('icon')
    .attr('id', 'tour-button')
    .tip('Take a tour.')
    .click(function(e) {
    e.preventDefault();
    tour.start();
    });
$iconNav.append($tour);

$.get('src/assets/icons/heat-vision.svg', function(resp) {
    var toggleHeatVision = window.toggleHeatVision;

    $heatvision = $(resp).find('svg').addClass('icon')
    .click(function(e) {
        e.preventDefault();
        toggleHeatVision();
    })
    .hover(function(e) {
        $tour.trigger('mouseleave', [true]);
    }, function(e) {
        $tour.trigger('mouseenter');
    })
    .tip('Toggle Spectral Index.');
    $iconNav.append($heatvision);

    $.get('src/assets/icons/center-sun.svg', function(resp) {
    $home = $(resp).find('svg').addClass('icon')
        .tip('Center camera position to the Sun.')
        .hover(function(e) {
        $tour.trigger('mouseleave', [true]);
        }, function(e) {
        $tour.trigger('mouseenter');
        })
        .click(function(e) {
        e.preventDefault();
        unfocus(true);
        })
        .css({
        display: 'none'
        });
    $iconNav.append($home);
    });

});

});

function onElementMouseDown(e) {

var y = (e.pageY - $minimap.offset().top);
position = cmap(y, 0, $minimap.height(), 0, 100);

updateCursorPosition();

$window
    .bind('mousemove', drag);
}

function onElementTouchStart(e){
var event = e.originalEvent;
var touch = event.touches[0];

var y = (touch.pageY - $minimap.offset().top);
position = cmap(y, 0, $minimap.height(), 0, 100);

updateCursorPosition();    
window.scrollbaring = true;
}

function drag(e) {
var y = (e.pageY - $minimap.offset().top);
position = cmap(y, 0, $minimap.height(), 0, 100);

updateCursorPosition();

}

function dragTouch(e){    
var event = e.originalEvent;
if( event.touches.length != 1 )
    return;    
}

function onWindowMouseUp(e) {
$window
    .unbind('mousemove', drag);
$window
    .unbind('touchmove', dragTouch);
}

function updateCursorPosition(silent) {

$cursor.css({
    top: position + '%'
});
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

$('#detailContainer').fadeOut();
$('#css-container').css('display', 'block');
if (!!home) {
    if (typeof shouldShowFediverseSystem === "function" && shouldShowFediverseSystem()) {
    goToFediverseCenter();
    if (typeof fediverseInteraction !== "undefined") {
        fediverseInteraction.lastViewedInstance = null;
    }
    } else {
    centerOnSun();
    setTimeout(hideSunButton, 500);
    zoomOut(555);
    }
} else {
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
