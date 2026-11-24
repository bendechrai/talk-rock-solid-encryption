/**
 * Save a screenshot of every step, to review a scene the way the audience sees it.
 *
 *   node audit/screenshots.cjs <output-dir> [scene-id-prefix] [--play]
 *
 * By default each step is captured in its settled state. With --play the script advances with
 * the arrow key instead and captures after the animation, which also proves the steps play.
 */
const fs = require('node:fs');
const path = require('node:path');
const { openDeck, goTo } = require('./lib.cjs');

(async () => {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const play = process.argv.includes('--play');
  const [out, prefix = ''] = args;
  if (!out) throw new Error('Usage: node audit/screenshots.cjs <output-dir> [scene-id-prefix] [--play]');
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, scenes, problems } = await openDeck({ reducedMotion: play ? 'no-preference' : 'reduce' });
  for (const scene of scenes.filter((s) => s.id.startsWith(prefix))) {
    await goTo(page, scene.id, 0);
    for (let step = 0; step <= scene.steps; step++) {
      if (step > 0) {
        if (play) {
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(4500);
        } else {
          await goTo(page, scene.id, step);
        }
      }
      await page.screenshot({ path: path.join(out, `${scene.id}-${String(step).padStart(2, '0')}.png`) });
    }
  }
  problems.forEach((problem) => console.log(problem));
  console.log(`Saved to ${out}. ${problems.length} browser error(s).`);
  await browser.close();
  process.exit(problems.length ? 1 : 0);
})();
