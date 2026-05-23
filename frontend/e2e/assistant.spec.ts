import { expect, test } from "@playwright/test";
import type { Locator, Page, Route } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copySampleWorldSeed, resetWorldDirectory } from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");

const ASSISTANT_NAME = /Assistant|AI Assistant|LLM|Ассистент|ИИ/i;
const GENERATE_NAME = /Generate|Run|Ask|Сгенерировать|Запустить|Спросить/i;
const CONTEXT_NAME = /Context sent|Context preview|Provider context|Контекст/i;

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World") {
      rmSync(resolve(e2eWorldsRoot, entry), { force: true, recursive: true });
    }
  }
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  mkdirSync(resolve(e2eWorld, "Notes"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Cards"), { recursive: true });
  writeFileSync(
    resolve(e2eWorld, "README.md"),
    [
      "# Active Assistant Context",
      "",
      "Visible active-document token: active-context-token.",
      "Only this document should be sent after the DM explicitly adds it."
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Notes", "hidden-rag-source.md"),
    "# Hidden RAG Source\n\nsilent-world-rag-token must never reach the provider payload.\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Cards", "Hidden Card.cs"),
    JSON.stringify(
      {
        version: 1,
        title: "Hidden Card",
        kind: "Secret",
        fields: [{ name: "Secret", value: "card-only-secret-token" }]
      },
      null,
      2
    ),
    "utf-8"
  );
}

test.beforeEach(async ({ request }) => {
  resetE2eWorld();
  await request.post("/api/worlds/open", { data: { id: "E2E World" } });
  await request.post("/api/index/rebuild");
  await request.put("/api/workspace/tabs", { data: { tabs: [], activePath: null } });
  await request.put("/api/workspace/layout", {
    data: {
      layout: {
        mode: "single",
        activePaneId: "main",
        panes: [
          { id: "main", activePath: null },
          { id: "secondary", activePath: null }
        ],
        splitRatio: 0.5
      }
    }
  });
});

function worldTree(page: Page) {
  return page.locator(".world-tree");
}

function toolsPanel(page: Page) {
  return page.getByRole("complementary", { name: /DM Tools|Инструменты/i });
}

async function openAssistant(page: Page) {
  const visibleRegion = page.getByRole("region", { name: ASSISTANT_NAME }).first();
  if ((await visibleRegion.count()) > 0 && (await visibleRegion.isVisible())) {
    return visibleRegion;
  }

  let trigger = toolsPanel(page).getByRole("button", { name: ASSISTANT_NAME }).first();
  if ((await trigger.count()) === 0) {
    trigger = page.getByRole("button", { name: ASSISTANT_NAME }).first();
  }
  await expect(trigger).toBeVisible();

  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    await trigger.click();
  }

  await expect(visibleRegion).toBeVisible();
  return visibleRegion;
}

async function openReadme(page: Page) {
  const readme = worldTree(page).getByRole("button", { name: /README\.md|Active Assistant Context/ });
  await expect(readme).toBeVisible();
  await readme.click();
  await expect(page.getByRole("heading", { name: "Active Assistant Context" })).toBeVisible();
}

async function selectPromptForm(assistant: Locator, formId: string, label: RegExp) {
  const select = assistant.locator("select").first();
  if ((await select.count()) > 0 && (await select.isVisible())) {
    const optionByValue = select.locator(`option[value="${formId}"]`).first();
    if ((await optionByValue.count()) > 0) {
      await select.selectOption(formId);
      return;
    }
    const optionByLabel = select.locator("option").filter({ hasText: label }).first();
    await expect(optionByLabel).toHaveCount(1);
    const value = await optionByLabel.getAttribute("value");
    await select.selectOption(value ?? { label: await optionByLabel.innerText() });
    return;
  }

  await assistant.getByRole("button", { name: label }).click();
}

async function fillFirstVisibleField(container: Locator, label: RegExp, value: string) {
  let field = container.getByLabel(label).first();
  if ((await field.count()) === 0) {
    field = container.locator("textarea, input[type='text']").first();
  }
  await expect(field).toBeVisible();
  await field.fill(value);
}

