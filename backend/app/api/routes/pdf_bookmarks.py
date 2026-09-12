from collections.abc import Callable
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


class PdfBookmarkStateResponse(BaseModel):
    bookmarks: list[PdfBookmark]


def _bookmarks_or_error(action: Callable[[], list[PdfBookmark]]) -> list[PdfBookmark]:
    try:
        return action()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PDF file was not found.") from exc
    except (ValueError, WorldPathError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/pdf/bookmarks", response_model=PdfBookmarkStateResponse)
def pdf_bookmarks(path: str, settings: SettingsDep) -> PdfBookmarkStateResponse:
    bookmarks = _bookmarks_or_error(
        lambda: load_pdf_bookmarks(settings.resolved_world_root, path)
    )
    return PdfBookmarkStateResponse(bookmarks=bookmarks)


@router.put("/pdf/bookmarks", response_model=PdfBookmarkStateResponse)
def update_pdf_bookmarks(
    path: str,
    settings: SettingsDep,
    payload: JsonBody,
) -> PdfBookmarkStateResponse:
    bookmarks = _bookmarks_or_error(
        lambda: save_pdf_bookmarks(settings.resolved_world_root, path, payload)
    )
    return PdfBookmarkStateResponse(bookmarks=bookmarks)
