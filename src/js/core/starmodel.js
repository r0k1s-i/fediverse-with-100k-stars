/**
 * Star Model Module
 * 
 * Creates the model used for close-up views of Fediverse instances.
 * Now uses GLB planet models instead of shader-based star/sun.
 */

import { AUToLY } from '../utils/app.js';
import { preloadPlanetModel, createPlanetModel } from './planet-model.js';

export function makeStarModels() {
    preloadPlanetModel();
    
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
    starModel.userData.galaxyPosition = position.clone();
    
    starModel.setSpectralIndex(0.5);
    starModel.setScale(1.0);
    
    // Force matrix update immediately to ensure rendering is correct on first frame
    starModel.updateMatrix();
    starModel.updateMatrixWorld(true);
    if (localRoot) localRoot.updateMatrixWorld(true);
}

window.makeStarModels = makeStarModels;
window.setStarModel = setStarModel;
