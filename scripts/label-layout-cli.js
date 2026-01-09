#!/usr/bin/env node

const LabelLayout = require('./label-layout.js');
const fs = require('fs');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
    try {
        const input = JSON.parse(Buffer.concat(chunks).toString());
        if (!Array.isArray(input)) {
            throw new Error("Input must be a JSON array");
        }

        const layout = new LabelLayout();
        const result = layout.process(input);

        process.stdout.write(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
});
