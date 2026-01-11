
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

  this.domElement = $('<div id="theater" />')
    .css({
      display: 'none',
      position: 'fixed',
      zIndex: 9998,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 100 + '%',
      height: 100 + '%'
    })
    .html('<div class="top-bar"></div><div class="bottom-bar"></div><div class="message" style="display: none;"></div>');

  this.top = this.domElement.find('.top-bar');
  this.bottom = this.domElement.find('.bottom-bar');
  this.content = this.domElement.find('.message');

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
    var $detailContainer = window.$detailContainer || $('#detailContainer');
    var centerOn = window.centerOn;
    var markers = window.markers;
    var toggleHeatVision = window.toggleHeatVision;

    var _this = this, next;
    if( _this.current == 0 ){
      next = $('<a href="#" />')
      .html('Stop')
      .click(function(e) {
        e.preventDefault();
        _this.stop();
      });
    }

    _this.current = 0;
    _this.touring = false;
    _this.timingBuffer = 0;

    _this.content.html('');
    Tour.meta.fadeOut();
    _this.domElement.fadeOut();

    var p = Tour.meta.find('p').html(next);
    Tour.meta.css({
      marginLeft: - Tour.meta.width() / 2 + 'px'
    });

    this.show(function() {

      camera.__tour = this.touring = true;
      this.current = 0;
      this.next(true);

    });

    $detailContainer.fadeOut();
    centerOn( new THREE.Vector3(0,0,0) );
    if( markers.length > 0 )
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

    this.domElement.appendTo(document.body).fadeIn(function() {

      Tour.meta.fadeIn();

      _this.bottom.animate({
        marginBottom: 0
      }, Tour.Duration, 'swing');

      _this.top.animate({
        marginTop: 0
      }, Tour.Duration, 'swing', function() {

        if (callback) {
          callback.call(_this);
        }

      });

    });

    return this;

  },

  hide: function(callback) {

    var _this = this;

    Tour.meta.fadeOut();

    this.bottom.animate({
      marginBottom: - cinematic_width + 'px'
    }, Tour.Duration, 'swing');

    this.top.animate({
      marginTop: - cinematic_width + 'px'
    }, Tour.Duration, 'swing', function() {

      _this.domElement.fadeOut();

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
      _this.content.html('<p><span>' + message + '</span></p>');
      _this.content.fadeIn();

      var next = $('<a href="#" />')
      .html('Skip')
      .click(function(e) {
        e.preventDefault();
        _this.hide();
        Tour.meta.fadeOut();
        _this.timingBuffer = 0.0;
        _this.clearTimers();
        window.firstTime = false;
        $(window).trigger('resize');
      });
      var p = Tour.meta.find('p').html(next);
      Tour.meta.css({
        marginLeft: - Tour.meta.width() / 2 + 'px'
      });
    };
    _this.timers.push( window.setTimeout( onStart, _this.timingBuffer + 1000.0 ) );

    var onFinished = function(){
      _this.content.fadeOut( function(){
        if( callback )
          callback();
      });
    }

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

    if (this.content.css('display') != 'none') {
      this.content.fadeOut(function() {
        _this.content.html('<p><span>' + state.message + '</span></p>');
      });
    } else {
      this.content.html('<p><span>' + state.message + '</span></p>');
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
        _this.content.fadeIn(function() {
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
