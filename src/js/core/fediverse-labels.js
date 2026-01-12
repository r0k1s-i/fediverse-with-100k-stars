
var fediverseLabels = {
  canvas: null,
  ctx: null,
  layout: null,
  sortedInstances: [],
  maxLabels: 300,
  checkCount: 2000,
  font: '12px "Segoe UI", Arial, sans-serif',
};

export function initFediverseLabels() {
  var fediverseInstances = window.fediverseInstances;
  var LabelLayout = window.LabelLayout;

  if (typeof fediverseInstances === "undefined") {
    setTimeout(initFediverseLabels, 500);
    return;
  }

  var container = document.getElementById("visualization");
  var canvas = document.createElement("canvas");
  canvas.id = "label-canvas";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.zIndex = "999";

  container.appendChild(canvas);

  fediverseLabels.canvas = canvas;
  fediverseLabels.ctx = canvas.getContext("2d");
  fediverseLabels.layout = new LabelLayout();

  fediverseLabels.sortedInstances = fediverseInstances
    .slice()
    .sort(function (a, b) {
      var usersA = a.stats && a.stats.user_count ? a.stats.user_count : 0;
      var usersB = b.stats && b.stats.user_count ? b.stats.user_count : 0;
      return usersB - usersA;
    });

  window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

export function updateFediverseLabels() {
  if (!fediverseLabels.canvas) return;

  var ctx = fediverseLabels.ctx;
  var width = fediverseLabels.canvas.width;
  var height = fediverseLabels.canvas.height;

  ctx.clearRect(0, 0, width, height);

  return;
}

window.initFediverseLabels = initFediverseLabels;
window.updateFediverseLabels = updateFediverseLabels;
