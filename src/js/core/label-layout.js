
export class LabelLayout {
    constructor(options = {}) {
        this.placed = [];
        this.grid = {};
        this.cellSize = options.cellSize || 100;
    }

    process(items) {
        const sorted = items.slice().sort((a, b) => b.priority - a.priority);
        this.placed = [];
        this.grid = {}; // Reset grid

        const result = [];

        for (const item of sorted) {
            if (!this.checkCollision(item)) {
                this.placed.push(item);
                this.addToGrid(item);
                result.push(item);
            }
        }

        return result;
    }

    checkCollision(item) {
        const keys = this.getGridKeys(item);
        for (const key of keys) {
            const cellItems = this.grid[key];
            if (cellItems) {
                for (const placedItem of cellItems) {
                    if (this.intersect(item, placedItem)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    addToGrid(item) {
        const keys = this.getGridKeys(item);
        for (const key of keys) {
            if (!this.grid[key]) {
                this.grid[key] = [];
            }
            this.grid[key].push(item);
        }
    }

    getGridKeys(item) {
        const startX = Math.floor(item.x / this.cellSize);
        const startY = Math.floor(item.y / this.cellSize);
        const endX = Math.floor((item.x + item.width) / this.cellSize);
        const endY = Math.floor((item.y + item.height) / this.cellSize);
        
        const keys = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                keys.push(`${x},${y}`);
            }
        }
        return keys;
    }

    intersect(r1, r2) {
        return !(r2.x >= r1.x + r1.width || 
                 r2.x + r2.width <= r1.x || 
                 r2.y >= r1.y + r1.height || 
                 r2.y + r2.height <= r1.y);
    }
}

if (typeof window !== 'undefined') {
    window.LabelLayout = LabelLayout;
}
