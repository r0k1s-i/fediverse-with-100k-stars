import { expect } from 'https://unpkg.com/chai/chai.js';
import { AssetManager } from '../../src/js/core/asset-manager.js';
import * as THREE from 'three';

describe('AssetManager', () => {
    
    it('should be a singleton', () => {
        const instance1 = new AssetManager();
        const instance2 = new AssetManager();
        expect(instance1).to.equal(instance2);
    });

    it('should cache loaded textures', () => {
        const manager = new AssetManager();
        const url = 'src/assets/textures/test_texture.png';
        
        // Mock the loader
        let loadCallCount = 0;
        manager.loader = {
            load: (path, onLoad) => {
                loadCallCount++;
                const texture = new THREE.Texture();
                texture.name = path;
                if (onLoad) onLoad(texture);
                return texture;
            }
        };

        const texture1 = manager.loadTexture(url);
        const texture2 = manager.loadTexture(url);

        expect(texture1).to.equal(texture2);
        expect(loadCallCount).to.equal(1);
    });
});
