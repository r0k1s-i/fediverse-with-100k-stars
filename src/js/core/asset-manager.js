import * as THREE from 'three';

export class AssetManager {
    constructor() {
        if (AssetManager.instance) {
            return AssetManager.instance;
        }

        this.loader = new THREE.TextureLoader();
        this.cache = new Map();
        
        AssetManager.instance = this;
    }

    static getInstance() {
        if (!AssetManager.instance) {
            new AssetManager();
        }
        return AssetManager.instance;
    }

    loadTexture(url, onLoad, onProgress, onError) {
        if (this.cache.has(url)) {
            const texture = this.cache.get(url);
            if (onLoad) {
                setTimeout(() => onLoad(texture), 0);
            }
            return texture;
        }

        const texture = this.loader.load(
            url,
            (tex) => {
                if (onLoad) onLoad(tex);
            },
            onProgress,
            (err) => {
                console.error(`Error loading texture ${url}:`, err);
                if (onError) onError(err);
            }
        );

        this.cache.set(url, texture);
        return texture;
    }
}
