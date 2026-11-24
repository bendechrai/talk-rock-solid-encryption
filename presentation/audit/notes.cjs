/**
 * Lists every scene and step with its presenter note, and fails if any is missing.
 * Each note records the narration that step serves, so reading this top to bottom is reading
 * the talk in click order.
 *
 *   node audit/notes.cjs [scene-id-prefix] [--quiet]
 */
const { openDeck } = require('./lib.cjs');

(async () => {
  const args = process.argv.slice(2);
  const quiet = args.includes('--quiet');
  const prefix = args.find((a) => !a.startsWith('--')) ?? '';
  const { browser, scenes } = await openDeck();
  await browser.close();

  let missing = 0;
  let clicks = 0;
  for (const scene of scenes.filter((s) => s.id.startsWith(prefix))) {
    if (!quiet) console.log(`\n${scene.id}  (${scene.title})`);
    scene.notes.forEach((note, step) => {
      if (step > 0) clicks += 1;
      // A title or a scene that opens mid-thought may leave its opening note to the first step.
      const required = step > 0 || scene.steps === 0;
      if (!note && required) missing += 1;
      if (!quiet || (!note && required)) console.log(`  ${String(step).padStart(2)}  ${note || (required ? '*** no note ***' : '-')}`);
    });
  }
  console.log(`\n${scenes.length} scenes, ${clicks} clicks, ${missing} step(s) without a note.`);
  process.exit(missing ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
