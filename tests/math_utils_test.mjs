
global.window = {}; 

import { pickRandomIndices } from '../src/js/utils/math.temp.mjs';
import assert from 'assert';

console.log("Running tests for pickRandomIndices...");

try {
    // Test 1: Basic functionality
    const total = 100;
    const count = 10;
    const indices = pickRandomIndices(total, count);

    assert.strictEqual(indices.length, count, "Should return requested number of indices");
    
    // Test 2: Uniqueness
    const uniqueSet = new Set(indices);
    assert.strictEqual(uniqueSet.size, count, "All indices should be unique");

    // Test 3: Range
    indices.forEach(idx => {
        assert.ok(idx >= 0 && idx < total, `Index ${idx} should be within range [0, ${total})`);
    });

    // Test 4: Count > Total
    const indicesAll = pickRandomIndices(5, 10);
    assert.strictEqual(indicesAll.length, 5, "Should return max available indices if count > total");
    
    // Test 5: Count 0
    const indicesZero = pickRandomIndices(100, 0);
    assert.strictEqual(indicesZero.length, 0, "Should return empty array for count 0");

    console.log("✅ All tests passed!");

} catch (e) {
    console.error("❌ Test Failed:", e);
    process.exit(1);
}
