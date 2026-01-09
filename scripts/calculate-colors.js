/**
 * Fediverse Instance Color Calculator
 * 
 * Algorithm: Logarithmic age mapping + Era weighting + Domain hash perturbation
 * 
 * Color components:
 *   - Hue (0-360°): Based on instance age (young=blue 240°, old=red 0°)
 *     + Domain hash perturbation ±30°
 *     + Era offset (pre-2019: -20°, post-2024: +20°)
 *   - Saturation (40-90%): Based on user count (log scale)
 *   - Lightness (30-75%): Based on activity (MAU/total users ratio)
 * 
 * Usage:
 *   node scripts/calculate-colors.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ========== Configuration ==========
const CONFIG = {
    INPUT: path.join(__dirname, '../data/fediverse_raw.json'),
    OUTPUT: path.join(__dirname, '../data/fediverse_with_colors.json'),
    
    // Fediverse genesis date (Mastodon first release)
    GENESIS_DATE: new Date('2016-11-23T00:00:00.000Z'),
    
    // Era boundaries for color offsets
    ERA_PRE_2019: new Date('2019-01-01T00:00:00.000Z'),
    ERA_POST_2024: new Date('2024-01-01T00:00:00.000Z'),
    
    // Color ranges
    HUE_YOUNG: 240,           // Blue for young instances
    HUE_OLD: 0,               // Red for old instances
    DOMAIN_HASH_RANGE: 30,    // ±30° perturbation
    ERA_PRE_2019_OFFSET: -20, // Shift toward red
    ERA_POST_2024_OFFSET: 20, // Shift toward blue
    
    SATURATION_MIN: 40,
    SATURATION_MAX: 90,
    
    LIGHTNESS_MIN: 30,
    LIGHTNESS_MAX: 75,
};

// ========== Utility Functions ==========

/**
 * Generate deterministic hash from domain name
 * @returns {number} Value between 0 and 1
 */
function domainHash(domain) {
    const hash = crypto.createHash('md5').update(domain).digest('hex');
    // Use first 8 chars of hash as number
    const num = parseInt(hash.substring(0, 8), 16);
    return num / 0xFFFFFFFF; // Normalize to 0-1
}

/**
 * Calculate age in days from creation date to now
 */
function getAgeDays(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    return (now - created) / (1000 * 60 * 60 * 24);
}

/**
 * Calculate maximum possible age (from genesis to now)
 */
function getMaxAgeDays() {
    const now = new Date();
    return (now - CONFIG.GENESIS_DATE) / (1000 * 60 * 60 * 24);
}

/**
 * Logarithmic normalization for age
 * Compresses long tail while preserving early differences
 */
function logNormalize(value, max) {
    if (value <= 0) return 0;
    if (max <= 0) return 1;
    return Math.log(value + 1) / Math.log(max + 1);
}

/**
 * Calculate era offset based on creation date
 */
