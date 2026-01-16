import { getPlanetShadowConfig } from "../src/js/lib/planet-shadow-config.mjs";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const input = await readStdin();
  const payload = input.trim() ? JSON.parse(input) : {};
  const config = getPlanetShadowConfig(payload);

  process.stdout.write(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  const message = err && err.message ? err.message : String(err);
  process.stderr.write(message + "\n");
  process.exit(1);
});
