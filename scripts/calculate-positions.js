/**
 * Fediverse Instance Position Calculator
 * 
 * Layout Strategy: Three-body system (top 3 Mastodon) + Multi-galaxy cluster
 * 
 * Structure:
 *   - Mastodon Top 3: Equilateral triangle at center (three-star system)
 *     - mastodon.social: (0, 0, 0)
 *     - pawoo.net: (8000, 0, 0) 
 *     - mastodon.cloud: (4000, 6928, 0)
 *   - Other Mastodon instances: Orbit around nearest of the 3
 *   - Other software: 66+ independent galaxies positioned around
 *   - Each galaxy: Largest instance at center, others orbit based on user count
 * 
 * Usage:
 *   node scripts/calculate-positions.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
    INPUT: path.join(__dirname, '../data/fediverse_with_colors.json'),
    OUTPUT: path.join(__dirname, '../data/fediverse_final.json'),
    
    // Three-body system configuration (top 3 Mastodon instances)
    THREE_STAR_EDGE: 8000,
    TOP_MASTODON_DOMAINS: ['mastodon.social', 'pawoo.net', 'mastodon.cloud'],
    
    // Galaxy positioning
    GALAXY_RING_RADIUS: 25000,      // Distance from center for software galaxy centers
    GALAXY_RING_COUNT: 4,            // Number of concentric rings for galaxies
    GALAXY_MAX_RADIUS: 5000,         // Max spread within a single galaxy
    
    // Instance orbital positioning
    DISTANCE_BASE: 500,              // Minimum distance from center
    DISTANCE_LOG_MULTIPLIER: 300,    // Logarithmic distance factor
    MAX_USER_COUNT: 3000000,         // Reference for normalization (mastodon.social)
};

// ========== Utility Functions ==========

function domainHash(domain) {
    const hash = crypto.createHash('md5').update(domain).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
}

function logScale(value, max) {
    if (value <= 0) return 0;
    return Math.log(value + 1) / Math.log(max + 1);
}

// ========== Position Calculators ==========

/**
 * Get positions for the three-star Mastodon system
 * Forms an equilateral triangle at the universe center
 */
function getThreeStarPositions() {
    const edge = CONFIG.THREE_STAR_EDGE;
    const height = edge * Math.sqrt(3) / 2;
    
    return {
        'mastodon.social': { x: 0, y: 0, z: 0 },
        'pawoo.net': { x: edge, y: 0, z: 0 },
        'mastodon.cloud': { x: edge / 2, y: height, z: 0 }
    };
}

/**
 * Calculate orbital position within a galaxy
 * Uses user count for distance, domain hash for angle
 */
function calculateOrbitalPosition(instance, centerX, centerY, centerZ, maxRadius) {
    const userCount = instance.stats?.user_count || 1;
    const hash = domainHash(instance.domain);
    
    // Distance: smaller instances further from center (inverse log)
    const userNorm = logScale(userCount, CONFIG.MAX_USER_COUNT);
    const distance = CONFIG.DISTANCE_BASE + (1 - userNorm) * maxRadius;
    
    // Angle from domain hash (0 to 2π)
    const theta = hash * 2 * Math.PI;
    
    // Add Z variation for 3D depth
    const phi = (domainHash(instance.domain + '_z') - 0.5) * Math.PI * 0.5;
    
    return {
        x: centerX + distance * Math.cos(theta) * Math.cos(phi),
        y: centerY + distance * Math.sin(theta) * Math.cos(phi),
        z: centerZ + distance * Math.sin(phi)
    };
}

/**
 * Find nearest of the three Mastodon stars for other Mastodon instances
 */
function findNearestThreeStar(instances, instance, threeStarPositions) {
    const threeStars = CONFIG.TOP_MASTODON_DOMAINS;
    
    // Use domain hash to distribute evenly among three stars
    const hash = domainHash(instance.domain);
    const starIndex = Math.floor(hash * 3) % 3;
    const nearestStar = threeStars[starIndex];
    
    return threeStarPositions[nearestStar];
}

/**
 * Calculate galaxy center positions for each software type
 * Arranges in concentric rings around the Mastodon three-star system
 */
function calculateGalaxyCenters(softwareList) {
    const centers = {};
    const ringRadius = CONFIG.GALAXY_RING_RADIUS;
    const rings = CONFIG.GALAXY_RING_COUNT;
    
    softwareList.forEach((software, index) => {
        // Determine which ring (0 = closest to center)
        const ring = Math.floor(index / 12) % rings;
        const posInRing = index % 12;
        const angleOffset = ring * 0.2; // Stagger rings
        
        const radius = ringRadius + (ring * ringRadius * 0.7);
        const angle = (posInRing / 12) * 2 * Math.PI + angleOffset;
        
        // Add Z variation per ring
        const zOffset = (ring % 2 === 0 ? 1 : -1) * ring * 2000;
        
        centers[software] = {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
            z: zOffset
        };
    });
    
    return centers;
}

// ========== Main Processing ==========

