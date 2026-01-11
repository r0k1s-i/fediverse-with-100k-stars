import { $, css, html, fadeIn, fadeOut, find, createEl, trigger } from '../utils/dom.js';

export var GALAXY_TOUR = [
  {"rx":0.5522785678088462,"ry":1.324151395815386,"z":1672.4214873346518,"travelTime":5000,"restTime":5000,"message":"You're seeing the actual density and location of over 100,000 stars in this view."},
  {"rx":0.0019755752638865747,"ry":0.23341774437325485,"z":1210.7034532510997,"travelTime":4000,"restTime":5000,"message":"Named stars that astronomers have studied are highlighted here."}
];

var cinematic_width = 75;

export var Tour = function(stops) {

  this.current = 0;
  this.states = stops;
  this.touring = false;
  this.timingBuffer = 0;
  this.timers = [];

  this.domElement = createEl('<div id="theater"></div>');
  css(this.domElement, {
    display: 'none',
    position: 'fixed',
    zIndex: '9998',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100%',
    height: '100%'
  });
  this.domElement.innerHTML = '<div class="top-bar"></div><div class="bottom-bar"></div><div class="message" style="display: none;"></div>';

  this.top = find(this.domElement, '.top-bar');
  this.bottom = find(this.domElement, '.bottom-bar');
  this.content = find(this.domElement, '.message');

};

Tour.Easing = TWEEN.Easing.Sinusoidal.InOut;
Tour.Duration = 250;
Tour.meta = $('#meta');
Tour.timeouts = [];

