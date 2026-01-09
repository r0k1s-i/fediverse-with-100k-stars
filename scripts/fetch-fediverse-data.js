/**
 * Fediverse数据获取脚本
 * 从FediDB API抓取所有实例数据
 *
 * 使用方法:
 *   node scripts/fetch-fediverse-data.js [--limit=100] [--resume]
 *
 * 参数:
 *   --limit=N   限制抓取N个实例（测试用）
 *   --resume    从上次中断处继续（断点续传）
 *
 * 特性:
 *   - 增量保存：每10页自动保存，防止数据丢失
 *   - 断点续传：支持中断后继续抓取
 *   - 限流保护：3次/分钟，符合API限制
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");

const PROXY_URL = "http://127.0.0.1:7890";
const proxyAgent = new HttpsProxyAgent(PROXY_URL);
const fetchOptions = { agent: proxyAgent };

const CONFIG = {
  API_BASE: "https://api.fedidb.org/v1/servers",
  API_LIMIT: 40,
  RATE_LIMIT: 3,
  RATE_LIMIT_WINDOW: 60000,
  FEDIDB_START: new Date("2021-03-21T00:00:00.000Z"),

  OUTPUT_RAW: path.join(__dirname, "../data/fediverse_raw.json"),
  OUTPUT_LOG: path.join(__dirname, "../data/fetch_log.json"),
  OUTPUT_PROGRESS: path.join(__dirname, "../data/fetch_progress.json"),

  SAVE_INTERVAL: 10, // 每10页保存一次
};

// ========== 工具函数 ==========

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveProgress(cursor, instanceCount, pageCount) {
  const progress = {
    cursor,
    instanceCount,
    pageCount,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG.OUTPUT_PROGRESS, JSON.stringify(progress, null, 2));
}

function loadProgress() {
  if (!fs.existsSync(CONFIG.OUTPUT_PROGRESS)) {
    return null;
  }
  try {
    const data = fs.readFileSync(CONFIG.OUTPUT_PROGRESS, "utf8");
    return JSON.parse(data);
  } catch (error) {
    log("⚠️ 进度文件损坏，从头开始", { error: error.message });
    return null;
  }
}

function saveInstances(instances) {
  fs.writeFileSync(CONFIG.OUTPUT_RAW, JSON.stringify(instances, null, 2));
  log(`💾 已保存 ${instances.length} 个实例到磁盘`);
}

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, message, data };
  console.log(`[${timestamp}] ${message}`, data || "");

  // 追加到日志文件
  if (!fs.existsSync(CONFIG.OUTPUT_LOG)) {
    fs.writeFileSync(CONFIG.OUTPUT_LOG, JSON.stringify([logEntry], null, 2));
  } else {
    const logs = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_LOG, "utf8"));
    logs.push(logEntry);
    fs.writeFileSync(CONFIG.OUTPUT_LOG, JSON.stringify(logs, null, 2));
  }
}

// ========== 主逻辑 ==========

/**
 * 从FediDB API获取单页数据
 */
async function fetchPage(cursor = null) {
  let url;
  if (cursor) {
    url = cursor;
  } else {
    url = `${CONFIG.API_BASE}?limit=${CONFIG.API_LIMIT}`;
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      servers: data.data || [],
      nextCursor: data.links?.next || null,
    };
  } catch (error) {
    log("请求失败", { url, error: error.message });
    throw error;
  }
}

/**
 * 获取实例的真实创建时间
 * 多级fallback策略
 */
