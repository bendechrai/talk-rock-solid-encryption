/**
 * Visit every step of every scene and report any text too small to read from the back of a room.
 *
 *   node audit/legibility.cjs            every scene
 *   node audit/legibility.cjs e2e        only scenes whose id starts with "e2e"
 */
const { openDeck, goTo, smallText } = require('./lib.cjs');

(async () => {
  const prefix = process.argv[2] ?? '';
  const { browser, page, scenes, problems } = await openDeck();
  let failures = 0;
  let checked = 0;
  for (const scene of scenes.filter((s) => s.id.startsWith(prefix))) {
    for (let step = 0; step <= scene.steps; step++) {
      await goTo(page, scene.id, step);
      checked++;
      const seen = new Set();
      for (const { text, size, limit } of await smallText(page)) {
        const line = `${scene.id} step ${step}: "${text}" is ${size}px (needs ${limit})`;
        if (!seen.has(line)) console.log(line);
        seen.add(line);
        failures++;
      }
    }
  }
  problems.forEach((problem) => console.log(problem));
  console.log(`${checked} states checked, ${failures} piece(s) of text too small, ${problems.length} browser error(s).`);
  await browser.close();
  process.exit(failures || problems.length ? 1 : 0);
})();
