export class PerformanceMonitor {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'perf-monitor';
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '0',
            right: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '5px',
            zIndex: '10000',
            pointerEvents: 'none',
            display: 'none'
        });

        this.fpsElement = document.createElement('div');
        this.memElement = document.createElement('div');
        this.objsElement = document.createElement('div');
        
        this.container.appendChild(this.fpsElement);
        this.container.appendChild(this.memElement);
        this.container.appendChild(this.objsElement);
        document.body.appendChild(this.container);

        this.frames = 0;
        this.lastTime = performance.now();
        this.enabled = false;
        
        // Listen for toggle key 'P'
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p') {
                this.toggle();
            }
        });
    }

    toggle() {
        this.enabled = !this.enabled;
        this.container.style.display = this.enabled ? 'block' : 'none';
    }

    update(renderer, scene) {
        if (!this.enabled) return;

        this.frames++;
        const time = performance.now();

        if (time >= this.lastTime + 1000) {
            const fps = Math.round((this.frames * 1000) / (time - this.lastTime));
            this.fpsElement.textContent = `FPS: ${fps}`;
            
            if (performance.memory) {
                const mem = Math.round(performance.memory.usedJSHeapSize / 1048576);
                this.memElement.textContent = `MEM: ${mem} MB`;
            }

            if (renderer && renderer.info) {
                 this.objsElement.textContent = `DrawCalls: ${renderer.info.render.calls} | Geometries: ${renderer.info.memory.geometries}`;
            }

            this.lastTime = time;
            this.frames = 0;
        }
    }
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
}
