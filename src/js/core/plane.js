import * as THREE from "three";

var textureLoader = new THREE.TextureLoader();

function onTextureError(err) {
  console.error("Error loading plane texture:", err);
}

export var glowSpanTexture = textureLoader.load(
  "src/assets/textures/glowspan.png",
  undefined,
  undefined,
  onTextureError,
);

window.glowSpanTexture = glowSpanTexture;
