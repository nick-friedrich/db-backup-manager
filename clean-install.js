#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

/**
 * Clean Install Script
 * Removes all node_modules directories and reinstalls dependencies
 */

console.log("🧹 Starting clean install process...\n");

// Function to find and remove node_modules directories
function findAndRemoveNodeModules(dir, depth = 0) {
  const maxDepth = 3; // Prevent going too deep
  if (depth > maxDepth) return;

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      try {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          if (item === "node_modules") {
            console.log(
              `🗑️  Removing: ${path.relative(process.cwd(), fullPath)}`
            );
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else if (
            item !== ".git" &&
            item !== ".next" &&
            !item.startsWith(".")
          ) {
            // Recursively search subdirectories (except .git, .next, and hidden folders)
            findAndRemoveNodeModules(fullPath, depth + 1);
          }
        }
      } catch (_err) {
        console.warn(`⚠️  Warning: Could not read directory ${fullPath}`);
        // Skip files/directories we can't access
      }
    }
  } catch (_err) {
    console.warn(`⚠️  Warning: Could not read directory ${dir}`);
  }
}

// Main execution
try {
  // Step 1: Remove all node_modules directories
  console.log("📁 Scanning for node_modules directories...");
  findAndRemoveNodeModules(process.cwd());

  // Step 2: Remove lock files (optional - keeps bun.lockb by default)
  // Uncomment the next line if you want to remove lock files too
  // removeLockFiles();

  // Step 3: Clear bun cache
  console.log("\n🧽 Clearing bun cache...");
  try {
    execSync("bun pm cache rm", { stdio: "inherit" });
  } catch (_err) {
    console.log("   (Cache clear failed or not needed)");
  }

  // Step 4: Reinstall dependencies
  console.log("\n📦 Installing dependencies...");
  execSync("bun install", { stdio: "inherit" });

  console.log("\n✅ Clean install completed successfully!");
  console.log("\n🚀 You can now run your development servers:");
  console.log("   • bun run dev (Database Manager)");
} catch (error) {
  console.error("\n❌ Clean install failed:", error.message);
  process.exit(1);
}
