
export var shaderList = ['src/shaders/starsurface', 'src/shaders/starhalo', 'src/shaders/starflare', 'src/shaders/galacticstars', 'src/shaders/galacticdust', 'src/shaders/datastars', 'src/shaders/cubemapcustom', 'src/shaders/corona'];

export function loadShaders( list, callback ){
	var shaders = {};
    var promises = [];

    list.forEach(function(path) {
		var splitted = path.split('/');
		var name = splitted[splitted.length-1];
        
        if(shaders[name] === undefined) shaders[name] = {};

        var vProm = fetch(path + '.vsh')
            .then(function(r){ return r.text() })
            .then(function(txt){ shaders[name].vertex = txt; });
            
        var fProm = fetch(path + '.fsh')
            .then(function(r){ return r.text() })
            .then(function(txt){ shaders[name].fragment = txt; });
            
        promises.push(vProm, fProm);
    });

	Promise.all(promises).then(function() {
		callback( shaders );
	});
}

window.shaderList = shaderList;
window.loadShaders = loadShaders;
