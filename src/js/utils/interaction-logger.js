var LOG_LEVEL = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

var LOG_LEVEL_NAMES = ["NONE", "ERROR", "WARN", "INFO", "DEBUG"];

var DEFAULT_LOG_LEVEL = LOG_LEVEL.INFO;

function normalizeLevel(level) {
  if (typeof level === "string") {
    var upper = level.toUpperCase();
    if (typeof LOG_LEVEL[upper] === "number") {
      return upper;
    }
  }

  var index = typeof level === "number" ? level : DEFAULT_LOG_LEVEL;
  return LOG_LEVEL_NAMES[index] || "INFO";
}

function sanitizeValue(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function shouldLog(level, currentLevel) {
  var resolvedLevel =
    typeof level === "number" ? level : LOG_LEVEL[normalizeLevel(level)];
  var resolvedCurrent =
    typeof currentLevel === "number"
      ? currentLevel
      : LOG_LEVEL[normalizeLevel(currentLevel)];

  return resolvedLevel <= resolvedCurrent;
}

export function buildInteractionLogEntry(payload, options) {
  var opts = options || {};
  var timestamp = opts.timestamp || new Date().toISOString();
  var source = opts.source || "app";
  var level = normalizeLevel(payload.level);

  return {
    timestamp: timestamp,
    level: level,
    category: payload.category || "interaction",
    name: payload.name || "event",
    data: payload.data || {},
    source: source,
  };
}

export function formatInteractionLogEntry(entry) {
  var payload = Object.assign({}, entry.data || {});
  if (entry.source) {
    payload.source = entry.source;
  }

  var keys = Object.keys(payload).sort();
  var detail = keys
    .map(function (key) {
      return key + "=" + sanitizeValue(payload[key]);
    })
    .join(" ");

  var label = entry.category + "." + entry.name;
  var prefix =
    "[" + entry.timestamp + "] [" + entry.level + "] " + label;

  return detail ? prefix + " " + detail : prefix;
}

export function logInteraction(payload, options) {
  var opts = options || {};
  var currentLevel =
    typeof opts.currentLevel === "number"
      ? opts.currentLevel
      : typeof window !== "undefined" && window.__interactionLogLevel
        ? window.__interactionLogLevel
        : DEFAULT_LOG_LEVEL;

  if (!shouldLog(payload.level, currentLevel)) {
    return null;
  }

  var entry = buildInteractionLogEntry(payload, options);
  var line = formatInteractionLogEntry(entry);
  var method = "log";

  if (entry.level === "ERROR") {
    method = "error";
  } else if (entry.level === "WARN") {
    method = "warn";
  } else if (entry.level === "INFO") {
    method = "info";
  } else if (entry.level === "DEBUG") {
    method = "debug";
  }

  if (console && typeof console[method] === "function") {
    console[method](line);
  } else if (console && typeof console.log === "function") {
    console.log(line);
  }

  return entry;
}

export { LOG_LEVEL, DEFAULT_LOG_LEVEL };
