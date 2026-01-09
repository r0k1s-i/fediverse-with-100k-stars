const lib = require('./fetch-fediverse-data.lib.js');
const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '__test_temp__');

beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    }
});

afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
});

describe('buildApiUrl', () => {
    test('returns cursor when provided', () => {
        const cursor = 'https://api.fedidb.org/v1/servers?cursor=abc123';
        expect(lib.buildApiUrl('https://api.fedidb.org/v1/servers', 40, cursor)).toBe(cursor);
    });

    test('builds URL with limit when no cursor', () => {
        const result = lib.buildApiUrl('https://api.fedidb.org/v1/servers', 40, null);
        expect(result).toBe('https://api.fedidb.org/v1/servers?limit=40');
    });
});

describe('isCreationTimeReliable', () => {
    const fedidbStart = new Date('2021-03-21T00:00:00.000Z');

    test('returns true for dates after FediDB start', () => {
        expect(lib.isCreationTimeReliable('2022-01-01T00:00:00.000Z', fedidbStart)).toBe(true);
    });

    test('returns false for dates before FediDB start', () => {
        expect(lib.isCreationTimeReliable('2020-01-01T00:00:00.000Z', fedidbStart)).toBe(false);
    });

    test('returns false for exact FediDB start date', () => {
        expect(lib.isCreationTimeReliable('2021-03-21T00:00:00.000Z', fedidbStart)).toBe(false);
    });
});

describe('getCreationTimeInfo', () => {
    const fedidbStart = new Date('2021-03-21T00:00:00.000Z');

    test('marks reliable for post-FediDB instances', () => {
        const instance = { first_seen_at: '2022-06-15T10:30:00.000Z' };
        const result = lib.getCreationTimeInfo(instance, fedidbStart);
        
        expect(result.reliable).toBe(true);
        expect(result.source).toBe('first_seen_at');
        expect(result.created_at).toBe('2022-06-15T10:30:00.000Z');
    });

    test('marks unreliable for pre-FediDB instances', () => {
        const instance = { first_seen_at: '2018-01-01T00:00:00.000Z' };
        const result = lib.getCreationTimeInfo(instance, fedidbStart);
        
        expect(result.reliable).toBe(false);
        expect(result.source).toBe('first_seen_at_fallback');
    });
});

describe('cleanInstances', () => {
    test('filters out instances without domain', () => {
        const instances = [
            { domain: 'mastodon.social', software: 'Mastodon' },
            { software: 'Mastodon' },
            { domain: '', software: 'Mastodon' },
        ];
        const result = lib.cleanInstances(instances);
        expect(result).toHaveLength(1);
        expect(result[0].domain).toBe('mastodon.social');
    });

    test('filters out instances without software', () => {
        const instances = [
            { domain: 'mastodon.social', software: 'Mastodon' },
            { domain: 'test.instance', software: null },
            { domain: 'another.instance' },
        ];
        const result = lib.cleanInstances(instances);
        expect(result).toHaveLength(1);
    });

    test('returns empty array for empty input', () => {
        expect(lib.cleanInstances([])).toEqual([]);
    });
});

describe('transformInstance', () => {
    test('transforms API response to internal format', () => {
        const apiInstance = {
            domain: 'mastodon.social',
            software: { name: 'Mastodon' },
            user_count: 1000000,
            monthly_active_users: 50000,
            status_count: 5000000,
            first_seen_at: '2022-01-01T00:00:00.000Z',
        };
        
        const result = lib.transformInstance(apiInstance);
        
        expect(result.domain).toBe('mastodon.social');
        expect(result.software.name).toBe('Mastodon');
        expect(result.stats.user_count).toBe(1000000);
        expect(result.stats.monthly_active_users).toBe(50000);
        expect(result.creation_time).toBeDefined();
    });

    test('handles missing stats gracefully', () => {
        const apiInstance = {
            domain: 'test.instance',
            software: { name: 'Pleroma' },
            first_seen_at: '2022-01-01T00:00:00.000Z',
        };
        
        const result = lib.transformInstance(apiInstance);
        
        expect(result.stats.user_count).toBe(0);
        expect(result.stats.monthly_active_users).toBe(0);
    });
});

