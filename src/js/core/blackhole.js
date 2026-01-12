import * as THREE from 'three';
import { constrain } from '../utils/math.js';

var textureLoader = new THREE.TextureLoader();
var blackholeMesh;
var blackholeMaterial;

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

export function createBlackhole() {
    var texture = textureLoader.load(
        'src/assets/textures/images.steamusercontent.jpeg',
        undefined,
        undefined,
        function(err) { console.error("Error loading blackhole texture:", err); }
    );

    var blackholeUniforms = {
        map: { value: texture },
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
    
    // 平滑过渡用的当前透明度值
    var currentOpacity = 0;

    blackholeMesh.update = function() {
        var camera = window.camera;
        var rotating = window.rotating;
        var pSystem = window.pSystem;

        if (!camera) return;

        var cameraZ = camera.position.z;
        var targetOpacity = 0;

        // 获取 heat vision 状态
        // 只有在 heat vision 开启 (value > 0) 时才允许显示
        var isHeatVision = false;
        if (pSystem) {
            var mat = pSystem.shaderMaterial || pSystem.material;
            if (mat && mat.uniforms && mat.uniforms.heatVision) {
                isHeatVision = mat.uniforms.heatVision.value > 0.01;
            }
        }

        // 计算目标透明度
        // 条件：距离足够远 AND 开启了 Heat Vision
        if (cameraZ >= BLACKHOLE_SHOW_THRESHOLD && isHeatVision) {
            var fadeRange = BLACKHOLE_FULL_OPACITY_THRESHOLD - BLACKHOLE_SHOW_THRESHOLD;
            var fadeProgress = (cameraZ - BLACKHOLE_SHOW_THRESHOLD) / fadeRange;
            targetOpacity = constrain(fadeProgress, 0, 0.5);
        }

        // 简单的线性插值平滑 (Lerp)
        // 0.05 的系数意味着每帧只接近目标值的 5%，产生柔和的滞后感
        currentOpacity += (targetOpacity - currentOpacity) * 0.05;

        // 只有当实际透明度极低时才完全隐藏，避免突然消失
        if (currentOpacity < 0.001) {
            blackholeUniforms.opacity.value = 0;
            blackholeMesh.visible = false;
        } else {
            blackholeMesh.visible = true;
            blackholeUniforms.opacity.value = currentOpacity;

            if (rotating) {
                blackholeMesh.rotation.x = -rotating.rotation.x;
                blackholeMesh.rotation.y = -rotating.rotation.y;
                // 叠加一个极慢的自转 (基于时间)，产生动态感
                var selfRotation = Date.now() * 0.00002;
                blackholeMesh.rotation.z = -rotating.rotation.z + selfRotation;
            }
        }
    };

    return blackholeMesh;
}

window.createBlackhole = createBlackhole;
