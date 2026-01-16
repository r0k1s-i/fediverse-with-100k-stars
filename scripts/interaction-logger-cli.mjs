#!/usr/bin/env node
import fs from "node:fs";
import { buildInteractionLogEntry, formatInteractionLogEntry } from "../src/js/utils/interaction-logger.js";

function readStdin() {
  return new Promise((resolve) => {
    var data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data.trim());
    });
  });
}

function parseArgs(argv) {
  var args = {};
  for (var i = 0; i < argv.length; i += 1) {
    var arg = argv[i];
    if (arg === "--input") {
      args.input = argv[i + 1];
      i += 1;
    } else if (arg === "--format") {
      args.format = argv[i + 1];
      i += 1;
    } else if (arg === "--level") {
      args.level = argv[i + 1];
      i += 1;
    } else if (arg === "--category") {
      args.category = argv[i + 1];
      i += 1;
    } else if (arg === "--name") {
      args.name = argv[i + 1];
      i += 1;
    } else if (arg === "--data") {
      args.data = argv[i + 1];
      i += 1;
    } else if (arg === "--source") {
      args.source = argv[i + 1];
      i += 1;
    } else if (arg === "--timestamp") {
      args.timestamp = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function parseJsonPayload(input) {
  if (!input) {
    return null;
  }
  return JSON.parse(input);
}

function normalizePayload(payload, args) {
  if (!payload) {
    payload = {};
  }
  if (args.level) payload.level = args.level;
  if (args.category) payload.category = args.category;
  if (args.name) payload.name = args.name;
  if (args.data) {
    payload.data = JSON.parse(args.data);
  }
  return payload;
}

function outputEntry(entry, format) {
  if (format === "json") {
    process.stdout.write(JSON.stringify(entry) + "\n");
    return;
  }
  process.stdout.write(formatInteractionLogEntry(entry) + "\n");
}

async function main() {
  var args = parseArgs(process.argv.slice(2));
  var format = args.format === "json" ? "json" : "text";
  var input = "";

  if (args.input) {
    input = fs.readFileSync(args.input, "utf8").trim();
  } else if (!process.stdin.isTTY) {
    input = await readStdin();
  }

  var payload = input ? parseJsonPayload(input) : null;
  var options = {
    source: args.source,
    timestamp: args.timestamp,
  };

  if (Array.isArray(payload)) {
    payload.forEach((item) => {
      var entry = buildInteractionLogEntry(
        normalizePayload(item, args),
        options,
      );
      outputEntry(entry, format);
    });
    return;
  }

  var entry = buildInteractionLogEntry(normalizePayload(payload, args), options);
  outputEntry(entry, format);
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
