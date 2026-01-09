/**
 * Fediverse Data Fetcher Library
 * 可测试的模块化函数库
 * 
 * Article I: Library-First - 所有功能作为独立库实现
 * Article II: CLI Interface - 支持 stdin/stdout
 */

const fs = require('fs');
const path = require('path');

// ========== 配置 ==========

const DEFAULT_CONFIG = {
    API_BASE: 'https://api.fedidb.org/v1/servers',
    API_LIMIT: 40,
    RATE_LIMIT: 3,
    RATE_LIMIT_WINDOW: 60000,
    FEDIDB_START: new Date('2021-03-21T00:00:00.000Z'),
    SAVE_INTERVAL: 10,
};

// ========== 工具函数 ==========

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 保存进度到文件
 */
function saveProgress(progressFile, cursor, instanceCount, pageCount) {
    const progress = {
        cursor,
        instanceCount,
        pageCount,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    return progress;
}

/**
 * 加载进度文件
 */
function loadProgress(progressFile) {
    if (!fs.existsSync(progressFile)) {
        return null;
    }
    try {
        const data = fs.readFileSync(progressFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

/**
 * 保存实例数据到文件
 */
function saveInstances(outputFile, instances) {
    fs.writeFileSync(outputFile, JSON.stringify(instances, null, 2));
    return instances.length;
}

/**
 * 从文件加载实例数据
 */
function loadInstances(inputFile) {
    if (!fs.existsSync(inputFile)) {
        return [];
    }
    try {
        const data = fs.readFileSync(inputFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// ========== 核心逻辑 ==========

/**
 * 获取单页数据
 * @param {string} url - API URL
 * @param {object} fetchOptions - fetch 选项 (用于注入 agent)
 * @returns {Promise<{servers: Array, nextCursor: string|null}>}
 */
async function fetchPage(url, fetchOptions = {}) {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
        servers: data.data || [],
        nextCursor: data.links?.next || null,
    };
}

/**
 * 构建API URL
 */
function buildApiUrl(baseUrl, limit, cursor = null) {
    if (cursor) {
        return cursor;
    }
    return `${baseUrl}?limit=${limit}`;
}

/**
 * 判断实例创建时间是否可信
 */
function isCreationTimeReliable(firstSeenAt, fedidbStartDate) {
    const firstSeen = new Date(firstSeenAt);
    return firstSeen > fedidbStartDate;
}

/**
 * 获取实例的创建时间信息
 */
function getCreationTimeInfo(instance, fedidbStartDate) {
    const firstSeen = new Date(instance.first_seen_at);
    const reliable = firstSeen > fedidbStartDate;
    
    return {
        created_at: firstSeen.toISOString(),
        source: reliable ? 'first_seen_at' : 'first_seen_at_fallback',
        reliable: reliable
    };
}

/**
 * 数据清洗 - 过滤无效实例
 */
function cleanInstances(instances) {
    return instances.filter(instance => {
        if (!instance.domain) return false;
        if (!instance.software) return false;
        return true;
    });
}

/**
 * 转换实例数据格式
 */
function transformInstance(instance, config = DEFAULT_CONFIG) {
    const creationTime = getCreationTimeInfo(instance, config.FEDIDB_START);
    
    return {
        domain: instance.domain,
        software: instance.software ? { name: instance.software.name || instance.software } : null,
        stats: {
            user_count: instance.user_count || instance.stats?.user_count || 0,
            monthly_active_users: instance.monthly_active_users || instance.stats?.monthly_active_users || 0,
            status_count: instance.status_count || instance.stats?.status_count || 0,
        },
        first_seen_at: instance.first_seen_at,
        creation_time: creationTime,
    };
}

/**
 * 批量转换实例
 */
function transformInstances(instances, config = DEFAULT_CONFIG) {
    return instances.map(inst => transformInstance(inst, config));
}

/**
 * 计算限流等待时间
 */
function calculateRateLimitWait(requestCount, rateLimit, rateLimitWindow) {
    if (requestCount > 0 && requestCount % rateLimit === 0) {
        return rateLimitWindow;
    }
    return 0;
}

/**
 * 检查是否需要保存进度
 */
function shouldSaveProgress(pageCount, saveInterval) {
    return pageCount % saveInterval === 0;
}

// ========== 导出 ==========

module.exports = {
    // 配置
    DEFAULT_CONFIG,
    
    // 工具函数
    sleep,
    saveProgress,
    loadProgress,
    saveInstances,
    loadInstances,
    
    // 核心逻辑
    fetchPage,
    buildApiUrl,
    isCreationTimeReliable,
    getCreationTimeInfo,
    cleanInstances,
    transformInstance,
    transformInstances,
    calculateRateLimitWait,
    shouldSaveProgress,
};
