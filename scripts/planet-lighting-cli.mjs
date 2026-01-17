#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  getPlanetInternalLightConfig,
  shouldAttachPlanetInternalLight,
} from "../src/js/lib/planet-lighting.mjs";

function parseArgs(argv) {
  const parsed = {};
  argv.forEach((arg) => {
    if (!arg.startsWith("--")) return;
    const [key, value] = arg.slice(2).split("=");
    parsed[key] = value || "";
  });
  return parsed;
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch (err) {
    return "";
  }
}

const args = parseArgs(process.argv.slice(2));
const rawInput = readStdin().trim();
const input = rawInput ? JSON.parse(rawInput) : {};

const modelName = input.modelName || args.model || "";
const overrides = input.overrides || {};

const config = getPlanetInternalLightConfig(overrides);
const shouldAttach = shouldAttachPlanetInternalLight(modelName);

process.stdout.write(
  `${JSON.stringify({ modelName, shouldAttach, config }, null, 2)}\n`,
);
