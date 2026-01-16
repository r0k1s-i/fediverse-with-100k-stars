#!/usr/bin/env node
import fs from "node:fs";
import { shouldZoomOnClick } from "../src/js/utils/interaction-zoom.js";

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
    } else if (arg === "--data") {
      args.data = argv[i + 1];
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

function outputResult(result, format) {
  if (format === "json") {
    process.stdout.write(JSON.stringify({ shouldZoom: result }) + "\n");
    return;
  }
  process.stdout.write(String(result) + "\n");
}

async function main() {
  var args = parseArgs(process.argv.slice(2));
  var format = args.format === "json" ? "json" : "text";
  var input = "";

  if (args.input) {
    input = fs.readFileSync(args.input, "utf8").trim();
  } else if (args.data) {
    input = args.data;
  } else if (!process.stdin.isTTY) {
    input = await readStdin();
  }

  var payload = input ? parseJsonPayload(input) : {};

  if (Array.isArray(payload)) {
    payload.forEach((item) => {
      outputResult(shouldZoomOnClick(item), format);
    });
    return;
  }

  outputResult(shouldZoomOnClick(payload), format);
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
