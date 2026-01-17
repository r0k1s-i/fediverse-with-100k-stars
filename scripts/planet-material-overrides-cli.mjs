#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { getPlanetMaterialOverrides } from "../src/js/lib/planet-material-overrides.mjs";

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
const materialType = input.materialType || args.material || "";

const material = {
  isMeshStandardMaterial: materialType === "standard",
  isMeshPhysicalMaterial: materialType === "physical",
};

const overrides = getPlanetMaterialOverrides(modelName, material);

const output = {
  modelName,
  materialType,
  overrides: overrides || null,
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
