uniform float scale;
uniform float zoomSize;
uniform float cameraZ;

attribute float size;
attribute vec3 customColor;

varying vec3 vColor;
varying float opacity;

void main() {
    vColor = customColor;
    
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * mvPosition;
    
    // Logic from fediverse.js preview.update:
    // opacity = constrain(Math.pow(camera.position.z * 0.002, 2), 0, 1);
    float o = pow(cameraZ * 0.002, 2.0);
    opacity = clamp(o, 0.0, 1.0);
    
    if (opacity < 0.1) opacity = 0.0;
    
    // scale = constrain(Math.pow(camera.position.z * 0.001, 2), 0, 1);
    float s = clamp(pow(cameraZ * 0.001, 2.0), 0.0, 1.0);
    
    // Size attenuation
    // gl_PointSize = size * scale * (constant / distance)
    // 40.0 is base size. 
    gl_PointSize = size * s * ( 1000.0 / -mvPosition.z );
}