async function getInstanceCreationTime(instance) {
  const firstSeen = new Date(instance.first_seen_at);

  // 1. 如果first_seen_at在FediDB开始记录之后，认为可信
  if (firstSeen > CONFIG.FEDIDB_START) {
    return {
      created_at: firstSeen.toISOString(),
      source: "first_seen_at",
      reliable: true,
    };
  }

  // 2. 否则尝试查询实例API
  try {
    const apiUrl = `https://${instance.domain}/api/v1/instance`;
    const response = await fetch(apiUrl, {
      timeout: 5000,
      headers: {
        "User-Agent": "FediverseUniverseViz/1.0",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // 尝试获取管理员账户创建时间
    if (
      data.contact &&
      data.contact.account &&
      data.contact.account.created_at
    ) {
      return {
        created_at: data.contact.account.created_at,
        source: "admin_account",
        reliable: true,
      };
    }

    // fallback
    return {
      created_at: firstSeen.toISOString(),
      source: "first_seen_at_fallback",
      reliable: false,
    };
  } catch (error) {
    // 3. API失败，使用first_seen_at作为最终fallback
    return {
      created_at: firstSeen.toISOString(),
      source: "first_seen_at_fallback",
      reliable: false,
      error: error.message,
    };
  }
}

/**
 * 获取所有实例数据（支持增量保存和断点续传）
 */
async function fetchAllInstances(limit = null, resume = false) {
  let allInstances = [];
  let cursor = null;
  let requestCount = 0;
  let pageCount = 0;

  // 尝试从进度文件恢复
  if (resume) {
    const progress = loadProgress();
    if (progress) {
      log("🔄 检测到未完成的抓取，尝试恢复...");

      // 加载已保存的数据
      if (fs.existsSync(CONFIG.OUTPUT_RAW)) {
        const savedData = JSON.parse(
          fs.readFileSync(CONFIG.OUTPUT_RAW, "utf8"),
        );
        allInstances = savedData;
        cursor = progress.cursor;
        pageCount = progress.pageCount;
        log(
          `✅ 已恢复：${allInstances.length} 个实例，从第 ${pageCount + 1} 页继续`,
        );
      } else {
        log("⚠️ 未找到已保存数据，从头开始");
      }
    } else {
      log("ℹ️ 无进度记录，开始新抓取");
    }
  }

  log("开始抓取Fediverse实例数据");

  do {
    // 限流控制
    if (requestCount > 0 && requestCount % CONFIG.RATE_LIMIT === 0) {
      log(`已请求 ${requestCount} 次，等待60秒（限流保护）...`);
      await sleep(CONFIG.RATE_LIMIT_WINDOW);
    }

    // 获取当前页
    pageCount++;
    log(`请求第 ${pageCount} 页`, { cursor });

    const { servers, nextCursor } = await fetchPage(cursor);
    requestCount++;

    allInstances.push(...servers);
    cursor = nextCursor;

    log(`已获取 ${allInstances.length} 个实例`);

    // 增量保存（每 N 页保存一次）
    if (pageCount % CONFIG.SAVE_INTERVAL === 0) {
      saveInstances(allInstances);
      saveProgress(cursor, allInstances.length, pageCount);
    }

    // 如果设置了limit，检查是否达到
    if (limit && allInstances.length >= limit) {
      log(`达到限制 ${limit}，停止抓取`);
      break;
    }

    // 短暂延迟，避免过快请求
    await sleep(1000);
  } while (cursor !== null);

  log(`✅ 抓取完成！总计 ${allInstances.length} 个实例`);

  // 最终保存
  saveInstances(allInstances);
  saveProgress(null, allInstances.length, pageCount);

  return allInstances;
}

/**
 * 批量获取创建时间（带进度显示）
 */
async function enrichWithCreationTime(instances, batchSize = 10) {
  log(`开始获取 ${instances.length} 个实例的创建时间`);

  const enriched = [];
  const total = instances.length;

  for (let i = 0; i < instances.length; i += batchSize) {
    const batch = instances.slice(i, i + batchSize);

    // 并发获取（但控制并发数）
    const results = await Promise.all(
      batch.map(async (instance) => {
        const timeInfo = await getInstanceCreationTime(instance);
        return {
          ...instance,
          creation_time: timeInfo,
        };
      }),
    );

    enriched.push(...results);

    const progress = Math.floor((enriched.length / total) * 100);
    log(`进度: ${enriched.length}/${total} (${progress}%)`);

    // 每批次后短暂延迟
    await sleep(500);
  }

  // 统计
  const reliable = enriched.filter((i) => i.creation_time.reliable).length;
  const unreliable = enriched.length - reliable;

  log("创建时间获取完成", {
    total: enriched.length,
    reliable: reliable,
    unreliable: unreliable,
    reliablePercent: Math.floor((reliable / enriched.length) * 100) + "%",
  });

  return enriched;
}

/**
 * 数据清洗
 */
function cleanData(instances) {
  log("开始数据清洗");

  const cleaned = instances.filter((instance) => {
    // 过滤条件
    if (!instance.domain) return false;
    if (!instance.software) return false;
    if (instance.total_users < 0) return false;

    return true;
  });

  log(`清洗完成: ${instances.length} → ${cleaned.length} 个实例`);

  return cleaned;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const limitArg = args.find((arg) => arg.startsWith("--limit="));
    const limit = limitArg ? parseInt(limitArg.split("=")[1]) : null;
    const resume = args.includes("--resume");

    if (limit) {
      log(`运行模式: 测试（限制 ${limit} 个实例）`);
    } else {
      log("运行模式: 完整抓取（预计5.5小时）");
    }

    if (resume) {
      log("启用断点续传模式");
    }

    // 1. 抓取基础数据
    const rawInstances = await fetchAllInstances(limit, resume);

    // 2. 数据清洗
    const cleanedInstances = cleanData(rawInstances);

    // 3. 获取创建时间（仅前100个或限制数量，避免耗时太久）
    const enrichLimit = limit ? Math.min(limit, 100) : 100;
    const toEnrich = cleanedInstances.slice(0, enrichLimit);
    const enriched = await enrichWithCreationTime(toEnrich);

    // 4. 合并数据
    const finalData = cleanedInstances.map((instance) => {
      const enrichedItem = enriched.find((e) => e.domain === instance.domain);
      return enrichedItem || instance;
    });

    // 5. 保存结果
    saveInstances(finalData);

    // 清理进度文件（已完成）
    if (fs.existsSync(CONFIG.OUTPUT_PROGRESS)) {
      fs.unlinkSync(CONFIG.OUTPUT_PROGRESS);
      log("🧹 已清理进度文件");
    }

    log(`✅ 数据已保存到: ${CONFIG.OUTPUT_RAW}`);
    log("统计信息", {
      total: finalData.length,
      withCreationTime: enriched.length,
      softwareTypes: [...new Set(finalData.map((i) => i.software))].length,
    });
  } catch (error) {
    log("❌ 错误", { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 运行
main();
