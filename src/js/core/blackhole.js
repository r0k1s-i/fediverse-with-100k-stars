import * as THREE from 'three';
import { constrain } from '../utils/math.js';

var textureLoader = new THREE.TextureLoader();
var blackholeMesh;
var blackholeMaterial;
var blackholeTexture = null;
var textureLoading = false;

var BLACKHOLE_SHOW_THRESHOLD = 79990;
var BLACKHOLE_FULL_OPACITY_THRESHOLD = 80000;

var blackholeVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

var blackholeFragmentShader = `
uniform sampler2D map;
uniform float opacity;
varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(map, vUv);
    
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float edgeFade = 1.0 - smoothstep(0.3, 0.5, dist);
    
    gl_FragColor = vec4(texColor.rgb, texColor.a * opacity * edgeFade);
}
`;

function loadBlackholeTexture(callback) {
    if (blackholeTexture) {
        callback(blackholeTexture);
        return;
    }
    if (textureLoading) return;
    
    textureLoading = true;
    textureLoader.load(
        'src/assets/textures/images.steamusercontent.jpeg',
        function(texture) {
            blackholeTexture = texture;
            callback(texture);
        },
        undefined,
        function(err) { console.error("Error loading blackhole texture:", err); }
    );
}

export function createBlackhole() {
    var blackholeUniforms = {
        map: { value: null },
        opacity: { value: 0 }
    };

    blackholeMaterial = new THREE.ShaderMaterial({
        uniforms: blackholeUniforms,
        vertexShader: blackholeVertexShader,
        fragmentShader: blackholeFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    var planeWidth = 800000;
    var planeHeight = planeWidth * (1080 / 1920);
    var geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

    blackholeMesh = new THREE.Mesh(geometry, blackholeMaterial);
    blackholeMesh.position.set(0, 0, -300000);
    blackholeMesh.renderOrder = -1000;
    
    var currentOpacity = 0;

    blackholeMesh.update = function() {
        var camera = window.camera;
        var rotating = window.rotating;
        var pSystem = window.pSystem;

        if (!camera) return;

        var cameraZ = camera.position.z;
        var targetOpacity = 0;

        var isHeatVision = false;
        if (pSystem) {
            var mat = pSystem.shaderMaterial || pSystem.material;
            if (mat && mat.uniforms && mat.uniforms.heatVision) {
                isHeatVision = mat.uniforms.heatVision.value > 0.01;
            }
        }

        if (cameraZ >= BLACKHOLE_SHOW_THRESHOLD && isHeatVision) {
            var fadeRange = BLACKHOLE_FULL_OPACITY_THRESHOLD - BLACKHOLE_SHOW_THRESHOLD;
            var fadeProgress = (cameraZ - BLACKHOLE_SHOW_THRESHOLD) / fadeRange;
            targetOpacity = constrain(fadeProgress, 0, 0.5);
            
            if (!blackholeTexture && !textureLoading) {
                loadBlackholeTexture(function(texture) {
                    blackholeUniforms.map.value = texture;
                });
            }
        }

        currentOpacity += (targetOpacity - currentOpacity) * 0.05;

        if (currentOpacity < 0.001) {
            blackholeUniforms.opacity.value = 0;
            blackholeMesh.visible = false;
        } else {
            blackholeMesh.visible = true;
            blackholeUniforms.opacity.value = currentOpacity;

            if (rotating) {
                blackholeMesh.rotation.x = -rotating.rotation.x;
                blackholeMesh.rotation.y = -rotating.rotation.y;
                var selfRotation = Date.now() * 0.00002;
                blackholeMesh.rotation.z = -rotating.rotation.z + selfRotation;
            }
        }
    };

    return blackholeMesh;
}

window.createBlackhole = createBlackhole;
