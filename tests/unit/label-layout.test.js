import { LabelLayout } from '../../src/js/core/label-layout.js';

describe('LabelLayout', () => {
    let layout;

    beforeEach(() => {
        layout = new LabelLayout();
    });

    it('should place non-overlapping labels', () => {
        const items = [
            { x: 0, y: 0, width: 10, height: 10, priority: 10 },
            { x: 20, y: 20, width: 10, height: 10, priority: 5 }
        ];
        const result = layout.process(items);
        expect(result.length).to.equal(2);
    });

    it('should reject overlapping labels', () => {
        const items = [
            { x: 0, y: 0, width: 10, height: 10, priority: 10, id: 'A' },
            { x: 5, y: 5, width: 10, height: 10, priority: 5, id: 'B' } // Overlaps A
        ];
        const result = layout.process(items);
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('A');
    });

    it('should respect priority', () => {
        const items = [
            { x: 5, y: 5, width: 10, height: 10, priority: 5, id: 'B' },
            { x: 0, y: 0, width: 10, height: 10, priority: 10, id: 'A' } // Higher priority, should process first
        ];
        const result = layout.process(items);
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('A');
    });

    // Performance Benchmark
    it('should process 1000 items efficiently', function() {
        this.timeout(5000); // Allow longer timeout for benchmark
        
        const items = [];
        const count = 1000;
        const width = 1000;
        const height = 1000;

        for (let i = 0; i < count; i++) {
            items.push({
                x: Math.random() * width,
                y: Math.random() * height,
                width: 20,
                height: 10,
                priority: Math.random()
            });
        }

        const start = performance.now();
        layout.process(items);
        const end = performance.now();
        const duration = end - start;

        console.log(`LabelLayout processed ${count} items in ${duration.toFixed(2)}ms`);
        
        // This assertion is loose, just to ensure it runs. 
        // We'll manually check the console log for improvement.
        expect(duration).to.be.lessThan(5000); 
    });
});
