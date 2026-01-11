
import { gup } from '../utils/misc.js';

export const enableFediverse = (gup('fediverse') == 1) || true;
export const fediverseDataPath = 'data/fediverse_final.json';

window.enableFediverse = enableFediverse;
window.fediverseDataPath = fediverseDataPath;
