
import { AUToLY } from '../utils/app.js';

export function makeStarModels(){
    var makeSun = window.makeSun;
	var sun = makeSun({
		radius: 7.35144e-8,
		spectral: 0.9
	});
	
	sun.substars = [];
	
	for( var i=0; i<20; i++ ){
		var sub = makeSun({
			radius: 7.35144e-8,
			spectral: 0.9
		});
		sun.substars.push( sub );
	}
	
	return sun;
}

function hideAllSubStars(){
    var starModel = window.starModel;
	for( var i=0; i<starModel.substars.length; i++ ){
		var sub = starModel.substars[i];
		starModel.remove( sub );
	}
}

export function setStarModel( position, name ){
    var starModel = window.starModel;
    var starSystems = window.starSystems;
    var makeSun = window.makeSun; 

	hideAllSubStars();

	starModel.position.copy( position );

	var starSystem = starSystems[name];

	if( starSystem === undefined ){
		starModel.setSpectralIndex( 0 );
        return;
	}

	var mainStar = starSystem.sub[0];

	if( name === 'Sol' )
		starModel.setSpectralIndex(0.9);
	else
		starModel.setSpectralIndex( mainStar.c );

	starModel.setScale( mainStar.radius );
	starModel.randomizeSolarFlare();

	var rx = -0.5 + Math.random() * 2;
	var ry = -0.5 + Math.random() * 2;

	var numSubStars = starSystem.sub.length-1;
	if( numSubStars <= 0  )
		return;

	var separation = AUToLY(starSystem.sep) * 0.01;

	for( var i=0; i<numSubStars; i++ ){		
		var subStar = starSystem.sub[i+1];
		var subStarModelIndex = i;
		var subStarModel = starModel.substars[ subStarModelIndex ];
		
		starModel.add( subStarModel );

		subStarModel.setSpectralIndex( subStar.c );
		subStarModel.setScale( subStar.radius );
		subStarModel.randomizeSolarFlare();
		subStarModel.offset = AUToLY( subStar.offset ) * 0.0006;
		var timingOff = Math.random() * 100;
		subStarModel.angle = Math.random() * Math.PI * 2;
		subStarModel.rSpeed = Math.random() * 0.004;

		if( starSystem.sep <= 0 ){		
			subStarModel.update = function(){
				this.angle += this.rSpeed;
				this.position.x = Math.cos( this.angle ) * this.offset;
				this.position.y = Math.sin( this.angle ) * this.offset;
				this.rotation.x += this.angle * 0.0001;
				this.rotation.y += this.angle * 0.001;
			}	
		}
		else{
			var rAngle = Math.PI * 2 * Math.random();
			var dist = separation;
			subStarModel.position.x = Math.cos( rAngle ) * dist;
			subStarModel.position.y = Math.sin( rAngle ) * dist;
		}
		
	}

}

window.makeStarModels = makeStarModels;
window.setStarModel = setStarModel;
