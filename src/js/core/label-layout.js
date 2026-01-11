
export class LabelLayout {
    constructor() {
        this.placed = [];
    }

    process(items) {
        const sorted = items.slice().sort((a, b) => b.priority - a.priority);
        this.placed = [];

        const result = [];

        for (const item of sorted) {
            if (!this.checkCollision(item)) {
                this.placed.push(item);
                result.push(item);
            }
        }

        return result;
    }

    checkCollision(item) {
        for (const placedItem of this.placed) {
            if (this.intersect(item, placedItem)) {
                return true;
            }
        }
        return false;
    }

    intersect(r1, r2) {
        return !(r2.x >= r1.x + r1.width || 
                 r2.x + r2.width <= r1.x || 
                 r2.y >= r1.y + r1.height || 
                 r2.y + r1.height <= r1.y);
    }
}

window.LabelLayout = LabelLayout;
