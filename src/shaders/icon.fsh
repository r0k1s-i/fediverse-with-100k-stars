uniform vec3 color;
uniform sampler2D map;

varying vec3 vColor;
varying float opacity;

void main() {
    if (opacity <= 0.0) discard;
    
    vec4 texColor = texture2D( map, gl_PointCoord );
    
    if (texColor.a < 0.1 && length(texColor.rgb) < 0.1) discard;
    
    gl_FragColor = vec4( color * vColor * texColor.rgb, opacity * texColor.a );
}
