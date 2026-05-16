import json
import re
from dataclasses import dataclass
from pathlib import Path

from app.core.database import initialize_database
from app.core.index import ensure_index

MATCH_SCORES = {
    "title": 100,
    "alias": 90,
    "tag": 80,
    "metadata": 70,
    "path": 60,
    "body": 50,
}


@dataclass(frozen=True)
class SearchResult:
    path: str
    name: str
    extension: str | None
    media_kind: str
    title: str
    page_type: str | None
    tags: list[str]
    aliases: list[str]
    snippet: str | None
    match_reason: str
    score: int


def _tokens(query: str) -> list[str]:
    return re.findall(r"[\w]+", query.lower(), flags=re.UNICODE)


def _fts_query(query: str) -> str:
    tokens = _tokens(query)
    return " AND ".join(f"{token}*" for token in tokens)


def _json_list(value: str) -> list[str]:
    loaded = json.loads(value)
    return [str(item) for item in loaded] if isinstance(loaded, list) else []


def _json_text(value: str) -> str:
    return json.dumps(json.loads(value), ensure_ascii=False)


def _contains(text: str, query: str, tokens: list[str]) -> bool:
    lowered = text.lower()
    query_lower = query.lower()
    return query_lower in lowered or all(token in lowered for token in tokens)


def _reason(row, query: str, tokens: list[str]) -> str:
    aliases = _json_list(row["aliases_json"])
    tags = _json_list(row["tags_json"])
    metadata = _json_text(row["metadata_json"]) + " " + _json_text(row["fields_json"])

    if _contains(row["title"], query, tokens):
        return "title"
    if any(_contains(alias, query, tokens) for alias in aliases):
        return "alias"
    if any(_contains(tag, query, tokens) for tag in tags):
        return "tag"
    if _contains(metadata, query, tokens):
        return "metadata"
    if _contains(row["path"], query, tokens):
        return "path"
    return "body"


def _snippet(body: str, query: str, tokens: list[str]) -> str | None:
    if not body:
        return None

    lowered = body.lower()
    query_lower = query.lower()
    index = lowered.find(query_lower)
    if index == -1:
        indices = [lowered.find(token) for token in tokens if lowered.find(token) != -1]
        index = min(indices) if indices else 0

    start = max(index - 48, 0)
    end = min(index + max(len(query), 24) + 48, len(body))
    snippet = body[start:end].strip()
    if start > 0:
        snippet = f"...{snippet}"
    if end < len(body):
        snippet = f"{snippet}..."
    return snippet


def _passes_filters(row, file_type: str | None, tag: str | None, folder: str | None) -> bool:
    if file_type and file_type not in {row["media_kind"], row["page_type"]}:
        return False
    if tag and tag not in _json_list(row["tags_json"]):
        return False
    if folder and not row["path"].startswith(f"{folder}/"):
        return False
    return True


def search_index(
    root: Path,
    query: str,
    file_type: str | None = None,
    tag: str | None = None,
    folder: str | None = None,
    limit: int = 20,
) -> list[SearchResult]:
    ensure_index(root)
    conn = initialize_database(root)
    fts_query = _fts_query(query)
    if not fts_query:
        conn.close()
        return []

    rows = conn.execute(
        """
        select p.*
        from search_fts
        join pages p on p.id = search_fts.rowid
        where search_fts match ?
        limit ?
        """,
        (fts_query, max(limit * 4, 20)),
    ).fetchall()
    conn.close()

    tokens = _tokens(query)
    results: list[SearchResult] = []
    seen_paths: set[str] = set()
    for row in rows:
        if row["path"] in seen_paths or not _passes_filters(row, file_type, tag, folder):
            continue
        seen_paths.add(row["path"])
        aliases = _json_list(row["aliases_json"])
        tags = _json_list(row["tags_json"])
        reason = _reason(row, query, tokens)
        results.append(
            SearchResult(
                path=row["path"],
                name=row["name"],
                extension=row["extension"],
                media_kind=row["media_kind"],
                title=row["title"],
                page_type=row["page_type"],
                tags=tags,
                aliases=aliases,
                snippet=_snippet(row["body"], query, tokens),
                match_reason=reason,
                score=MATCH_SCORES[reason],
            )
        )

    results.sort(key=lambda result: (-result.score, result.path.lower()))
    return results[:limit]
