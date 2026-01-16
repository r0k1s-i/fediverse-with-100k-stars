// Use global expect from chai
const { expect } = window;
import { constrain, map, spliceOne } from '../../src/js/utils/math.js';

describe('Math Utils', () => {
    describe('constrain', () => {
        it('should constrain value within range', () => {
            expect(constrain(5, 0, 10)).to.equal(5);
            expect(constrain(-5, 0, 10)).to.equal(0);
            expect(constrain(15, 0, 10)).to.equal(10);
        });
    });

    describe('map', () => {
        it('should map value from one range to another', () => {
            expect(map(0.5, 0, 1, 0, 100)).to.equal(50);
            expect(map(5, 0, 10, 0, 100)).to.equal(50);
        });

        it('should handle values outside input range', () => {
            expect(map(2, 0, 1, 0, 100)).to.equal(200);
        });
    });

    describe('spliceOne', () => {
        it('should remove one element at index', () => {
            const arr = [1, 2, 3, 4, 5];
            spliceOne(arr, 2); // Remove index 2 (value 3)
            expect(arr).to.deep.equal([1, 2, 4, 5]);
            expect(arr.length).to.equal(4);
        });

        it('should handle last element', () => {
            const arr = [1, 2, 3];
            spliceOne(arr, 2);
            expect(arr).to.deep.equal([1, 2]);
        });
        
        it('should handle first element', () => {
            const arr = [1, 2, 3];
            spliceOne(arr, 0);
            expect(arr).to.deep.equal([2, 3]);
        });
    });
});