describe('calculateRateLimitWait', () => {
    test('returns wait time at rate limit boundary', () => {
        expect(lib.calculateRateLimitWait(3, 3, 60000)).toBe(60000);
        expect(lib.calculateRateLimitWait(6, 3, 60000)).toBe(60000);
        expect(lib.calculateRateLimitWait(9, 3, 60000)).toBe(60000);
    });

    test('returns 0 when not at boundary', () => {
        expect(lib.calculateRateLimitWait(1, 3, 60000)).toBe(0);
        expect(lib.calculateRateLimitWait(2, 3, 60000)).toBe(0);
        expect(lib.calculateRateLimitWait(4, 3, 60000)).toBe(0);
    });

    test('returns 0 for first request', () => {
        expect(lib.calculateRateLimitWait(0, 3, 60000)).toBe(0);
    });
});

describe('shouldSaveProgress', () => {
    test('returns true at save interval', () => {
        expect(lib.shouldSaveProgress(10, 10)).toBe(true);
        expect(lib.shouldSaveProgress(20, 10)).toBe(true);
    });

    test('returns false between intervals', () => {
        expect(lib.shouldSaveProgress(1, 10)).toBe(false);
        expect(lib.shouldSaveProgress(5, 10)).toBe(false);
        expect(lib.shouldSaveProgress(15, 10)).toBe(false);
    });
});

describe('saveProgress and loadProgress', () => {
    const progressFile = path.join(TEST_DIR, 'progress.json');

    afterEach(() => {
        if (fs.existsSync(progressFile)) {
            fs.unlinkSync(progressFile);
        }
    });

    test('saves and loads progress correctly', () => {
        const cursor = 'https://api.fedidb.org/v1/servers?cursor=test';
        lib.saveProgress(progressFile, cursor, 100, 5);
        
        const loaded = lib.loadProgress(progressFile);
        
        expect(loaded.cursor).toBe(cursor);
        expect(loaded.instanceCount).toBe(100);
        expect(loaded.pageCount).toBe(5);
        expect(loaded.timestamp).toBeDefined();
    });

    test('returns null for non-existent file', () => {
        expect(lib.loadProgress('/nonexistent/path.json')).toBeNull();
    });
});

describe('saveInstances and loadInstances', () => {
    const instancesFile = path.join(TEST_DIR, 'instances.json');

    afterEach(() => {
        if (fs.existsSync(instancesFile)) {
            fs.unlinkSync(instancesFile);
        }
    });

    test('saves and loads instances correctly', () => {
        const instances = [
            { domain: 'test1.social', software: { name: 'Mastodon' } },
            { domain: 'test2.social', software: { name: 'Pleroma' } },
        ];
        
        lib.saveInstances(instancesFile, instances);
        const loaded = lib.loadInstances(instancesFile);
        
        expect(loaded).toHaveLength(2);
        expect(loaded[0].domain).toBe('test1.social');
    });

    test('returns empty array for non-existent file', () => {
        expect(lib.loadInstances('/nonexistent/path.json')).toEqual([]);
    });
});

describe('transformInstances', () => {
    test('transforms multiple instances', () => {
        const instances = [
            { domain: 'a.social', software: { name: 'Mastodon' }, first_seen_at: '2022-01-01T00:00:00.000Z' },
            { domain: 'b.social', software: { name: 'Pleroma' }, first_seen_at: '2022-06-01T00:00:00.000Z' },
        ];
        
        const result = lib.transformInstances(instances);
        
        expect(result).toHaveLength(2);
        expect(result[0].creation_time).toBeDefined();
        expect(result[1].creation_time).toBeDefined();
    });
});
