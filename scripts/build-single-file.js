"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "天工机巧盘-单文件版.html");

function readSource(fileName) {
  return fs.readFileSync(path.join(projectRoot, fileName), "utf8").replace(/^\uFEFF/, "");
}

function removeImports(source) {
  return source.replace(/^\s*@import\s+url\([^)]*\);\s*/i, "");
}

function escapeClosingTag(source, tagName) {
  return source.replace(new RegExp(`</${tagName}`, "gi"), `<\\/${tagName}`);
}

const template = readSource("index.html");
const combinedStyles = [
  readSource("styles-base.css"),
  removeImports(readSource("styles-clarity.css")),
  removeImports(readSource("styles.css")),
].join("\n\n");
const solver = readSource("solver-core.js");
const app = readSource("app.js");

const generated = template
  .replace(
    /\s*<link rel="stylesheet" href="\.\/styles\.css" \/>/,
    `\n    <style>\n${escapeClosingTag(combinedStyles, "style")}\n    </style>`,
  )
  .replace(
    /\s*<script src="\.\/solver-core\.js"><\/script>/,
    `\n    <script>\n${escapeClosingTag(solver, "script")}\n    </script>`,
  )
  .replace(
    /\s*<script src="\.\/app\.js"><\/script>/,
    `\n    <script>\n${escapeClosingTag(app, "script")}\n    </script>`,
  )
  .replace(
    "<!doctype html>",
    "<!doctype html>\n<!-- 自动生成的单文件发布版：CSS 与 JavaScript 均已内嵌 -->",
  );

const unresolvedAssets = [
  "./styles.css",
  "./styles-clarity.css",
  "./styles-base.css",
  "./solver-core.js",
  "./app.js",
].filter((asset) => generated.includes(asset));

if (unresolvedAssets.length > 0) {
  throw new Error(`仍存在外部依赖：${unresolvedAssets.join(", ")}`);
}

fs.writeFileSync(outputPath, generated, "utf8");
console.log(`已生成：${outputPath}`);
console.log(`文件大小：${Buffer.byteLength(generated, "utf8")} bytes`);
