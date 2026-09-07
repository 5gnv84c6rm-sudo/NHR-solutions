import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
console.log("Landing title:", await page.title());
console.log("Hero visible:", await page.isVisible("text=HR software that protects your people"));

await page.click("text=Start free trial >> nth=0");
await page.waitForSelector("text=Start your free 30-day trial");
const rand = Date.now();
await page.fill("#trial-name", "Test User");
await page.fill("#trial-email", `test${rand}@example.com`);
await page.fill("#trial-company", "Test Co Ltd");
await page.fill("#trial-password", "password123");
await page.locator('form button:has-text("Start free trial")').click();

await page.waitForURL("**/dashboard", { timeout: 10000 });
console.log("Reached dashboard:", page.url());
await page.waitForSelector("text=Overview");
console.log("Overview stat visible:", await page.isVisible("text=Total employees"));

for (const path of ["employees", "attendance", "payroll", "shifts", "passports", "visas"]) {
  await page.goto(`http://127.0.0.1:4173/dashboard/${path}`, { waitUntil: "networkidle" });
  const bodyText = await page.textContent("body");
  console.log(`/${path} loaded, length=${bodyText.length}`);
}

await browser.close();

if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.forEach((e) => console.log(" -", e));
  process.exit(1);
} else {
  console.log("No console errors.");
}
