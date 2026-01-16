// Use global expect from chai (loaded by runner.html)
const { expect } = window;
import { AssetManager } from '../../src/js/core/asset-manager.js';
import * as THREE from 'three';

describe('AssetManager', () => {
    
    // Clear instance before tests if possible, but singleton pattern makes it hard.
    // We can rely on just testing the logic via a new instance if we didn't store singleton globally,
    // but the code checks `AssetManager.instance`.
    // Hack: Reset the singleton for testing purposes
    beforeEach(() => {
        AssetManager.instance = null;
    });

    it('should be a singleton', () => {
        const instance1 = new AssetManager();
        const instance2 = new AssetManager();
        expect(instance1).to.equal(instance2);
    });

    it('should cache loaded textures', () => {
        const manager = new AssetManager();
        const url = 'src/assets/textures/test_texture.png';
        
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

    it('should evict least recently used textures when full', () => {
        const manager = new AssetManager();
        manager.maxCacheSize = 2; // Small limit for testing
        
        let disposedCount = 0;
        
        manager.loader = {
            load: (path) => {
                const texture = new THREE.Texture();
                texture.name = path;
                texture.dispose = () => { disposedCount++; };
                return texture;
            }
        };

        // Load 2 textures (full)
        manager.loadTexture('tex1');
        manager.loadTexture('tex2');
        
        // Access tex1 (making it most recent)
        manager.loadTexture('tex1');

        // Load tex3 (should evict tex2, which is now oldest)
        manager.loadTexture('tex3');

        // Updated expectation: Should NOT auto-dispose on eviction by default
        expect(disposedCount).to.equal(0);
        expect(manager.cache.has('tex1')).to.be.true;
        expect(manager.cache.has('tex3')).to.be.true;
        expect(manager.cache.has('tex2')).to.be.false;
    });

    it('should handle reference counting correctly', () => {
        const manager = new AssetManager();
        let disposedCount = 0;
        
        manager.loader = {
            load: (path) => {
                const texture = new THREE.Texture();
                texture.name = path;
                texture.dispose = () => { disposedCount++; };
                return texture;
            }
        };

        const url = 'ref_tex';
        manager.loadTexture(url);
        
        // Retain
        manager.retain(url);
        
        // Simulate eviction by filling cache
        manager.maxCacheSize = 1;
        manager.loadTexture('other_tex'); // Evicts ref_tex
        
        // Should not be disposed because retain count is 1
        expect(disposedCount).to.equal(0);
        expect(manager.cache.has(url)).to.be.false; // Evicted from cache
        
        // Release
        manager.release(url);
        
        // Now it should be disposed because count is 0 and not in cache
        expect(disposedCount).to.equal(1);
    });

    it('should dispose immediately on release if not in cache', () => {
        const manager = new AssetManager();
        let disposedCount = 0;
        manager.loader = {
            load: (path) => {
                const t = new THREE.Texture();
                t.dispose = () => { disposedCount++; };
                return t;
            }
        };

        const url = 'temp_tex';
        manager.loadTexture(url);
        manager.retain(url);
        
        // Force eviction
        manager.maxCacheSize = 0; 
        manager.loadTexture('force_evict'); 
        
        // Should still be alive due to retain
        expect(disposedCount).to.equal(0);
        
        // Release -> Dispose
        manager.release(url);
        expect(disposedCount).to.equal(1);
    });

    it('should dispose texture correctly via dispose method', () => {
        const manager = new AssetManager();
        let disposed = false;
        
        manager.loader = {
            load: () => {
                const t = new THREE.Texture();
                t.dispose = () => { disposed = true; };
                return t;
            }
        };

        manager.loadTexture('tex1');
        manager.dispose('tex1');
        
        expect(disposed).to.be.true;
        expect(manager.cache.has('tex1')).to.be.false;
    });
});