async function clickGenerate(assistant: Locator) {
  const generate = assistant.getByRole("button", { name: GENERATE_NAME }).first();
  await expect(generate).toBeEnabled();
  await generate.click();
}

async function saveDraft(page: Page, assistant: Locator, kind: "Note" | "Card", path: string) {
  let saveKindSelect = assistant.locator(".assistant-save-grid select").first();
  if ((await saveKindSelect.count()) === 0) {
    saveKindSelect = assistant.getByLabel(/Save as|Сохранить как/i).first();
  }
  if ((await saveKindSelect.count()) > 0 && (await saveKindSelect.isVisible())) {
    await saveKindSelect.selectOption(kind === "Card" ? "card" : "markdown");
  }

  const saveButton = assistant
    .getByRole("button", {
      name:
        kind === "Note"
          ? /Save as Note|Save Note|Create Note|Сохранить.*замет|Создать.*замет/i
          : /Save as Card|Save Card|Create Card|Сохранить.*карт|Создать.*карт/i
    })
    .first();
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await page.waitForTimeout(100);
  let saveSurface = page
    .getByRole("dialog", {
      name:
        kind === "Note"
          ? /Save.*Note|Create.*Note|Сохранить.*замет|Создать.*замет/i
          : /Save.*Card|Create.*Card|Сохранить.*карт|Создать.*карт/i
    })
    .first();
  if ((await saveSurface.count()) === 0 || !(await saveSurface.isVisible())) {
    saveSurface = assistant;
  }

  let pathInput = saveSurface.locator(".assistant-save-grid input").first();
  if ((await pathInput.count()) === 0) {
    pathInput = saveSurface.getByLabel(/Path|File path|New file path|Путь|Файл/i).first();
  }
  if ((await pathInput.count()) === 0) {
    pathInput = saveSurface.locator("input[type='text']").last();
  }
  await expect(pathInput).toBeVisible();
  await pathInput.fill(path);

  await saveSurface
    .getByRole("button", { name: /Save|Create|Confirm|Сохранить|Создать|Подтвердить/i })
    .last()
    .click();
}

async function useActiveDocumentContext(assistant: Locator) {
  const explicitButton = assistant.locator(".assistant-context-row button").first();
  if ((await explicitButton.count()) > 0 && (await explicitButton.isVisible())) {
    await explicitButton.click();
    return;
  }
  await assistant
    .getByRole("button", { name: /Use active document|Add active document|Include active|Current document|Актив/i })
    .click();
}

type AssistantMockOptions = {
  configured: boolean;
};

