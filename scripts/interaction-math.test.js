const { findClosestInstance } = require('../index_files/interaction-math');

describe('Fediverse Interaction Math', () => {
    const rayOrigin = { x: 0, y: 0, z: 1000 };
    const rayDirection = { x: 0, y: 0, z: -1 };

    test('should find instance directly on ray', () => {
        const instances = [
            { id: 1, position: { x: 0, y: 0, z: 0 } },
            { id: 2, position: { x: 200, y: 0, z: 0 } }
        ];
        const result = findClosestInstance(rayOrigin, rayDirection, instances, 100);
        expect(result).toBeDefined();
        expect(result.id).toBe(1);
    });

    test('should return null if no instance within threshold', () => {
        const instances = [
            { id: 1, position: { x: 200, y: 0, z: 0 } }
        ];
        const result = findClosestInstance(rayOrigin, rayDirection, instances, 100);
        expect(result).toBeNull();
    });

    test('should pick closest instance to camera among hits', () => {
        const instances = [
            { id: 1, position: { x: 0, y: 0, z: 0 } },
            { id: 2, position: { x: 0, y: 0, z: 500 } }
        ];
        const result = findClosestInstance(rayOrigin, rayDirection, instances, 100);
        expect(result.id).toBe(2);
    });

    test('should ignore instances behind the ray', () => {
        const instances = [
            { id: 1, position: { x: 0, y: 0, z: 2000 } }
        ];
        
        const result = findClosestInstance(rayOrigin, rayDirection, instances, 100);
        expect(result).toBeNull();
    });
});
