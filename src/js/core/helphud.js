
var hideHelpHudTime = 8000;		
var helpHidden = false;

export function hideHelp(){
	if( helpHidden )
		return;
	
	helpHidden = true;
	var help = document.getElementById('controlshelp');
  if (!help) {
    return;
  }
	help.style.display = 'none';
}

setTimeout( function(){
	hideHelp();
}, hideHelpHudTime );	

document.addEventListener( 'mousedown', function(){
	hideHelp();
}, true);	 

window.hideHelp = hideHelp;
