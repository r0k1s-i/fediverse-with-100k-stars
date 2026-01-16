import * as THREE from 'three';

export class AssetManager {
    constructor() {
        if (AssetManager.instance) {
            return AssetManager.instance;
        }

        this.loader = new THREE.TextureLoader();
        this.cache = new Map();
        this.refs = new Map(); // Reference counting
        this.maxCacheSize = 50; // Max number of textures to keep in memory
        
        AssetManager.instance = this;
    }

    static getInstance() {
        if (!AssetManager.instance) {
            new AssetManager();
        }
        return AssetManager.instance;
    }

    /**
     * Increment reference count for a texture
     * @param {string} url 
     */
    retain(url) {
        const count = (this.refs.get(url) || 0) + 1;
        this.refs.set(url, count);
        // console.debug(`[AssetManager] Retain ${url}: ${count}`);
    }

    /**
     * Decrement reference count. If 0 and not in cache, dispose.
     * @param {string} url 
     */
    release(url) {
        const count = (this.refs.get(url) || 0) - 1;
        this.refs.set(url, Math.max(0, count));
        // console.debug(`[AssetManager] Release ${url}: ${Math.max(0, count)}`);

        if (count <= 0) {
            this.refs.delete(url);
            if (!this.cache.has(url)) {
                this.dispose(url);
            }
        }
    }

    loadTexture(url, onLoad, onProgress, onError) {
        if (this.cache.has(url)) {
            // LRU: Refresh key position by deleting and re-setting
            const texture = this.cache.get(url);
            this.cache.delete(url);
            this.cache.set(url, texture);

            if (onLoad) {
                setTimeout(() => onLoad(texture), 0);
            }
            return texture;
        }

        // Enforce Cache Limit
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            
            // If no references, safe to dispose
            if (!this.refs.has(oldestKey) || this.refs.get(oldestKey) <= 0) {
                this.dispose(oldestKey);
            }
        }

        const texture = this.loader.load(
            url,
            (tex) => {
                if (onLoad) onLoad(tex);
            },
            onProgress,
            (err) => {
                console.error(`Error loading texture ${url}:`, err);
                // If loading fails, remove from cache so we can try again later
                this.cache.delete(url);
                if (onError) onError(err);
            }
        );

        this.cache.set(url, texture);
        return texture;
    }

    dispose(url) {
        if (this.cache.has(url)) {
            const texture = this.cache.get(url);
            if (texture) {
                texture.dispose();
            }
            this.cache.delete(url);
            console.debug(`[AssetManager] Disposed texture: ${url}`);
        }
    }

    disposeAll() {
        for (const url of this.cache.keys()) {
            this.dispose(url);
        }
    }
}
