const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const { SignJWT } = require("jose");

const SESSION_COOKIE = "dento_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

async function signSession(session) {
  const secret = process.env.SESSION_SECRET || "default_super_secret_session_key_32chars_long!!";
  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    clinicId: session.clinicId,
    role: session.role,
    name: session.name,
    email: session.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

app.whenReady().then(async () => {
  try {
    require("dotenv").config();
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const userRes = await pool.query(
      `SELECT u.id as "userId", u.name, u.email, u.role, c.id as "clinicId"
       FROM users u
       JOIN clinics c ON u."clinicId" = c.id
       WHERE u.email = 's.adeleke@dentocontinuity.demo'
       LIMIT 1`
    );
    await pool.end();

    if (!userRes.rows.length) {
      throw new Error("Demo user s.adeleke@dentocontinuity.demo not found in DB");
    }

    const userData = userRes.rows[0];
    console.log("Logged in as:", userData);

    const token = await signSession({
      userId: userData.userId,
      clinicId: userData.clinicId,
      role: userData.role,
      name: userData.name,
      email: userData.email,
    });

    const viewports = [
      { name: "1440x900", width: 1440, height: 900 },
      { name: "1536x864", width: 1536, height: 864 },
      { name: "1920x1080", width: 1920, height: 1080 },
    ];

    const outDir = path.join(__dirname, "../public/screenshots");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // 1. Capture Front Desk across all 3 viewports in Dark Mode
    for (const vp of viewports) {
      const win = new BrowserWindow({
        width: vp.width,
        height: vp.height,
        useContentSize: true,
        show: false,
        webPreferences: {
          offscreen: true,
        },
      });
      win.setContentSize(vp.width, vp.height);

      await win.webContents.session.cookies.set({
        url: "http://localhost:3000",
        name: SESSION_COOKIE,
        value: token,
      });

      await win.loadURL("http://localhost:3000/front-desk");
      await new Promise((r) => setTimeout(r, 2500));

      await win.webContents.executeJavaScript(`
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
      `);
      await new Promise((r) => setTimeout(r, 600));

      const image = await win.capturePage({ x: 0, y: 0, width: vp.width, height: vp.height });
      const savePath = path.join(outDir, `front-desk-${vp.name}-dark.png`);
      fs.writeFileSync(savePath, image.toPNG());
      console.log(`Saved ${savePath}`);

      // If 1440x900, capture hover state on table row, then light mode
      if (vp.name === "1440x900") {
        const rect = await win.webContents.executeJavaScript(`
          (() => {
            const row = document.querySelector('tbody tr');
            if (!row) return null;
            const r = row.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          })()
        `);
        if (rect) {
          win.webContents.sendInputEvent({ type: "mouseMove", x: Math.round(rect.x), y: Math.round(rect.y) });
          await new Promise((r) => setTimeout(r, 600));
          const hoverImg = await win.capturePage({ x: 0, y: 0, width: vp.width, height: vp.height });
          const hoverSavePath = path.join(outDir, `front-desk-1440x900-hover.png`);
          fs.writeFileSync(hoverSavePath, hoverImg.toPNG());
          console.log(`Saved ${hoverSavePath}`);
        }

        await win.webContents.executeJavaScript(`
          localStorage.setItem("theme", "light");
          document.documentElement.classList.remove("dark");
        `);
        await new Promise((r) => setTimeout(r, 600));
        const lightImg = await win.capturePage({ x: 0, y: 0, width: vp.width, height: vp.height });
        const lightSavePath = path.join(outDir, `front-desk-1440x900-light.png`);
        fs.writeFileSync(lightSavePath, lightImg.toPNG());
        console.log(`Saved ${lightSavePath}`);
      }

      win.close();
    }

    // 2. Capture other pages in 1440x900 Dark Mode
    const otherPages = [
      { route: "/dashboard", name: "dashboard" },
      { route: "/patients", name: "patients" },
      { route: "/calendar", name: "calendar" },
      { route: "/settings", name: "settings" },
    ];

    for (const page of otherPages) {
      const win = new BrowserWindow({
        width: 1440,
        height: 900,
        useContentSize: true,
        show: false,
        webPreferences: {
          offscreen: true,
        },
      });
      win.setContentSize(1440, 900);

      await win.webContents.session.cookies.set({
        url: "http://localhost:3000",
        name: SESSION_COOKIE,
        value: token,
      });

      await win.loadURL(`http://localhost:3000${page.route}`);
      await new Promise((r) => setTimeout(r, 2000));

      await win.webContents.executeJavaScript(`
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
      `);
      await new Promise((r) => setTimeout(r, 600));

      const pageImg = await win.capturePage({ x: 0, y: 0, width: 1440, height: 900 });
      const pagePath = path.join(outDir, `${page.name}-1440x900-dark.png`);
      fs.writeFileSync(pagePath, pageImg.toPNG());
      console.log(`Saved ${pagePath}`);

      win.close();
    }
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    app.quit();
  }
});
