const assert = require('assert');

console.log("Running Label Layout Tests...");

const mockLayout = {
    process: function(items) {
        return []; 
    }
};

const items = [
    { id: 1, x: 100, y: 100, width: 50, height: 20, priority: 10 },
    { id: 2, x: 110, y: 105, width: 50, height: 20, priority: 5 },
    { id: 3, x: 200, y: 200, width: 50, height: 20, priority: 8 },
    { id: 4, x: 100, y: 100, width: 50, height: 20, priority: 1 },
];

try {
    const LabelLayout = require('./label-layout.js');
    const layout = new LabelLayout();
    const result = layout.process(items);

    console.log("Input size:", items.length);
    console.log("Output size:", result.length);

    const ids = result.map(i => i.id);
    assert.ok(ids.includes(1), "High priority item 1 should be kept");
    assert.ok(!ids.includes(2), "Overlapping lower priority item 2 should be removed");
    assert.ok(ids.includes(3), "Non-overlapping item 3 should be kept");
    assert.ok(!ids.includes(4), "Overlapping item 4 should be removed");
    
    console.log("✅ Tests Passed!");
} catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        console.error("🔴 FAIL: label-layout.js not found (Expected for TDD Step 1)");
        process.exit(1);
    } else {
        console.error("🔴 FAIL:", e.message);
        process.exit(1);
    }
}
