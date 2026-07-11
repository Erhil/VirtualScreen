import { expect, test } from "@playwright/test";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copySampleWorldSeed, resetWorldDirectory } from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");

function createSimplePdf(pages: string[]): Buffer {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
  ];

  for (const [index, label] of pages.entries()) {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const stream = `BT /F1 24 Tf 72 720 Td (${label}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObject} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream, "binary")} >>\nstream\n${stream}\nendstream`
    );
  }

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body, "binary"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(body, "binary");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "binary");
}

function resetPdfWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World") {
      rmSync(resolve(e2eWorldsRoot, entry), { force: true, recursive: true });
    }
  }
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);

  mkdirSync(resolve(e2eWorld, "Docs"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Notes"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Tables"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Cards"), { recursive: true });
  writeFileSync(
    resolve(e2eWorld, "Docs", "campaign-guide.pdf"),
    createSimplePdf(["Campaign Guide Page 1", "Bandit Stat Block"]),
  );
  writeFileSync(
    resolve(e2eWorld, "Notes", "pdf-links.md"),
    [
      "# PDF Links",
      "",
      "[Page two](Docs/campaign-guide.pdf#page=2)",
      "[Bandit stat block](Docs/campaign-guide.pdf#b:bandit-stat-block)",
      "[Missing bookmark](Docs/campaign-guide.pdf#b:missing-bookmark)"
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Tables", "pdf-links.csv"),
    "name,link\nBandit,\"[Bandit stat block](Docs/campaign-guide.pdf#b:bandit-stat-block)\"\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Cards", "PDF Reference.cs"),
    JSON.stringify(
      {
        version: 1,
        title: "PDF Reference",
        kind: "Reference",
        tags: ["pdf"],
        fields: [{ name: "Guide", value: "[Bandit stat block](Docs/campaign-guide.pdf#b:bandit-stat-block)" }]
      },
      null,
      2
    ),
    "utf-8"
  );
}

function worldTree(page) {
  return page.getByRole("navigation", { name: "World files" });
}

async function openFolderFile(page, folder: string, fileName: string | RegExp) {
  const tree = worldTree(page);
  const fileButton = tree.getByRole("button", {
    name: fileName instanceof RegExp ? fileName : new RegExp(fileName)
  });
  if (
    !(await fileButton
      .waitFor({ state: "visible", timeout: 750 })
      .then(() => true)
      .catch(() => false))
  ) {
    await tree.getByRole("button", { name: folder, exact: true }).click();
  }
  await expect(fileButton).toBeVisible();
  await fileButton.click();
}

test.beforeEach(async ({ request }) => {
  resetPdfWorld();
  await request.post("/api/worlds/open", { data: { id: "E2E World" } });
  await request.post("/api/index/rebuild");
  await request.put("/api/pdf/bookmarks?path=Docs%2Fcampaign-guide.pdf", {
    data: {
      bookmarks: [
        {
          id: "bandit-stat-block",
          label: "Bandit stat block",
          page: 2,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z"
        }
      ]
    }
  });
});

test("integrated PDF viewer renders pages and edits bookmarks", async ({ page }) => {
  await page.goto("/");

  const tree = worldTree(page);
  await expect(tree.getByRole("button", { name: "Docs", exact: true })).toBeVisible();
  await expect(tree.getByRole("button", { name: /campaign-guide\.pdf/ })).toHaveCount(0);

  await openFolderFile(page, "Docs", /campaign-guide\.pdf/);
  await expect(page.locator(".pdf-viewer")).toBeVisible();
  await expect(page.locator(".workspace-pane iframe[aria-label='campaign-guide.pdf']")).toHaveCount(0);
  await expect(page.locator("canvas[aria-label='campaign-guide.pdf']")).toBeVisible();

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByLabel("Page number")).toHaveValue("2");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Fit width" }).click();
  await page.getByRole("button", { name: "Rotate view" }).click();

  const pdfViewer = page.locator(".pdf-viewer");
  await page.getByLabel("Bookmark label").fill("Current reveal");
  await pdfViewer.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Current reveal")).toBeVisible();
  await expect(page.getByText("Bookmark saved.")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept("Current reveal renamed");
  });
  await pdfViewer
    .locator("li", { hasText: "Current reveal" })
    .getByRole("button", { name: "Rename" })
    .click();
  await expect(page.getByText("Current reveal renamed")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await pdfViewer
    .locator("li", { hasText: "Current reveal renamed" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Current reveal renamed")).toHaveCount(0);
});

test("PDF page and bookmark links route from rich content without leaking controls to screen", async ({
  page,
  context
}) => {
  await page.goto("/");

  await openFolderFile(page, "Notes", /pdf-links\.md/);
  await page.getByRole("link", { name: "Page two" }).click();
  await expect(page.locator(".pdf-viewer")).toBeVisible();
  await expect(page.getByLabel("Page number")).toHaveValue("2");

  await openFolderFile(page, "Notes", /pdf-links\.md/);
  await page.getByRole("link", { name: "Bandit stat block" }).click();
  await expect(page.getByLabel("Page number")).toHaveValue("2");

  await openFolderFile(page, "Notes", /pdf-links\.md/);
  await page.getByRole("link", { name: "Missing bookmark" }).click();
  await expect(page.getByText("Bookmark not found.")).toBeVisible();

  await openFolderFile(page, "Tables", /pdf-links\.csv/);
  await page.getByRole("link", { name: "Bandit stat block" }).click();
  await expect(page.getByLabel("Page number")).toHaveValue("2");

  await openFolderFile(page, "Cards", /PDF Reference\.cs/);
  await page.getByRole("link", { name: "Bandit stat block" }).click();
  await expect(page.getByLabel("Page number")).toHaveValue("2");

  const screenPage = await context.newPage();
  await screenPage.goto("/screen");
  await expect(screenPage.locator(".pdf-bookmarks")).toHaveCount(0);
  await expect(screenPage.getByRole("button", { name: "Add" })).toHaveCount(0);
  await screenPage.close();
});
