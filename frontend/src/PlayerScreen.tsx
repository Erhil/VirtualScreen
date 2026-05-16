import { useEffect, useState, type MouseEvent } from "react";

import { MapCanvas } from "./MapCanvas";
import {
  buildScreenDisplayBackgroundUrl,
  buildScreenMediaUrl,
  fetchScreenDisplayState,
  fetchScreenPageLinks,
  fetchScreenWorldFile,
  type DisplayItem,
  type DisplayState,
  type PageLink,
  type WorldFile
} from "./lib/api";
import { evaluateCardField, parseCard, type StructuredCard } from "./lib/cards";
import { parseCsv } from "./lib/csv";
import {
  buildScreenDisplayEventsUrl,
  createDisplayEventClient,
  displayPopupClassName
} from "./lib/display";
import {
  buildScreenMapMediaUrl,
  createMapEventClient,
  fetchScreenMapState,
  isMapPresenting,
  type MapState
} from "./lib/map";
import { renderRichInline, renderRichMarkdown } from "./lib/richText";

type ScreenFileState =
  | { status: "loading" }
  | { status: "ready"; file: WorldFile; links: PageLink[] }
  | { status: "error"; message: string };

function ScreenRichHtml({ className, html }: { className: string; html: string }) {
  function handleClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as Element | null)?.closest("[data-world-link-index]")) {
      event.preventDefault();
    }
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  );
}

function ScreenTextContent({ item }: { item: DisplayItem }) {
  const [state, setState] = useState<ScreenFileState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([
      fetchScreenWorldFile(item.path),
      item.media_kind === "markdown" ||
      item.media_kind === "card" ||
      item.media_kind === "csv" ||
      item.media_kind === "text"
        ? fetchScreenPageLinks(item.path)
        : Promise.resolve([])
    ])
      .then(([file, links]) => {
        if (!cancelled) {
          setState({ status: "ready", file, links });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load screen content."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item.path, item.media_kind]);

  if (state.status === "loading") {
    return <div className="screen-message">Loading {item.title ?? item.name}...</div>;
  }

  if (state.status === "error") {
    return <div className="screen-message">Content unavailable.</div>;
  }

  if (state.file.media_kind === "markdown") {
    return (
      <ScreenRichHtml
        className="screen-markdown"
        html={renderRichMarkdown(
          state.file.content,
          state.links,
          state.file.path,
          buildScreenMediaUrl
        )}
      />
    );
  }

  if (state.file.media_kind === "csv") {
    const data = parseCsv(state.file.content);
    if (data.headers.length === 0) {
      return <div className="screen-message">CSV file is empty.</div>;
    }
    return (
      <div className="screen-table-wrap">
        <table>
          <thead>
            <tr>
              {data.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={`${row.join("-")}-${rowIndex}`}>
                {data.headers.map((header, cellIndex) => (
                  <td key={`${header}-${cellIndex}`}>
                    <ScreenRichHtml
                      className="rich-inline"
                      html={renderRichInline(
                        row[cellIndex] ?? "",
                        state.links,
                        state.file.path,
                        buildScreenMediaUrl
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (state.file.media_kind === "card") {
    try {
      return (
        <ScreenCardContent card={parseCard(state.file.content)} file={state.file} links={state.links} />
      );
    } catch {
      return <pre className="screen-text">{state.file.content}</pre>;
    }
  }

  return <pre className="screen-text">{state.file.content}</pre>;
}

function ScreenCardContent({
  card,
  file,
  links
}: {
  card: StructuredCard;
  file: WorldFile;
  links: PageLink[];
}) {
  return (
    <article className="screen-card">
      <header>
        <h1>{card.title || file.name.replace(/\.cs$/i, "")}</h1>
        <p>{card.kind || "card"}</p>
        {card.tags.length > 0 && (
          <ul>
            {card.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </header>
      {card.sections.map((section, sectionIndex) => (
        <section key={`${section.title}-${sectionIndex}`}>
          <h2>{section.title || "Untitled section"}</h2>
          <dl>
            {section.fields.map((field, fieldIndex) => (
              <div className="card-field-row" key={`${field.label}-${fieldIndex}`}>
                <dt>{field.label || "Untitled field"}</dt>
                <dd>
                  {field.type === "computed" ? (
                    (() => {
                      const result = evaluateCardField(card, field);
                      return result?.ok ? (
                        <span className="card-field-value card-computed-value">{result.display}</span>
                      ) : (
                        <span className="card-formula-error" role="note">
                          {result?.message ?? "Invalid formula."}
                        </span>
                      );
                    })()
                  ) : (
                    <ScreenRichHtml
                      className="rich-inline"
                      html={renderRichInline(field.value, links, file.path, buildScreenMediaUrl)}
                    />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </article>
  );
}

function ScreenContent({ item }: { item: DisplayItem }) {
  const label = item.title ?? item.name;

  if (item.media_kind === "image") {
    return <img alt={label} src={buildScreenMediaUrl(item.path)} />;
  }

  if (item.media_kind === "video") {
    return (
      <video
        aria-label={label}
        autoPlay
        loop
        muted
        playsInline
        src={buildScreenMediaUrl(item.path)}
      />
    );
  }

  if (item.media_kind === "pdf") {
    return <iframe aria-label={label} src={buildScreenMediaUrl(item.path)} title={label} />;
  }

  if (
    item.media_kind === "markdown" ||
    item.media_kind === "card" ||
    item.media_kind === "csv" ||
    item.media_kind === "text"
  ) {
    return <ScreenTextContent item={item} />;
  }

  return <div className="screen-message">Unsupported screen content.</div>;
}

export function PlayerScreen() {
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);
  const [mapState, setMapState] = useState<MapState | null>(null);

  useEffect(() => {
    fetchScreenDisplayState()
      .then(setDisplayState)
      .catch(() => {});
    return createDisplayEventClient({
      onEvent: setDisplayState,
      url: buildScreenDisplayEventsUrl()
    });
  }, []);

  useEffect(() => {
    fetchScreenMapState()
      .then(setMapState)
      .catch(() => {});
    return createMapEventClient({
      onEvent: setMapState
    });
  }, []);

  const fullscreen = displayState?.fullscreen ?? null;
  const presentedMap = isMapPresenting(mapState) ? mapState : null;
  const blankBackgroundStyle = fullscreen || presentedMap
    ? undefined
    : {
        backgroundImage: `url("${buildScreenDisplayBackgroundUrl(displayState?.updated_at ?? null)}")`
      };

  return (
    <main className="player-screen" aria-label="Player Screen">
      <section
        aria-label="Fullscreen Display"
        className={
          fullscreen || presentedMap
            ? "screen-fullscreen"
            : "screen-fullscreen screen-fullscreen-blank"
        }
        style={blankBackgroundStyle}
      >
        {presentedMap ? (
          <MapCanvas
            className="screen-map screen-map-canvas"
            mediaUrlBuilder={buildScreenMapMediaUrl}
            mode="player"
            state={presentedMap}
          />
        ) : fullscreen ? (
          <ScreenContent item={fullscreen} />
        ) : (
          <div className="screen-message">Blank Screen</div>
        )}
      </section>
      {displayState?.popups.filter((popup) => popup.visible !== false).map((popup) => (
        <section
          aria-label={`Popup ${popup.title ?? popup.name}`}
          className={displayPopupClassName(popup)}
          key={popup.id}
        >
          <ScreenContent item={popup} />
        </section>
      ))}
    </main>
  );
}
