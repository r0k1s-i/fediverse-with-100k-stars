export function constrain(v, min, max) {
  if (v < min) v = min;
  else if (v > max) v = max;
  return v;
}

export function random(low, high) {
  if (low >= high) return low;
  var diff = high - low;
  return Math.random() * diff + low;
}

export function map(value, istart, istop, ostart, ostop) {
  return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
}

export function wrap(value, min, rangeSize) {
  rangeSize -= min;
  while (value < min) {
    value += rangeSize;
  }
  return value % rangeSize;
}

export function roundNumber(num, dec) {
  var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  return result;
}

export function pickRandomIndices(total, count) {
  if (count <= 0) return [];
  if (count >= total) {
    var result = [];
    for (var i = 0; i < total; i++) {
      result.push(i);
    }
    return result;
  }

  var selected = new Set();
  while (selected.size < count) {
    var r = Math.floor(Math.random() * total);
    selected.add(r);
  }

  return Array.from(selected);
}

export function spliceOne(arr, index) {
  for (var i = index; i < arr.length - 1; i++) {
    arr[i] = arr[i + 1];
  }
  arr.pop();
}

window.constrain = constrain;
window.random = random;
window.map = map;
window.wrap = wrap;
window.roundNumber = roundNumber;
window.pickRandomIndices = pickRandomIndices;
window.spliceOne = spliceOne;
