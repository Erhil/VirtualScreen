from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.paths import WorldPathError
from app.core.pdf_bookmarks import (
    PdfBookmark,
    load_pdf_bookmarks,
    save_pdf_bookmarks,
)

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]
JsonBody = Annotated[Any, Body()]


class PdfBookmarkResponse(BaseModel):
    id: str
    label: str
    page: int
    note: str | None = None
    created_at: str
    updated_at: str


class PdfBookmarkStateResponse(BaseModel):
    bookmarks: list[PdfBookmarkResponse]


def _bookmark_response(bookmark: PdfBookmark) -> PdfBookmarkResponse:
    return PdfBookmarkResponse(
        id=bookmark.id,
        label=bookmark.label,
        page=bookmark.page,
        note=bookmark.note,
        created_at=bookmark.created_at,
        updated_at=bookmark.updated_at,
    )


@router.get("/pdf/bookmarks", response_model=PdfBookmarkStateResponse)
def pdf_bookmarks(path: str, settings: SettingsDep) -> PdfBookmarkStateResponse:
    try:
        bookmarks = load_pdf_bookmarks(settings.resolved_world_root, path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PDF file was not found.") from exc
    except (ValueError, WorldPathError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PdfBookmarkStateResponse(
        bookmarks=[_bookmark_response(bookmark) for bookmark in bookmarks]
    )


@router.put("/pdf/bookmarks", response_model=PdfBookmarkStateResponse)
def update_pdf_bookmarks(
    path: str,
    settings: SettingsDep,
    payload: JsonBody,
) -> PdfBookmarkStateResponse:
    try:
        bookmarks = save_pdf_bookmarks(settings.resolved_world_root, path, payload)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PDF file was not found.") from exc
    except (ValueError, WorldPathError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PdfBookmarkStateResponse(
        bookmarks=[_bookmark_response(bookmark) for bookmark in bookmarks]
    )
