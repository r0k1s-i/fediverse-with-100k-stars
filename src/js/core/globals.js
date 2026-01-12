
export const globals = {
    scene: null,
    camera: null,
    renderer: null,
    
    rotating: null,
    translating: null,
    galacticCentering: null,
    
    starModel: null,
    pSystem: null,
    pGalacticSystem: null,
    pDustSystem: null,
    earth: null,
    spacePlane: null,
    
    screenWidth: 0,
    screenHeight: 0,
    screenWhalf: 0,
    screenHhalf: 0,
    
    rotateX: 0,
    rotateY: 0,
    rotateVX: 0,
    rotateVY: 0,
    
    shaderList: null,
    
    enableDataStar: true,
    enableSkybox: true,
    enableGalaxy: true,
    enableDust: false,
    enableSolarSystem: true,
    enableSpacePlane: true,
    enableStarModel: true,
    enableDirector: true,
};

window.globals = globals;
