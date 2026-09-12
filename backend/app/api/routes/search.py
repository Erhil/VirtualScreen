from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import Settings, get_settings
from app.core.paths import WorldPathError, normalize_relative_path
from app.core.search import SearchResult, search_index

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/search", response_model=list[SearchResult])
def search(
    q: str,
    settings: SettingsDep,
    file_type: Annotated[str | None, Query(alias="type")] = None,
    tag: str | None = None,
    folder: str | None = None,
    limit: int = 20,
) -> list[SearchResult]:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
    if limit < 1:
        raise HTTPException(status_code=400, detail="Search limit must be positive.")

    normalized_folder = None
    if folder:
        try:
            normalized_folder = normalize_relative_path(folder)
        except WorldPathError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return search_index(
        settings.resolved_world_root,
        query,
        file_type=file_type,
        tag=tag,
        folder=normalized_folder,
        limit=min(limit, 100),
    )
