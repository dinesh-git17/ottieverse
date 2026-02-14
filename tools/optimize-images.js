#!/usr/bin/env node

/**
 * Compresses otter PNG assets to meet the 200kb per-file budget.
 *
 * Pipeline: resize to 900px max dimension → palette quantization (lossy) → max DEFLATE.
 * Alpha channels are preserved for gradient background compositing.
 */

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const OTTERS_DIR = path.resolve(__dirname, "..", "public", "otters");
const MAX_DIMENSION = 900;
const TARGET_BYTES = 200 * 1024;

async function optimizeFile(filePath, quality) {
  const original = fs.readFileSync(filePath);
  const originalSize = original.length;

  const buffer = await sharp(original)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .png({ quality, compressionLevel: 9, palette: true })
    .toBuffer();

  fs.writeFileSync(filePath, buffer);

  return { originalSize, optimizedSize: buffer.length };
}

async function run() {
  const files = fs
    .readdirSync(OTTERS_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();

  if (files.length === 0) {
    console.error("No PNG files found in", OTTERS_DIR);
    process.exit(1);
  }

  const quality = Number(process.argv[2]) || 75;
  console.log(`Optimizing ${files.length} PNGs (quality=${quality}, max=${MAX_DIMENSION}px)\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  const overBudget = [];

  for (const file of files) {
    const filePath = path.join(OTTERS_DIR, file);
    const { originalSize, optimizedSize } = await optimizeFile(filePath, quality);

    totalBefore += originalSize;
    totalAfter += optimizedSize;

    const beforeKb = (originalSize / 1024).toFixed(0);
    const afterKb = (optimizedSize / 1024).toFixed(0);
    const reduction = (((originalSize - optimizedSize) / originalSize) * 100).toFixed(1);
    const flag = optimizedSize > TARGET_BYTES ? " *** OVER BUDGET ***" : "";

    console.log(
      `  ${file.padEnd(24)} ${beforeKb.padStart(6)}kb → ${afterKb.padStart(5)}kb  (${reduction}% saved)${flag}`,
    );

    if (optimizedSize > TARGET_BYTES) {
      overBudget.push(file);
    }
  }

  const totalBeforeMb = (totalBefore / (1024 * 1024)).toFixed(2);
  const totalAfterMb = (totalAfter / (1024 * 1024)).toFixed(2);

  console.log(`\n  Total: ${totalBeforeMb}MB → ${totalAfterMb}MB`);

  if (overBudget.length > 0) {
    console.log(`\n  ${overBudget.length} file(s) over 200kb budget: ${overBudget.join(", ")}`);
    console.log("  Re-run with lower quality: node tools/optimize-images.js 65");
    process.exit(1);
  }

  if (totalAfter > 3 * 1024 * 1024) {
    console.log("\n  Total payload exceeds 3MB budget.");
    process.exit(1);
  }

  console.log("\n  All files within budget.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
