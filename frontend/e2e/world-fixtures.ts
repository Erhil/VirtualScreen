import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { relative, resolve } from "node:path";

const seedFiles = [
  "Cards/Basic Character Sheet.cs",
  "Cards/Clockwork Gull.cs",
  "Cards/Computed Character Sheet.cs",
  "Cards/Custom Handout.cs",
  "Cards/Harbor Watch Contact.cs",
  "Cards/Item Reference Table.cs",
  "Cards/Lantern Whisper.cs",
  "Cards/Monster Stat Card.cs",
  "Cards/Moonlit Compass.cs",
  "Cards/Session Reference.cs",
  "Cards/Spell Reference V2.cs",
  "Cards/Tideglass Market.cs",
  "Docs/session-handout.pdf",
  "Guide/01 Notes And Links.md",
  "Guide/02 Cards And Tables.md",
  "Guide/03 Screen Map Audio.md",
  "Guide/04 Scripts And Live Tools.md",
  "Media/sample-map.svg",
  "NPCs/Captain Ilyra.md",
  "README.md",
  "Scripts/hello_world1.dms",
  "Scripts/random_tavern_event.dms",
  "Scripts/screen_audio_demo.dms",
  "Tables/random-events.csv",
  "Unsupported/roll.bin",
  ".virtualscreen/card-templates/basic-character-v2.json",
  ".virtualscreen/card-templates/computed-character-v1.json",
  ".virtualscreen/card-templates/npc-contact.json",
  ".virtualscreen/card-templates/reference-table-v2.json"
];

function pause(milliseconds: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function normalizeFixturePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function shouldCopySeedPath(relativePath: string): boolean {
  return seedFiles.some((seedFile) => seedFile === relativePath || seedFile.startsWith(`${relativePath}/`));
}

export function copySampleWorldSeed(sampleWorld: string, targetWorld: string) {
  cpSync(sampleWorld, targetWorld, {
    recursive: true,
    filter: (source) => {
      const relativePath = normalizeFixturePath(relative(sampleWorld, source));
      return relativePath === "" || shouldCopySeedPath(relativePath);
    }
  });
}

export function resetWorldDirectory(worldPath: string) {
  mkdirSync(worldPath, { recursive: true });
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      for (const entry of readdirSync(worldPath)) {
        if (entry === ".virtualscreen") {
          const statePath = resolve(worldPath, entry);
          for (const stateEntry of readdirSync(statePath)) {
            if (stateEntry.startsWith("virtualscreen.sqlite3")) {
              continue;
            }
            rmSync(resolve(statePath, stateEntry), { force: true, recursive: true });
          }
          continue;
        }
        rmSync(resolve(worldPath, entry), { force: true, recursive: true });
      }
      break;
    } catch (error) {
      if (attempt === 24) {
        throw error;
      }
      pause(200);
    }
  }
}
