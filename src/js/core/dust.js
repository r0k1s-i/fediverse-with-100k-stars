
var dustTexture = new THREE.TextureLoader().load( "src/assets/textures/dust.png" );

var dustUniforms = {
	color:     { value: new THREE.Color( 0xffffff ) },
	scale: 		{ value: 1.0 },
	texture0:   { value: dustTexture },
	cameraPitch: { value: 0 },
};

function generateDust(){

	var geometry = new THREE.BufferGeometry();
	var count = 10000;
	
	var positions = new Float32Array(count * 3);
	var colors = new Float32Array(count * 3);
	var sizes = new Float32Array(count);

	var numArms = 5;
	var arm = 0;
	var countPerArm = count / numArms;
	var ang = 0;
	var dist = 0;
	
	for( var i=0; i<count; i++ ){
		var x = Math.cos(ang) * dist;
		var y = 0;
		var z = Math.sin(ang) * dist;

		var sa = 120 - Math.sqrt(dist);
		if( Math.random() > 0.3)
			sa *= ( 1 + Math.random() ) * 4;
		x += random(-sa, sa);
		z += random(-sa, sa);

		var distanceToCenter = Math.sqrt( x*x + z*z);
		var thickness = constrain( Math.pow( constrain(60-distanceToCenter*0.1,0,100000),2) * 0.02,2,10000) + Math.random() * 20;
		y += random( -thickness, thickness);		

		x *= 20;
		y *= 20;
		z *= 20;

		var size = 140 + constrain( 300/dist,0,8000);	
		if( Math.random() > 0.99 )
			size *= Math.pow(1 + Math.random(), 4 + Math.random() * 3) * .2;			

		positions[i * 3] = x;
		positions[i * 3 + 1] = y;
		positions[i * 3 + 2] = z;
		
		var r = 1;
		var g = 1;
		var b = 1;
		
		colors[i * 3] = r;
		colors[i * 3 + 1] = g;
		colors[i * 3 + 2] = b;
		
		sizes[i] = size;

		ang -= 0.0012;	
		dist += .5;

		if( i % countPerArm == 0 ){
			ang = Math.PI * 2 / numArms * arm;
			dist = 0;
			arm++;
		}
	}		

	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
	geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

	var dustShaderMaterial = new THREE.ShaderMaterial( {
		uniforms: 		dustUniforms,
		vertexShader:   shaderList.galacticdust.vertex,
		fragmentShader: shaderList.galacticdust.fragment,

		blending: 		THREE.SubtractiveBlending,
		depthTest: 		false,
		depthWrite: 	false,
		transparent:	true,
	});	

	var pDustSystem = new THREE.Points( geometry, dustShaderMaterial );

	var twoPI = Math.PI * 2;
	pDustSystem.update = function(){		

		dustUniforms.cameraPitch.value = rotating.rotation.x;		
		while( dustUniforms.cameraPitch.value > twoPI ){
			dustUniforms.cameraPitch.value -= twoPI;
		}

		while( dustUniforms.cameraPitch.value < -twoPI ){
			dustUniforms.cameraPitch.value += twoPI;
		}		

		var areaOfWindow = window.innerWidth * window.innerHeight;
		dustUniforms.scale.value = areaOfWindow / 720.0;

		if( camera.position.z < 2500 ){
			if( dustShaderMaterial.opacity > 0 )
				dustShaderMaterial.opacity -= 0.05;
		}
		else{
			if( dustShaderMaterial.opacity < 1 )
				dustShaderMaterial.opacity += 0.05;
		}

		if( dustShaderMaterial.opacity <= 0.0 ){
			pDustSystem.visible = false;				
		}
		else{
			pDustSystem.visible = true;			
		}		
	}

	return pDustSystem;
}