async function main() {
    console.log('🌌 Fediverse Position Calculator');
    console.log('=================================\n');
    
    if (!fs.existsSync(CONFIG.INPUT)) {
        console.error(`❌ Input file not found: ${CONFIG.INPUT}`);
        console.error('   Run calculate-colors.js first');
        process.exit(1);
    }
    
    let instances = JSON.parse(fs.readFileSync(CONFIG.INPUT, 'utf8'));
    
    const seenDomains = new Set();
    instances = instances.filter(inst => {
        if (seenDomains.has(inst.domain)) return false;
        seenDomains.add(inst.domain);
        return true;
    });
    
    console.log(`📊 Loaded ${instances.length} unique instances\n`);
    
    // Get three-star positions
    const threeStarPositions = getThreeStarPositions();
    
    // Group instances by software
    const bySoftware = {};
    for (const inst of instances) {
        const sw = inst.software?.name || 'Unknown';
        if (!bySoftware[sw]) bySoftware[sw] = [];
        bySoftware[sw].push(inst);
    }
    
    // Sort software by total user count (largest software types get prime positions)
    const softwareList = Object.keys(bySoftware)
        .filter(sw => sw !== 'Mastodon')
        .sort((a, b) => {
            const usersA = bySoftware[a].reduce((sum, i) => sum + (i.stats?.user_count || 0), 0);
            const usersB = bySoftware[b].reduce((sum, i) => sum + (i.stats?.user_count || 0), 0);
            return usersB - usersA;
        });
    
    // Calculate galaxy centers for non-Mastodon software
    const galaxyCenters = calculateGalaxyCenters(softwareList);
    
    console.log(`📍 Galaxy Centers:`);
    console.log(`   Mastodon: Three-star system at center`);
    for (const sw of softwareList.slice(0, 5)) {
        const c = galaxyCenters[sw];
        console.log(`   ${sw}: (${Math.round(c.x)}, ${Math.round(c.y)}, ${Math.round(c.z)})`);
    }
    console.log('');
    
    // Calculate positions for all instances
    const withPositions = instances.map(instance => {
        const sw = instance.software?.name || 'Unknown';
        let position;
        let positionType;
        
        if (CONFIG.TOP_MASTODON_DOMAINS.includes(instance.domain)) {
            // Top 3 Mastodon: fixed triangle positions
            position = threeStarPositions[instance.domain];
            positionType = 'three_star_center';
        } else if (sw === 'Mastodon') {
            // Other Mastodon: orbit around one of the three stars
            const nearestStar = findNearestThreeStar(instances, instance, threeStarPositions);
            position = calculateOrbitalPosition(
                instance, 
                nearestStar.x, 
                nearestStar.y, 
                nearestStar.z,
                CONFIG.THREE_STAR_EDGE * 0.4
            );
            positionType = 'mastodon_orbital';
        } else if (galaxyCenters[sw]) {
            // Other software: position in their galaxy
            const center = galaxyCenters[sw];
            
            // Sort by user count to find if this is the galaxy center
            const swInstances = bySoftware[sw];
            swInstances.sort((a, b) => (b.stats?.user_count || 0) - (a.stats?.user_count || 0));
            
            if (swInstances[0].domain === instance.domain) {
                // Largest instance is galaxy center
                position = { ...center };
                positionType = 'galaxy_center';
            } else {
                // Orbital position
                position = calculateOrbitalPosition(
                    instance,
                    center.x,
                    center.y,
                    center.z,
                    CONFIG.GALAXY_MAX_RADIUS
                );
                positionType = 'galaxy_orbital';
            }
        } else {
            // Fallback: random position in outer rim
            const hash = domainHash(instance.domain);
            const angle = hash * 2 * Math.PI;
            const distance = 50000 + hash * 10000;
            position = {
                x: distance * Math.cos(angle),
                y: distance * Math.sin(angle),
                z: (domainHash(instance.domain + '_z') - 0.5) * 5000
            };
            positionType = 'outer_rim';
        }
        
        return {
            ...instance,
            position: {
                x: Math.round(position.x * 10) / 10,
                y: Math.round(position.y * 10) / 10,
                z: Math.round(position.z * 10) / 10
            },
            positionType
        };
    });
    
    // Save result
    fs.writeFileSync(CONFIG.OUTPUT, JSON.stringify(withPositions, null, 2));
    console.log(`✅ Saved to: ${CONFIG.OUTPUT}\n`);
    
    // Statistics
    const byType = {};
    for (const inst of withPositions) {
        byType[inst.positionType] = (byType[inst.positionType] || 0) + 1;
    }
    
    console.log('📊 Position Type Distribution:');
    for (const [type, count] of Object.entries(byType)) {
        console.log(`   ${type}: ${count}`);
    }
    
    // Bounds
    const xs = withPositions.map(i => i.position.x);
    const ys = withPositions.map(i => i.position.y);
    const zs = withPositions.map(i => i.position.z);
    
    console.log(`\n📐 Universe Bounds:`);
    console.log(`   X: ${Math.min(...xs).toFixed(0)} to ${Math.max(...xs).toFixed(0)}`);
    console.log(`   Y: ${Math.min(...ys).toFixed(0)} to ${Math.max(...ys).toFixed(0)}`);
    console.log(`   Z: ${Math.min(...zs).toFixed(0)} to ${Math.max(...zs).toFixed(0)}`);
    
    // Sample positions
    console.log(`\n📋 Sample Positions:`);
    for (const inst of withPositions.slice(0, 8)) {
        const p = inst.position;
        console.log(`   ${inst.domain.padEnd(25)} (${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)}) [${inst.positionType}]`);
    }
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