async function mockAssistantApi(page: Page, options: AssistantMockOptions) {
  const generateRequests: unknown[] = [];
  const languageOptions = [
    { code: "en", label: "English", native_label: "English" },
    { code: "ru", label: "Russian", native_label: "Русский" }
  ];
  const config = {
    status: options.configured ? "ready" : "unavailable",
    available: options.configured,
    ready: options.configured,
    enabled: options.configured,
    configured: options.configured,
    provider: options.configured ? "openai_compatible" : null,
    base_url: options.configured ? "http://127.0.0.1:11434/v1" : null,
    model: options.configured ? "mock-assistant-model" : null,
    message: options.configured ? null : "LLM assistant is not configured."
  };
  const forms = [
    {
      id: "summarize",
      name: "Summarize current/selected material",
      title: "Summarize current/selected material",
      description: "Summarize only the visible context selected by the DM.",
      output_kind: "markdown",
      outputKind: "markdown",
      context_policy: "explicit",
      fields: {
        focus: {
          label: "Focus",
          input_type: "textarea",
          type: "textarea",
          required: false,
          default: ""
        },
        audience: {
          label: "Audience",
          input_type: "text",
          type: "text",
          required: false,
          default: ""
        }
      }
    },
    {
      id: "draft-card",
      name: "Draft card from form inputs",
      title: "Draft card from form inputs",
      description: "Draft a temporary card JSON object.",
      output_kind: "card",
      outputKind: "card",
      context_policy: "manual",
      fields: {
        title: {
          label: "Name",
          input_type: "text",
          type: "text",
          required: true,
          default: "Assistant Draft Contact"
        },
        cardKind: {
          label: "Card kind",
          input_type: "select",
          type: "select",
          required: true,
          default: "npc",
          options: ["npc", "location", "item", "card"]
        }
      }
    }
  ];

  await page.route("**/api/app/config", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        language: "en",
        available_languages: languageOptions,
        assistant: config
      }
    });
  });

  async function fulfillGeneration(route: Route) {
    const request = route.request();
    const body = request.postDataJSON();
    generateRequests.push(body);
    const bodyText = JSON.stringify(body);
    const card = {
      version: 1,
      title: "Assistant Draft Contact",
      kind: "NPC",
      fields: [{ name: "Hook", value: "Generated from explicit form inputs." }]
    };
    const isCard = bodyText.includes("draft-card");
    await route.fulfill({
      contentType: "application/json",
      json: isCard
        ? {
            id: "mock-card-output",
            output_kind: "card",
            outputKind: "card",
            title: "Assistant Draft Contact",
            content: JSON.stringify(card, null, 2),
            text: JSON.stringify(card, null, 2),
            card,
            draft_card: card,
            provider: "mock",
            model: "mock-assistant-model",
            created_at: "2026-05-20T00:00:00Z"
          }
        : {
            id: "mock-note-output",
            output_kind: "markdown",
            outputKind: "markdown",
            title: "Generated Harbor Note",
            content: "# Generated Harbor Note\n\nThis used active-context-token only.",
            text: "# Generated Harbor Note\n\nThis used active-context-token only.",
            markdown: "# Generated Harbor Note\n\nThis used active-context-token only.",
            provider: "mock",
            model: "mock-assistant-model",
            created_at: "2026-05-20T00:00:00Z"
          }
    });
  }

  await page.route("**/api/assistant/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && (path.endsWith("/status") || path.endsWith("/config"))) {
      await route.fulfill({ contentType: "application/json", json: config });
      return;
    }
    if (request.method() === "GET" && path.endsWith("/forms")) {
      await route.fulfill({ contentType: "application/json", json: { forms } });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/generate")) {
      await fulfillGeneration(route);
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/llm/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && path.endsWith("/config")) {
      await route.fulfill({ contentType: "application/json", json: config });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/generate")) {
      await fulfillGeneration(route);
      return;
    }
    await route.fallback();
  });

  return { generateRequests };
}

test("disabled provider config leaves the assistant visible but inert", async ({ page }) => {
  const assistantMock = await mockAssistantApi(page, { configured: false });

  await page.goto("/");
  await expect(worldTree(page)).toBeVisible();
  const assistant = await openAssistant(page);

  await expect(assistant).toContainText(/not configured|disabled|configure|provider|VIRTUALSCREEN/i);
  await expect(assistant.getByRole("button", { name: GENERATE_NAME })).toHaveCount(0);
  await expect(assistant.locator("textarea, select, input[type='text']")).toHaveCount(0);
  expect(assistantMock.generateRequests).toHaveLength(0);
});

