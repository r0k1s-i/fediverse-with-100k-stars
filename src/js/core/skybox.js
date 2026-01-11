
var skybox;
var skyboxUniforms;

var cameraCube, sceneCube;

function setupSkyboxScene(){
	cameraCube = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000000 );
	sceneCube = new THREE.Scene();	
}

function initSkybox( highres ){
	setLoadMessage("Loading internal stars")
	var r = "src/assets/textures/";

	if( highres == false )
		r += "s_";

	var urls = [ r + "px.jpg", r + "nx.jpg",
				 r + "py.jpg", r + "ny.jpg",
				 r + "pz.jpg", r + "nz.jpg" ];

	var textureCube = new THREE.CubeTextureLoader().load( urls, undefined, setLoadMessage("Loading interstellar bodies") );
	textureCube.anisotropy = maxAniso;
	var shader = THREE.ShaderLib[ "cube" ];
	shader.uniforms[ "tCube" ].value = textureCube;
	shader.uniforms[ "opacity" ] = { value: 1.0, type: "f" };
	skyboxUniforms = shader.uniforms;
	var skyboxMat = new THREE.ShaderMaterial( {
		fragmentShader: shaderList.cubemapcustom.fragment,
		vertexShader: shaderList.cubemapcustom.vertex,
		uniforms: shader.uniforms,
		side: THREE.BackSide,
		depthWrite: false,
		depthTest: false,
	} );

	skybox = new THREE.Mesh( new THREE.BoxGeometry( 1000, 1000, 1000 ), skyboxMat );
	sceneCube.add( skybox );
}

function updateSkybox(override){
	cameraCube.rotation.order = 'YXZ';
	
	if( starModel ){
		var rot = starModel.rotation.clone();		
		rot.x -= Math.PI/4;
		rot.y += Math.PI/4
		cameraCube.rotation.copy( rot );
	}
	else{
		var rot = rotating.rotation.clone();			
		rot.x -= Math.PI/4;
		rot.y += Math.PI/4
		cameraCube.rotation.copy( rot );
	}
	cameraCube.fov = constrain( camera.position.z * 20.0, 60, 70);
	cameraCube.updateProjectionMatrix();

	var skyboxBrightness = constrain(1.4 / camera.position.z, 0.0, 1.0);
	skyboxUniforms["opacity"].value = skyboxBrightness;
}

function renderSkybox(){
	renderer.render( sceneCube, cameraCube );
}