Tour.prototype = {

  getState: function() {

    var camera = window.camera;
    var camera_state = {
      rx: camera.rotation.x,
      ry: camera.rotation.y,
      z: camera.position.z
    };

    var state;

    for (var m in this.states) {
      var s = this.states[m];
      if (camera_state.z === s.z) {
        state = s;
        break;
      }
    }

    return state || camera_state;

  },

  start: function() {
    var camera = window.camera;
    var detailContainerEl = window.detailContainerEl || $('#detailContainer');
    var centerOn = window.centerOn;
    var markers = window.markers;
    var toggleHeatVision = window.toggleHeatVision;

    var _this = this, next;
    if( _this.current == 0 ){
      next = createEl('<a href="#"></a>');
      next.textContent = 'Stop';
      next.addEventListener('click', function(e) {
        e.preventDefault();
        _this.stop();
      });
    }

    _this.current = 0;
    _this.touring = false;
    _this.timingBuffer = 0;

    html(_this.content, '');
    fadeOut(Tour.meta);
    fadeOut(_this.domElement);

    var p = find(Tour.meta, 'p');
    if (p) {
      p.innerHTML = '';
      if (next) p.appendChild(next);
    }
    if (Tour.meta) {
      css(Tour.meta, { marginLeft: - Tour.meta.offsetWidth / 2 + 'px' });
    }

    this.show(function() {

      camera.__tour = this.touring = true;
      this.current = 0;
      this.next(true);

    });

    fadeOut(detailContainerEl);
    centerOn( new THREE.Vector3(0,0,0) );
    if( markers && markers.length > 0 )
      markers[0].select();
    camera.position.target.x = 0;

    toggleHeatVision( false );

    return this;

  },

  stop: function() {
    var camera = window.camera;
    var rotating = window.rotating;

    this.hide();

    camera.__tour = false;
    this.touring = false;

    window.rotateX = rotating.rotation.x;
    window.rotateY = rotating.rotation.y;
    TWEEN.removeAll();

    return this;

  },

  show: function(callback) {

    var _this = this;

    document.body.appendChild(this.domElement);
    fadeIn(this.domElement).then(function() {

      fadeIn(Tour.meta);

      animateElement(_this.bottom, { marginBottom: '0' }, Tour.Duration);
      animateElement(_this.top, { marginTop: '0' }, Tour.Duration, function() {
        if (callback) {
          callback.call(_this);
        }
      });

    });

    return this;

  },

  hide: function(callback) {

    var _this = this;

    fadeOut(Tour.meta);

    animateElement(this.bottom, { marginBottom: - cinematic_width + 'px' }, Tour.Duration);
    animateElement(this.top, { marginTop: - cinematic_width + 'px' }, Tour.Duration, function() {

      fadeOut(_this.domElement);

      if (callback) {
        callback.call(_this);
      }

    });

    return this;

  },

  showMessage: function( message, duration, callback ){

    var _this = this;
    _this.show();

    var onStart = function(){
      html(_this.content, '<p><span>' + message + '</span></p>');
      fadeIn(_this.content);

      var next = createEl('<a href="#"></a>');
      next.textContent = 'Skip';
      next.addEventListener('click', function(e) {
        e.preventDefault();
        _this.hide();
        fadeOut(Tour.meta);
        _this.timingBuffer = 0.0;
        _this.clearTimers();
        window.firstTime = false;
        trigger(window, 'resize');
      });
      var p = find(Tour.meta, 'p');
      if (p) {
        p.innerHTML = '';
        p.appendChild(next);
      }
      if (Tour.meta) {
        css(Tour.meta, { marginLeft: - Tour.meta.offsetWidth / 2 + 'px' });
      }
    };
    _this.timers.push( window.setTimeout( onStart, _this.timingBuffer + 1000.0 ) );

    var onFinished = function(){
      fadeOut(_this.content).then(function() {
        if( callback )
          callback();
      });
    };

    _this.timingBuffer += duration + 1000.0;
    _this.timers.push( window.setTimeout( onFinished, _this.timingBuffer ) );

    return this;
  },

  clearTimers: function(){
    for( var i in this.timers ){
      var timer = this.timers[i];
      window.clearTimeout( timer );
    }
  },

  endMessages: function(){
    var _this = this;
    var timer = window.setTimeout( function(){
      _this.hide();
    }, _this.timingBuffer + 1000.0 );
    _this.timers.push( timer );
  },

  next: function(continuous) {
    var rotating = window.rotating;
    var camera = window.camera;

    var _this = this;
    var state = this.state = this.states[this.current];

    _.each(Tour.timeouts, clearTimeout);

    if (this.current === this.states.length - 1) {
    }

    if (!state) {
      this.stop();
      return this;
    }
    this.current++;

    if( state.callback )
      this.arrivalCallback = state.callback;
    else
      this.arrivalCallback = undefined;

    var contentDisplay = this.content ? this.content.style.display : 'none';
    if (contentDisplay !== 'none') {
      fadeOut(this.content).then(function() {
        html(_this.content, '<p><span>' + state.message + '</span></p>');
      });
    } else {
      html(this.content, '<p><span>' + state.message + '</span></p>');
    }

    this.rotating_tween = new TWEEN.Tween(rotating.rotation)
      .to({
        x: state.rx,
        y: state.ry
      }, state.travelTime)
      .easing(Tour.Easing)
      .start();

    this.camera_tween = new TWEEN.Tween(camera.position)
      .to({
        z: state.z
      }, state.travelTime)
      .easing(Tour.Easing)
      .onComplete(function() {
        camera.position.target.z = camera.position.z;
        if( _this.arrivalCallback )
          _this.arrivalCallback();
        fadeIn(_this.content).then(function() {
          Tour.timeouts.push(setTimeout(function() {
            if (continuous) {
              _this.next(true);
            }
          }, state.restTime));
        });
      })
      .start();

    return this;

  },

  previous: function(continuous) {

    return this;

  }

};

function animateElement(el, props, duration, callback) {
  if (!el) {
    if (callback) callback();
    return;
  }
  
  el.style.transition = 'all ' + duration + 'ms ease';
  Object.assign(el.style, props);
  
  setTimeout(function() {
    el.style.transition = '';
    if (callback) callback();
  }, duration);
}

var getTourState = function(t1, t2, msg) {
    var rotating = window.rotating;
    var camera = window.camera;
  return JSON.stringify({
    rx: rotating.rotation.x,
    ry: rotating.rotation.y,
    z: camera.position.z,
    travelTime: t1 || 1500,
    restTime: t2 || 3000,
    message: msg || ''
  });
};

window.GALAXY_TOUR = GALAXY_TOUR;
window.Tour = Tour;
window.getTourState = getTourState;