test("configured prompt forms send only explicit active-document context", async ({ page }) => {
  const assistantMock = await mockAssistantApi(page, { configured: true });

  await page.goto("/");
  await expect(worldTree(page)).toBeVisible();
  await openReadme(page);
  const assistant = await openAssistant(page);
  await selectPromptForm(assistant, "summarize", /Summarize current\/selected material|Summarize/i);

  await expect(assistant).not.toContainText("active-context-token");
  await useActiveDocumentContext(assistant);
  const contextPreview = assistant.getByRole("region", { name: CONTEXT_NAME }).first();
  await expect(assistant).toContainText("README.md");
  await expect(contextPreview).toContainText("active-context-token");
  await expect(contextPreview).not.toContainText("silent-world-rag-token");

  await fillFirstVisibleField(assistant, /Focus|Instruction|Request|Запрос/i, "Summarize the clue.");
  await clickGenerate(assistant);

  await expect(assistant).toContainText("Generated Harbor Note");
  await expect.poll(() => assistantMock.generateRequests.length).toBe(1);
  const payloadText = JSON.stringify(assistantMock.generateRequests[0]);
  expect(payloadText).toContain("README.md");
  expect(payloadText).toContain("active-context-token");
  expect(payloadText).not.toContain("silent-world-rag-token");
  expect(payloadText).not.toContain("card-only-secret-token");
});

test("generated markdown and card drafts require explicit save confirmation", async ({ page }) => {
  await mockAssistantApi(page, { configured: true });

  await page.goto("/");
  await expect(worldTree(page)).toBeVisible();
  await openReadme(page);
  const assistant = await openAssistant(page);
  await selectPromptForm(assistant, "summarize", /Summarize current\/selected material|Summarize/i);
  await useActiveDocumentContext(assistant);
  await fillFirstVisibleField(assistant, /Focus|Instruction|Request|Запрос/i, "Write a table note.");
  await clickGenerate(assistant);
  await expect(assistant).toContainText("Generated Harbor Note");

  const notePath = resolve(e2eWorld, "Notes", "Assistant Saved Note.md");
  expect(existsSync(notePath)).toBe(false);
  await saveDraft(page, assistant, "Note", "Notes/Assistant Saved Note.md");
  await expect.poll(() => existsSync(notePath)).toBe(true);
  expect(readFileSync(notePath, "utf-8")).toContain("Generated Harbor Note");

  await selectPromptForm(assistant, "draft-card", /Draft card from form inputs|Draft Card/i);
  await fillFirstVisibleField(assistant, /Name|Title|Card name|Название|Имя/i, "Assistant Draft Contact");
  await clickGenerate(assistant);
  await expect(assistant).toContainText("Assistant Draft Contact");

  const cardPath = resolve(e2eWorld, "Cards", "Assistant Draft Card.cs");
  expect(existsSync(cardPath)).toBe(false);
  await saveDraft(page, assistant, "Card", "Cards/Assistant Draft Card.cs");
  await expect.poll(() => existsSync(cardPath)).toBe(true);
  expect(readFileSync(cardPath, "utf-8")).toContain("Assistant Draft Contact");
});

test("Russian assistant layout fits supported desktop sizes", async ({ page }) => {
  await mockAssistantApi(page, { configured: true });

  await page.addInitScript(() => {
    window.localStorage.setItem("virtualscreen.uiLanguage", "ru");
  });
  await page.goto("/");
  await expect(worldTree(page)).toBeVisible();

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 }
  ]) {
    await page.setViewportSize(viewport);
    const assistant = await openAssistant(page);
    await expect(assistant).toBeVisible();
    const box = await assistant.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await expect(assistant.getByRole("button", { name: GENERATE_NAME }).first()).toBeVisible();
    await expect(assistant).not.toContainText("[[");
    const hasHorizontalOverflow = await assistant.evaluate(
      (element) => element.scrollWidth > element.clientWidth + 2
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});

test("player screen never exposes assistant controls or calls assistant APIs", async ({ page }) => {
  const assistantRequests: string[] = [];
  await page.route("**/api/assistant/**", async (route) => {
    assistantRequests.push(route.request().url());
    await route.fulfill({ status: 500, body: "assistant API must stay DM-only" });
  });

  await page.goto("/screen");

  await expect(page.getByRole("main", { name: /Player Screen|Экран игрока/i })).toBeVisible();
  await expect(page.getByRole("button", { name: ASSISTANT_NAME })).toHaveCount(0);
  await expect(page.getByRole("region", { name: ASSISTANT_NAME })).toHaveCount(0);
  expect(assistantRequests).toEqual([]);
});