function getEraOffset(createdAt) {
    const created = new Date(createdAt);
    
    if (created < CONFIG.ERA_PRE_2019) {
        return CONFIG.ERA_PRE_2019_OFFSET; // Shift toward red (veterans)
    } else if (created >= CONFIG.ERA_POST_2024) {
        return CONFIG.ERA_POST_2024_OFFSET; // Shift toward blue (newcomers)
    }
    return 0; // Standard era
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ========== Main Color Algorithm ==========

/**
 * Calculate color for a single instance
 */
function calculateInstanceColor(instance) {
    // Get creation date
    const createdAt = instance.creation_time?.created_at || instance.first_seen_at;
    const created = new Date(createdAt);
    
    // 1. Calculate HUE (age-based + hash perturbation + era offset)
    const ageDays = getAgeDays(createdAt);
    const maxAgeDays = getMaxAgeDays();
    const ageNorm = logNormalize(ageDays, maxAgeDays); // 0 (young) to 1 (old)
    
    // Map age to hue: young (0) = blue (240), old (1) = red (0)
    let hue = CONFIG.HUE_YOUNG - (ageNorm * (CONFIG.HUE_YOUNG - CONFIG.HUE_OLD));
    
    // Add domain hash perturbation (±30°)
    const hashValue = domainHash(instance.domain);
    const perturbation = (hashValue - 0.5) * 2 * CONFIG.DOMAIN_HASH_RANGE;
    hue += perturbation;
    
    // Add era offset
    hue += getEraOffset(createdAt);
    
    // Normalize hue to 0-360
    hue = ((hue % 360) + 360) % 360;
    
    // 2. Calculate SATURATION (user count based)
    const userCount = instance.stats?.user_count || 0;
    const maxUsers = 3000000; // mastodon.social scale
    const userNorm = logNormalize(userCount, maxUsers);
    const saturation = CONFIG.SATURATION_MIN + 
        (userNorm * (CONFIG.SATURATION_MAX - CONFIG.SATURATION_MIN));
    
    // 3. Calculate LIGHTNESS (activity based)
    const mau = instance.stats?.monthly_active_users || 0;
    const totalUsers = instance.stats?.user_count || 1;
    const activityRatio = Math.min(mau / totalUsers, 1); // Cap at 100%
    const lightness = CONFIG.LIGHTNESS_MIN + 
        (activityRatio * (CONFIG.LIGHTNESS_MAX - CONFIG.LIGHTNESS_MIN));
    
    // Convert to RGB and hex
    const rgb = hslToRgb(hue, saturation, lightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    
    return {
        hsl: {
            h: Math.round(hue * 10) / 10,
            s: Math.round(saturation * 10) / 10,
            l: Math.round(lightness * 10) / 10
        },
        rgb,
        hex,
        debug: {
            ageDays: Math.round(ageDays),
            ageNorm: Math.round(ageNorm * 1000) / 1000,
            hashPerturbation: Math.round(perturbation * 10) / 10,
            eraOffset: getEraOffset(createdAt),
            userNorm: Math.round(userNorm * 1000) / 1000,
            activityRatio: Math.round(activityRatio * 1000) / 1000
        }
    };
}

// ========== Main Function ==========

async function main() {
    console.log('🎨 Fediverse Color Calculator');
    console.log('=============================\n');
    
    // Load data
    if (!fs.existsSync(CONFIG.INPUT)) {
        console.error(`❌ Input file not found: ${CONFIG.INPUT}`);
        console.error('   Run fetch-fediverse-data.js first');
        process.exit(1);
    }
    
    const instances = JSON.parse(fs.readFileSync(CONFIG.INPUT, 'utf8'));
    console.log(`📊 Loaded ${instances.length} instances\n`);
    
    // Calculate colors
    const withColors = instances.map(instance => {
        const color = calculateInstanceColor(instance);
        return {
            ...instance,
            color
        };
    });
    
    // Save result
    fs.writeFileSync(CONFIG.OUTPUT, JSON.stringify(withColors, null, 2));
    console.log(`✅ Saved to: ${CONFIG.OUTPUT}\n`);
    
    // Print sample results
    console.log('📋 Sample Results:');
    console.log('─'.repeat(80));
    
    const samples = withColors.slice(0, 10);
    for (const inst of samples) {
        const sw = inst.software?.name || 'Unknown';
        const age = inst.color.debug.ageDays;
        const hue = inst.color.hsl.h;
        
        console.log(`${inst.domain.padEnd(30)} ${sw.padEnd(12)} Age:${String(age).padStart(5)}d  Hue:${String(hue).padStart(6)}° ${inst.color.hex}`);
    }
    
    console.log('─'.repeat(80));
    
    // Statistics
    const hues = withColors.map(i => i.color.hsl.h);
    const minHue = Math.min(...hues);
    const maxHue = Math.max(...hues);
    const avgHue = hues.reduce((a, b) => a + b, 0) / hues.length;
    
    console.log(`\n📈 Hue Statistics:`);
    console.log(`   Min: ${minHue.toFixed(1)}°  Max: ${maxHue.toFixed(1)}°  Avg: ${avgHue.toFixed(1)}°`);
    
    // Group by software
    const bySoftware = {};
    for (const inst of withColors) {
        const sw = inst.software?.name || 'Unknown';
        if (!bySoftware[sw]) bySoftware[sw] = [];
        bySoftware[sw].push(inst.color.hsl.h);
    }
    
    console.log(`\n📊 Hue Range by Software (showing hash variation):`);
    for (const [sw, hueList] of Object.entries(bySoftware).slice(0, 8)) {
        const min = Math.min(...hueList);
        const max = Math.max(...hueList);
        const range = max - min;
        console.log(`   ${sw.padEnd(15)} ${min.toFixed(1)}° - ${max.toFixed(1)}°  (range: ${range.toFixed(1)}°)`);
    }
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
