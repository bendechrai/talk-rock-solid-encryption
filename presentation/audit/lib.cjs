/**
 * Shared helpers for the audit scripts. They drive a real browser against a running
 * presentation (npm run present), so they need Playwright:
 *
 *   npm install --no-save playwright && npx playwright install chromium
 */
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const BASE = process.env.PRESENTATION_URL ?? 'http://localhost:5173';
const MIN = 40; // stage pixels; keep in step with `type.min` in src/theme.ts
const TEXTURE_MIN = 28; // `type.texture`

/**
 * Once someone has opened the stage, the demos answer only the presenter's browsers. The audits
 * use a fresh browser, so they present the stage key: TALK_STAGE_KEY if set, otherwise read out
 * of the running container. With neither, they go in as a stranger and the demo checks will fail.
 */
function stageKey() {
  if (process.env.TALK_STAGE_KEY) return process.env.TALK_STAGE_KEY;
  try {
    const saved = execFileSync('docker', ['compose', 'exec', '-T', 'web', 'cat', '/data/stage.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(saved).key ?? '';
  } catch {
    return '';
  }
}

async function openDeck(options = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ?? 'reduce',
  });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
  });
  const key = stageKey();
  await page.goto(key ? `${BASE}/?stage-key=${encodeURIComponent(key)}` : BASE);
  await page.waitForFunction(() => Array.isArray(window.__deck));
  const scenes = await page.evaluate(() => window.__deck);
  return { browser, page, scenes, problems };
}

/** Jump straight to a step and wait for the stage to settle. */
async function goTo(page, sceneId, step) {
  await page.evaluate(([id, s]) => { window.location.hash = `#/${id}/${s}`; }, [sceneId, step]);
  await page.waitForTimeout(250);
}

/**
 * Every piece of visible text on the stage that is smaller than it should be.
 * Text marked `data-texture` (ciphertext) only has to reach the texture size; text inside
 * `data-presenter` (and the step counter) is for the presenter and is skipped.
 */
async function smallText(page) {
  return page.evaluate(([min, textureMin]) => {
    const stage = document.querySelector('.stage');
    const stageRect = stage.getBoundingClientRect();
    const stageScale = stageRect.width / 1920;
    const found = [];

    const visible = (element) => {
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) return false;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      // Off-stage or scrolled out of view does not count.
      return rect.right > stageRect.left && rect.left < stageRect.right && rect.bottom > stageRect.top && rect.top < stageRect.bottom;
    };
    const skip = (element) => element.closest('.progress, .sr-only, [data-presenter]') !== null;
    const check = (element, text, size) => {
      const texture = element.closest('[data-texture]') !== null;
      const limit = texture ? textureMin : min;
      if (size + 0.5 < limit) found.push({ text: text.trim().slice(0, 40), size: Math.round(size * 10) / 10, limit });
    };

    for (const element of stage.querySelectorAll('svg text')) {
      const text = element.textContent ?? '';
      if (!text.trim() || skip(element) || !visible(element)) continue;
      const matrix = element.getScreenCTM();
      const scale = Math.hypot(matrix.a, matrix.b) / stageScale;
      check(element, text, parseFloat(getComputedStyle(element).fontSize) * scale);
    }

    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      const text = node.textContent ?? '';
      if (!text.trim() || !element || element.closest('svg') || skip(element) || !visible(element)) continue;
      const zoom = element.currentCSSZoom ?? 1;
      check(element, text, parseFloat(getComputedStyle(element).fontSize) * zoom);
    }
    // Placeholders and typed values live outside text nodes.
    for (const element of stage.querySelectorAll('input, textarea')) {
      if (skip(element) || !visible(element)) continue;
      const zoom = element.currentCSSZoom ?? 1;
      check(element, element.value || element.placeholder || '', parseFloat(getComputedStyle(element).fontSize) * zoom);
    }
    return found;
  }, [MIN, TEXTURE_MIN]);
}

module.exports = { BASE, MIN, TEXTURE_MIN, openDeck, goTo, smallText };
