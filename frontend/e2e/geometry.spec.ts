import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { useE2eWorld, openNotesFile } from "./world-browser-helpers";

useE2eWorld();

async function expectScrollsToBottom(locator: Locator, label: string) {
  const before = await locator.evaluate((el) => ({
    top: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight
  }));
  // The check is only meaningful if the content actually overflows its box.
  expect(before.scrollHeight, `${label}: content must overflow to test scrolling`)
    .toBeGreaterThan(before.clientHeight + 8);
  await locator.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  const after = await locator.evaluate((el) => el.scrollTop);
  expect(after, `${label}: must scroll, not clip`).toBeGreaterThan(before.top);
}

function buildTallCard(title: string): string {
  const sections = Array.from({ length: 24 }, (_, sectionIndex) => ({
    title: `Section ${sectionIndex + 1}`,
    fields: Object.fromEntries(
      Array.from({ length: 6 }, (_, fieldIndex) => [
        `Field ${sectionIndex + 1}-${fieldIndex + 1}`,
        `Filler detail for section ${sectionIndex + 1}, field ${fieldIndex + 1}, padded to add real height to the card layout.`
      ])
    )
  }));
  return JSON.stringify(
    {
      version: 1,
      title,
      kind: "Artifact",
      tags: ["e2e-geometry"],
      sections
    },
    null,
    2
  );
}

function buildTallMarkdown(title: string): string {
  const lines = [`# ${title}`, ""];
  for (let index = 1; index <= 150; index += 1) {
    lines.push(
      `Paragraph ${index}: repeated filler content so this markdown file is tall enough to require scrolling inside the peek dialog.`
    );
    lines.push("");
  }
  lines.push("Bottom marker reached.");
  return lines.join("\n");
}

test("a tall card peeked from a link scrolls instead of clipping", async ({ page, request }) => {
  await request.post("/api/world/file", {
    data: {
      path: "Cards/Tall Card.cs",
      file_type: "card",
      content: buildTallCard("Tall Card")
    }
  });
  await request.post("/api/world/file", {
    data: {
      path: "Notes/Tall Card Link.md",
      file_type: "markdown",
      content: "# Tall Card Link\n\nPeek the [[Tall Card]] card.\n"
    }
  });
  await request.post("/api/index/rebuild");

  await page.goto("/");
  await openNotesFile(page, "Tall Card Link\\.md");

  await page.getByRole("link", { name: "Tall Card" }).click({ button: "middle" });

  await expect(page.getByRole("dialog", { name: "Peek Tall Card" })).toBeVisible();
  await expectScrollsToBottom(page.locator(".peek-dialog > .card-surface"), "peeked card");
});

test("a tall markdown peeked from a link scrolls", async ({ page, request }) => {
  await request.post("/api/world/file", {
    data: {
      path: "Notes/Tall Markdown.md",
      file_type: "markdown",
      content: buildTallMarkdown("Tall Markdown")
    }
  });
  await request.post("/api/world/file", {
    data: {
      path: "Notes/Tall Markdown Link.md",
      file_type: "markdown",
      content: "# Tall Markdown Link\n\nPeek the [[Tall Markdown]] note.\n"
    }
  });
  await request.post("/api/index/rebuild");

  await page.goto("/");
  await openNotesFile(page, "Tall Markdown Link\\.md");

  await page.getByRole("link", { name: "Tall Markdown" }).click({ button: "middle" });

  await expect(page.getByRole("dialog", { name: "Peek Tall Markdown" })).toBeVisible();
  await expectScrollsToBottom(page.locator(".peek-dialog > .markdown-viewer"), "peeked markdown");
});
