/**
 * Electron-builder afterPack hook.
 * Runs AFTER packaging and BEFORE installer creation (.dmg, .exe, .zip).
 * Ensures .next/node_modules (Prisma v7 hashed symlinks resolved to real modules)
 * is physically present in the packaged app bundle on all platforms.
 */
const fs = require("fs");
const path = require("path");

exports.default = async function (context) {
  console.log("[afterPack] Running post-packaging hook for platform:", context.electronPlatformName);

  const appOutDir = context.appOutDir;

  // Locate the app's root directory inside the package
  let appDir;
  if (context.electronPlatformName === "darwin") {
    // macOS: <appOutDir>/<productName>.app/Contents/Resources/app
    const appBundle = fs
      .readdirSync(appOutDir)
      .find((f) => f.endsWith(".app"));
    appDir = appBundle
      ? path.join(appOutDir, appBundle, "Contents", "Resources", "app")
      : path.join(appOutDir, "Contents", "Resources", "app");
  } else {
    // Windows / Linux: <appOutDir>/resources/app
    appDir = path.join(appOutDir, "resources", "app");
  }

  console.log("[afterPack] Target app directory:", appDir);

  if (!fs.existsSync(appDir)) {
    console.warn("[afterPack] App directory not found at:", appDir);
    return;
  }

  // Source .next/node_modules from the project root
  const projectRoot = path.join(__dirname, "..");
  const srcNextNodeModules = path.join(projectRoot, ".next", "node_modules");
  const destNextNodeModules = path.join(appDir, ".next", "node_modules");

  if (fs.existsSync(srcNextNodeModules)) {
    console.log(`[afterPack] Copying ${srcNextNodeModules} -> ${destNextNodeModules}`);
    fs.mkdirSync(destNextNodeModules, { recursive: true });
    fs.cpSync(srcNextNodeModules, destNextNodeModules, { recursive: true, force: true });
    console.log("[afterPack] ✓ .next/node_modules copied successfully!");
  } else {
    console.warn("[afterPack] Source .next/node_modules does not exist!");
  }

  // Also ensure .env exists in the packaged app
  const srcEnv = path.join(projectRoot, ".env");
  const destEnv = path.join(appDir, ".env");
  if (fs.existsSync(srcEnv) && !fs.existsSync(destEnv)) {
    fs.copyFileSync(srcEnv, destEnv);
    console.log("[afterPack] ✓ .env copied to app directory");
  }
};
