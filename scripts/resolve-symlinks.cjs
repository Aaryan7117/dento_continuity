/**
 * Post-build script: resolves .next/node_modules symlinks before electron-builder packages.
 * Prisma v7 + Turbopack creates hashed symlinks that electron-builder can't follow.
 * Run AFTER `next build` and BEFORE `electron-builder`.
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const nextNodeModules = path.join(projectRoot, ".next", "node_modules");

if (!fs.existsSync(nextNodeModules)) {
  console.log("[resolve-symlinks] No .next/node_modules found, skipping.");
  process.exit(0);
}

// Scan for symlinks in .next/node_modules (including scoped packages)
function findSymlinks(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name.startsWith("@") && entry.isDirectory()) {
      // Scoped package — scan one level deeper
      for (const sub of fs.readdirSync(fullPath, { withFileTypes: true })) {
        const subPath = path.join(fullPath, sub.name);
        if (sub.isSymbolicLink()) {
          results.push(subPath);
        }
      }
    } else if (entry.isSymbolicLink()) {
      results.push(fullPath);
    }
  }
  return results;
}

const symlinks = findSymlinks(nextNodeModules);

if (symlinks.length === 0) {
  console.log("[resolve-symlinks] No symlinks found in .next/node_modules.");
  process.exit(0);
}

console.log(`[resolve-symlinks] Found ${symlinks.length} symlink(s) to resolve:`);

for (const symlinkPath of symlinks) {
  const realPath = fs.realpathSync(symlinkPath);
  const relName = path.relative(nextNodeModules, symlinkPath);

  console.log(`  ${relName} -> ${realPath}`);

  // Remove the symlink
  fs.rmSync(symlinkPath, { recursive: true, force: true });

  // Copy the real directory in its place
  fs.cpSync(realPath, symlinkPath, { recursive: true, force: true });

  console.log(`  ✓ Resolved ${relName}`);
}

console.log("[resolve-symlinks] Done.");
