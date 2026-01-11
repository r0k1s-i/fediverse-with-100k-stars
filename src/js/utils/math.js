
export function constrain(v, min, max){
  if( v < min )
    v = min;
  else
  if( v > max )
    v = max;
  return v;
}

export function random(low, high) {
  if (low >= high) return low;
  var diff = high - low;
  return (Math.random() * diff) + low;
}

export function map(value, istart, istop, ostart, ostop) {
  return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
}

export function wrap(value, min, rangeSize) {
	rangeSize-=min;
    while (value < min) {
    	value += rangeSize;
	}
	return value % rangeSize;
}

export function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

window.constrain = constrain;
window.random = random;
window.map = map;
window.wrap = wrap;
window.roundNumber = roundNumber;
