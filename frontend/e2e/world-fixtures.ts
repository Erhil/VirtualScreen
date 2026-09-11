import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

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
  "System Packs/Harbor Starter Pack.zip",
  "Tables/dice-rolls.csv",
  "Tables/random-events.csv",
  "Unsupported/roll.bin",
  ".virtualscreen/card-templates/basic-character-v2.json",
  ".virtualscreen/card-templates/computed-character-v1.json",
  ".virtualscreen/card-templates/npc-contact.json",
  ".virtualscreen/card-templates/reference-table-v2.json"
];


function normalizeFixturePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function shouldCopySeedPath(relativePath: string): boolean {
  return seedFiles.some((seedFile) => seedFile === relativePath || seedFile.startsWith(`${relativePath}/`));
}

/**
 * Windows refuses a delete with EPERM while another process still holds the file open -
 * here the backend, which watches the world and reindexes in the background after
 * anything writes to it.
 *
 * Be honest about what this is: a wait, not a cure. The cause has never been reproduced
 * in isolation - the system-pack conflict spec passes 6/6 on its own and fails perhaps
 * one full run in three, so the hold is load-dependent and its real duration is unknown.
 * Two previous budgets (4s, then 15s) were guesses and both were eventually exceeded, so
 * this one stops guessing and measures instead: it waits far longer than should ever be
 * needed, and prints how long it actually waited whenever that exceeds a second. The
 * next full-suite failure will therefore arrive with a number attached rather than
 * another shrug.
 */
const REMOVE_TIMEOUT_MS = 60_000;
const REMOVE_POLL_MS = 100;

export function removeWorldPath(path: string) {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < REMOVE_TIMEOUT_MS) {
    try {
      rmSync(path, { force: true, recursive: true });
      const waited = Date.now() - startedAt;
      if (waited > 1_000) {
        process.stderr.write(`removeWorldPath waited ${waited}ms for ${path}
`);
      }
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, REMOVE_POLL_MS);
    }
  }

  throw new Error(
    `Could not delete ${path} within ${REMOVE_TIMEOUT_MS / 1000}s. On Windows this means ` +
      "another process still holds it open - almost always the backend mid-reindex. A hold " +
      "this long is not the transient one this wait was written for; find what has the " +
      "handle rather than raising the number again.",
    { cause: lastError }
  );
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
  // removeWorldPath already waits out a held file, so this needs no retry loop of its
  // own - an outer one only multiplied that wait by 25.
  mkdirSync(worldPath, { recursive: true });
  for (const entry of readdirSync(worldPath)) {
    if (entry === ".virtualscreen") {
      const statePath = resolve(worldPath, entry);
      for (const stateEntry of readdirSync(statePath)) {
        if (!stateEntry.startsWith("virtualscreen.sqlite3")) {
          removeWorldPath(resolve(statePath, stateEntry));
        }
      }
      continue;
    }
    removeWorldPath(resolve(worldPath, entry));
  }
}

type ZipEntry = {
  path: string;
  content: string | Buffer;
};

type SystemPackFixtureOptions = {
  invalidPath?: boolean;
};

const crcTable = new Uint32Array(256);

for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(content: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(): { date: number; time: number } {
  const date = new Date("2026-01-01T00:00:00Z");
  const year = Math.max(1980, date.getUTCFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
    time:
      (date.getUTCHours() << 11) |
      (date.getUTCMinutes() << 5) |
      Math.floor(date.getUTCSeconds() / 2)
  };
}

function writeUInt32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function writeUInt16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

export function createZipArchive(zipPath: string, entries: ZipEntry[]) {
  const fileRecords: Buffer[] = [];
  const centralRecords: Buffer[] = [];
  let offset = 0;
  const timestamp = dosTimestamp();

  for (const entry of entries) {
    const name = Buffer.from(entry.path.replace(/\\/g, "/"), "utf-8");
    const content = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, "utf-8");
    const checksum = crc32(content);
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0x0800),
      writeUInt16(0),
      writeUInt16(timestamp.time),
      writeUInt16(timestamp.date),
      writeUInt32(checksum),
      writeUInt32(content.length),
      writeUInt32(content.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name
    ]);
    fileRecords.push(localHeader, content);

    centralRecords.push(
      Buffer.concat([
        writeUInt32(0x02014b50),
        writeUInt16(20),
        writeUInt16(20),
        writeUInt16(0x0800),
        writeUInt16(0),
        writeUInt16(timestamp.time),
        writeUInt16(timestamp.date),
        writeUInt32(checksum),
        writeUInt32(content.length),
        writeUInt32(content.length),
        writeUInt16(name.length),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt32(0),
        writeUInt32(offset),
        name
      ])
    );
    offset += localHeader.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const endRecord = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.length),
    writeUInt16(entries.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0)
  ]);

  mkdirSync(dirname(zipPath), { recursive: true });
  writeFileSync(zipPath, Buffer.concat([...fileRecords, centralDirectory, endRecord]));
}

export function createSystemPackArchive(
  zipPath: string,
  options: SystemPackFixtureOptions = {}
) {
  const manifestFiles = [
    "Notes/E2E Pack Note.md",
    "Cards/E2E Pack Card.cs",
    "Tables/e2e-pack-table.csv",
    "Media/e2e-pack-map.svg",
    ".music/ambient/E2E Pack/e2e-ambience.mp3",
    ".virtualscreen/card-templates/e2e-pack-template.json",
    "Scripts/should-not-import.dms",
    ...(options.invalidPath ? ["../escaped.md"] : [])
  ];
  const entries: ZipEntry[] = [
    {
      path: "system-pack.json",
      content: JSON.stringify(
        {
          schema_version: 1,
          name: "E2E Content Pack",
          version: "1.0.0",
          description: "Small content-only pack generated by Playwright.",
          files: manifestFiles
        },
        null,
        2
      )
    },
    { path: "Notes/E2E Pack Note.md", content: "# E2E Pack Note\n\nPack lantern phrase.\n" },
    {
      path: "Cards/E2E Pack Card.cs",
      content: JSON.stringify(
        {
          version: 1,
          title: "E2E Pack Card",
          kind: "Clue",
          tags: ["system-pack"],
          fields: [{ name: "Hook", value: "Blue archive key." }]
        },
        null,
        2
      )
    },
    { path: "Tables/e2e-pack-table.csv", content: "result,event\n1,Pack table result\n" },
    {
      path: "Media/e2e-pack-map.svg",
      content:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\"><rect width=\"32\" height=\"32\" fill=\"#226\"/></svg>\n"
    },
    { path: ".music/ambient/E2E Pack/e2e-ambience.mp3", content: Buffer.from("SUQzAwAAAAAA", "base64") },
    {
      path: ".virtualscreen/card-templates/e2e-pack-template.json",
      content: JSON.stringify(
        {
          id: "e2e-pack-template",
          name: "E2E Pack Template",
          kind: "npc",
          description: "E2E content-pack template.",
          card: {
            kind: "npc",
            title: "{{title}}",
            tags: ["system-pack-template"],
            sections: [{ title: "Core", fields: { Hook: "" } }]
          }
        },
        null,
        2
      )
    },
    { path: "Scripts/should-not-import.dms", content: "render_md('# should not import')\n" }
  ];

  if (options.invalidPath) {
    entries.push({ path: "../escaped.md", content: "This must never be written.\n" });
  }

  createZipArchive(zipPath, entries);
}
