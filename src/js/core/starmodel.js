/**
 * Star Model Module
 *
 * Creates the model used for close-up views of Fediverse instances.
 * Now uses GLB planet models instead of shader-based star/sun.
 */

import * as THREE from "three";
import { AUToLY } from "../utils/app.js";
import { createPlanetModel } from "./planet-model.js";

export function makeStarModels() {
  // Models are loaded on-demand when pickRandomModel is called
  const planet = createPlanetModel();

  planet.substars = [];

  return planet;
}

function hideAllSubStars() {
  var starModel = window.starModel;
  if (!starModel || !starModel.substars) return;
  for (var i = 0; i < starModel.substars.length; i++) {
    var sub = starModel.substars[i];
    if (sub && starModel.remove) starModel.remove(sub);
  }
}

export function setStarModel(position, name) {
  var starModel = window.starModel;
  var localRoot = window.localRoot;

  if (!starModel || !localRoot) return;

  hideAllSubStars();

  if (starModel.parent !== localRoot) {
    if (starModel.parent) starModel.parent.remove(starModel);
    localRoot.add(starModel);
  }

  starModel.position.set(0, 0, 0);

  var galaxyPos =
    position instanceof THREE.Vector3
      ? position.clone()
      : new THREE.Vector3(position.x, position.y, position.z);

  // 检查是否为同一个实例，避免重复点击时模型随机变化
  var trackedGalaxyPosition =
    starModel.userData && starModel.userData.galaxyPosition;
  var isNewInstance =
    !trackedGalaxyPosition || trackedGalaxyPosition.distanceTo(galaxyPos) > 0.1;

  starModel.userData.galaxyPosition = galaxyPos;

  starModel.setSpectralIndex(0.5);
  starModel.setScale(1.0);

  // 只有切换到新实例时才随机选择模型和旋转速度
  if (isNewInstance) {
    if (typeof starModel.randomizeRotationSpeed === "function") {
      starModel.randomizeRotationSpeed();
    }

    if (typeof starModel.pickRandomModel === "function") {
      starModel.pickRandomModel();
    }
  }

  starModel.updateMatrix();
  starModel.updateMatrixWorld(true);
  if (localRoot) localRoot.updateMatrixWorld(true);
}

window.makeStarModels = makeStarModels;
window.setStarModel = setStarModel;
