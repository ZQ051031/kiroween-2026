# Haunted Hollow

An illustrated Halloween escape house. Investigate the foyer, library, and conservatory, collect keepsakes, and solve three memory seals to learn what the house has been holding onto. The Journal tracks discoveries and score. After Dark includes a spooky story generator and a Halloween party checklist.

## Run locally

```sh
git clone https://github.com/ZQ051031/kiroween-2026.git
cd kiroween-2026
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). There is no build step, account, or dependency install. Use a static HTTP server rather than opening the HTML directly; the app uses native browser modules.

Choose a room and activate its numbered landmarks or their labeled equivalents below the art. Read the clue, collect the keepsake, then open the seal and choose an answer. Progress and party tasks stay in this browser via localStorage. Sound is off by default and synthesized with Web Audio; illustrations are original SVGs. Use **Reset progress** in the Journal to start over.

### Test

With Google Chrome on your PATH and Node.js 22 or newer, run `npm test` (no install required). The test starts its own loopback server and browser. Set `CHROME` if the executable is not called `google-chrome`; optionally set `SHOTS_DIR` to an existing directory to save desktop and mobile screenshots.

## Spec-driven workflow

The spec documents were authored by hand following Kiro’s spec-driven structure. Requirements define observable behavior; the design maps it to room data, state, and interface; tasks break down implementation and verification. The browser test exercises the acceptance paths in the requirements. Steering keeps the gameplay, dependency-free stack, and repository structure explicit.

- [Requirements, design, and tasks](.kiro/specs/haunted-hollow/)
- [Product, technology, and structure steering](.kiro/steering/)
- No hooks are configured. Kiro IDE, CLI, Web, Crew, hooks, Kiro agents, and MCP were not used for this version.

## Kiroween 2026

**Category:** Costume Contest. The submission window runs **October 30 – December 4, 2026 at 2:00 PM PT** (**December 5, 2026 at 06:00 CST/HKT**). Judging is December 16, 2026 – January 29, 2027. Devpost lists **$100,000+** in prizes, **$30,000** for first place, and **$5,000** for Best Costume Contest.

**Not yet submission-ready.** The [Official Rules](https://kiroween.devpost.com/rules) require the project to be built using Kiro (IDE, CLI, Web, and/or Kiro Crew); a manually authored `.kiro` directory does not satisfy that requirement. Before submitting, the entrant needs to review eligibility, use Kiro substantively during the submission period and write up what was actually done, provide a working app URL for judging, record a demo under three minutes and upload it publicly to YouTube, then complete the [Devpost submission](https://kiroween.devpost.com/). No deployment or submission has been made for this version.

## License

[MIT](LICENSE)
