#!/usr/bin/env node
/**
 * Fix import statements in generated Prisma files to include .js extensions
 * This is needed for ES modules in Node.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist/generated/prisma");

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const originalContent = content;

  // Fix import statements that reference local files without .js extension
  // This regex matches: import ... from "./something" or from './something'
  content = content.replace(
    /from ['"](\.[^'"]*?)(['"])/g,
    (match, importPath, quote) => {
      // Skip if it already has .js extension or is an external package
      if (
        importPath.endsWith(".js") ||
        importPath.endsWith(".json") ||
        importPath.startsWith(".")
      ) {
        // Add .js if it's a relative path without extension
        if (importPath.startsWith(".") && !importPath.endsWith(".js")) {
          return `from ${quote}${importPath}.js${quote}`;
        }
      }
      return match;
    }
  );

  // Also fix export statements
  content = content.replace(
    /export \* from ['"](\.[^'"]*?)(['"])/g,
    (match, exportPath, quote) => {
      if (
        exportPath.endsWith(".js") ||
        exportPath.endsWith(".json") ||
        exportPath.startsWith(".")
      ) {
        if (exportPath.startsWith(".") && !exportPath.endsWith(".js")) {
          return `export * from ${quote}${exportPath}.js${quote}`;
        }
      }
      return match;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`✓ Fixed imports in ${path.relative(__dirname, filePath)}`);
  }
}

function fixAllImports(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixAllImports(filePath);
    } else if (file.endsWith(".js")) {
      fixImportsInFile(filePath);
    }
  }
}

// Only run if dist/generated/prisma exists
if (fs.existsSync(distPath)) {
  console.log("Fixing imports in generated files...");
  fixAllImports(distPath);
  console.log("✓ Import fix complete");
} else {
  console.log("dist/generated/prisma not found, skipping import fixes");
}
