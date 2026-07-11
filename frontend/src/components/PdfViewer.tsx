import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { PDFDocumentLoadingTask } from "pdfjs-dist/types/src/display/api";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

import {
  buildMediaUrl,
  fetchPdfBookmarks,
  savePdfBookmarks,
  type PdfBookmark
} from "../lib/api";
import {
  bookmarkLinkTarget,
  pageLinkTarget,
  parsePdfTarget,
  pdfBookmarkStateWith,
  removePdfBookmark,
  uniqueBookmarkId
} from "../lib/pdfBookmarks";
import type { Translator } from "../lang";
import { IconButton } from "./IconButton";

type PdfViewerProps = {
  name: string;
  path: string;
  target?: string | null;
  t: Translator;
};

type ZoomMode = "manual" | "fit-width";

function nowIso() {
  return new Date().toISOString();
}

function clampPage(page: number, pages: number) {
  return Math.min(Math.max(page, 1), Math.max(pages, 1));
}

export function PdfViewer({ name, path, target, t }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageProxy, setPageProxy] = useState<PDFPageProxy | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-width");
  const [fitWidth, setFitWidth] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookmarks, setBookmarks] = useState<PdfBookmark[]>([]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [bookmarkStatus, setBookmarkStatus] = useState<string | null>(null);

  const pageCount = document?.numPages ?? 0;
  const activeZoom = zoomMode === "fit-width" ? fitWidth : zoom;
  const bookmarkState = useMemo(() => ({ bookmarks }), [bookmarks]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessage(null);
    setDocument(null);
    setPageProxy(null);
    setPage(1);
    setPageInput("1");
    setBookmarks([]);
    setBookmarkStatus(null);

    let loadingTask: PDFDocumentLoadingTask | null = null;
    import("pdfjs-dist")
      .then(({ GlobalWorkerOptions, getDocument }) => {
        if (cancelled) {
          return;
        }
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        loadingTask = getDocument({ url: buildMediaUrl(path) });
        return loadingTask.promise;
      })
      .then((loadedDocument) => {
        if (!loadedDocument) {
          return;
        }
        if (cancelled) {
          return;
        }
        setDocument(loadedDocument);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage(t("pdf.loadError"));
        }
      });

    fetchPdfBookmarks(path)
      .then((state) => {
        if (!cancelled) {
          setBookmarks(state.bookmarks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookmarkStatus(t("pdf.bookmarksLoadError"));
        }
      });

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [path, t]);

  useEffect(() => {
    if (!document) {
      return;
    }
    let cancelled = false;
    document.getPage(clampPage(page, document.numPages)).then((nextPage) => {
      if (!cancelled) {
        setPageProxy(nextPage);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [document, page]);

  useEffect(() => {
    if (!pageProxy || !stageRef.current) {
      return;
    }
    const updateFitWidth = () => {
      const stageWidth = Math.max(stageRef.current?.clientWidth ?? 0, 1);
      const viewport = pageProxy.getViewport({ scale: 1, rotation });
      setFitWidth(Math.max(0.25, Math.min(3, (stageWidth - 32) / viewport.width)));
    };
    updateFitWidth();
    const observer = new ResizeObserver(updateFitWidth);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [pageProxy, rotation]);

  useEffect(() => {
    if (!pageProxy || !canvasRef.current) {
      return;
    }
    let cancelled = false;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const viewport = pageProxy.getViewport({ scale: activeZoom, rotation });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const renderTask = pageProxy.render({ canvas, canvasContext: context, viewport });
    renderTask.promise.catch(() => {
      if (!cancelled) {
        setMessage(t("pdf.renderError"));
      }
    });
    return () => {
      cancelled = true;
      renderTask.cancel();
    };
  }, [activeZoom, pageProxy, rotation, t]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    if (!target || !document) {
      return;
    }
    const parsed = parsePdfTarget(target);
    if (!parsed) {
      return;
    }
    if (parsed.kind === "page") {
      setPage(clampPage(parsed.page, document.numPages));
      setBookmarkStatus(null);
      return;
    }
    const bookmark = bookmarks.find((item) => item.id === parsed.id);
    if (bookmark) {
      setPage(clampPage(bookmark.page, document.numPages));
      setBookmarkStatus(null);
    } else {
      setBookmarkStatus(t("pdf.bookmarkNotFound"));
    }
  }, [bookmarks, document, target, t]);

  async function persist(nextBookmarks: PdfBookmark[], statusText: string) {
    const state = await savePdfBookmarks(path, nextBookmarks);
    setBookmarks(state.bookmarks);
    setBookmarkStatus(statusText);
  }

  async function handleAddBookmark() {
    const label = bookmarkLabel.trim() || t("pdf.defaultBookmarkLabel", { page: String(page) });
    const timestamp = nowIso();
    const bookmark: PdfBookmark = {
      id: uniqueBookmarkId(label, bookmarkState),
      label,
      page,
      note: null,
      created_at: timestamp,
      updated_at: timestamp
    };
    await persist(pdfBookmarkStateWith(bookmarkState, bookmark).bookmarks, t("pdf.bookmarkSaved"));
    setBookmarkLabel("");
  }

  async function handleRenameBookmark(bookmark: PdfBookmark) {
    const nextLabel = window.prompt(t("pdf.renameBookmarkPrompt"), bookmark.label)?.trim();
    if (!nextLabel) {
      return;
    }
    await persist(
      pdfBookmarkStateWith(bookmarkState, {
        ...bookmark,
        label: nextLabel,
        updated_at: nowIso()
      }).bookmarks,
      t("pdf.bookmarkSaved")
    );
  }

  async function handleDeleteBookmark(id: string) {
    if (!window.confirm(t("pdf.deleteBookmarkConfirm"))) {
      return;
    }
    await persist(removePdfBookmark(bookmarkState, id).bookmarks, t("pdf.bookmarkDeleted"));
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setBookmarkStatus(t("pdf.linkCopied"));
    } catch {
      setBookmarkStatus(value);
    }
  }

  function commitPageInput() {
    const nextPage = Number(pageInput);
    if (Number.isInteger(nextPage) && document) {
      setPage(clampPage(nextPage, document.numPages));
    } else {
      setPageInput(String(page));
    }
  }

  return (
    <div className="pdf-viewer pdf-viewer-integrated" data-help-context="document-media" tabIndex={0}>
      <div className="pdf-toolbar" aria-label={t("pdf.toolbar")}>
        <IconButton
          disabled={page <= 1}
          label={t("pdf.previousPage")}
          name="previous"
          onClick={() => setPage((current) => clampPage(current - 1, pageCount))}
        />
        <label className="pdf-page-control">
          <span>{t("pdf.page")}</span>
          <input
            aria-label={t("pdf.pageNumber")}
            inputMode="numeric"
            onBlur={commitPageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitPageInput();
              }
            }}
            value={pageInput}
          />
          <span>{t("pdf.pageCount", { count: String(pageCount || 1) })}</span>
        </label>
        <IconButton
          disabled={page >= pageCount}
          label={t("pdf.nextPage")}
          name="next"
          onClick={() => setPage((current) => clampPage(current + 1, pageCount))}
        />
        <button
          className="button-secondary compact-button"
          onClick={() => {
            setZoomMode("manual");
            setZoom((current) => Math.max(0.25, current - 0.25));
          }}
          type="button"
        >
          {t("pdf.zoomOut")}
        </button>
        <button
          className="button-secondary compact-button"
          onClick={() => {
            setZoomMode("manual");
            setZoom((current) => Math.min(3, current + 0.25));
          }}
          type="button"
        >
          {t("pdf.zoomIn")}
        </button>
        <button
          className="button-secondary compact-button"
          onClick={() => {
            setZoom(1);
            setZoomMode("manual");
          }}
          type="button"
        >
          {t("pdf.resetZoom")}
        </button>
        <button
          className={`button-secondary compact-button${zoomMode === "fit-width" ? " active" : ""}`}
          onClick={() => setZoomMode("fit-width")}
          type="button"
        >
          {t("pdf.fitWidth")}
        </button>
        <IconButton
          label={t("pdf.rotate")}
          name="rotate"
          onClick={() => setRotation((current) => (current + 90) % 360)}
        />
        <button
          className="button-secondary compact-button"
          onClick={() => setSidebarOpen((open) => !open)}
          type="button"
        >
          {sidebarOpen ? t("pdf.hideBookmarks") : t("pdf.showBookmarks")}
        </button>
        <button
          className="button-secondary compact-button"
          onClick={() => void copyText(pageLinkTarget(path, page, `${name} p.${page}`))}
          type="button"
        >
          {t("pdf.copyPageLink")}
        </button>
      </div>

      <div className="pdf-body">
        {sidebarOpen && (
          <aside className="pdf-bookmarks" aria-label={t("pdf.bookmarks")}>
            <div className="pdf-bookmark-add">
              <input
                aria-label={t("pdf.bookmarkLabel")}
                onChange={(event) => setBookmarkLabel(event.target.value)}
                placeholder={t("pdf.bookmarkLabel")}
                value={bookmarkLabel}
              />
              <button
                className="button-secondary compact-button"
                onClick={() => void handleAddBookmark()}
                type="button"
              >
                {t("pdf.addBookmark")}
              </button>
            </div>
            {bookmarks.length ? (
              <ul>
                {bookmarks.map((bookmark) => (
                  <li key={bookmark.id}>
                    <button
                      className="pdf-bookmark-jump"
                      onClick={() => setPage(clampPage(bookmark.page, pageCount))}
                      type="button"
                    >
                      <strong>{bookmark.label}</strong>
                      <span>{t("pdf.bookmarkPage", { page: String(bookmark.page) })}</span>
                    </button>
                    <div className="pdf-bookmark-actions">
                      <button
                        className="button-secondary compact-button"
                        onClick={() => void copyText(bookmarkLinkTarget(path, bookmark.id, bookmark.label))}
                        type="button"
                      >
                        {t("pdf.copyLink")}
                      </button>
                      <button
                        className="button-secondary compact-button"
                        onClick={() => void handleRenameBookmark(bookmark)}
                        type="button"
                      >
                        {t("pdf.renameBookmark")}
                      </button>
                      <button
                        className="button-secondary compact-button danger"
                        onClick={() => void handleDeleteBookmark(bookmark.id)}
                        type="button"
                      >
                        {t("pdf.deleteBookmark")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t("pdf.noBookmarks")}</p>
            )}
            {bookmarkStatus && <p className="pdf-status">{bookmarkStatus}</p>}
          </aside>
        )}

        <div className="pdf-stage" ref={stageRef}>
          {status === "loading" && <div className="empty-surface">{t("pdf.loading")}</div>}
          {status === "error" && <div className="empty-surface">{message ?? t("pdf.loadError")}</div>}
          {status === "ready" && <canvas aria-label={name} className="pdf-canvas" ref={canvasRef} />}
        </div>
      </div>
    </div>
  );
}
