from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    app_config,
    audio,
    auth,
    capture,
    card_templates,
    dice,
    display,
    events,
    fast_slots,
    health,
    indexing,
    llm,
    map,
    pages,
    prep_health,
    scenarios,
    scripts,
    search,
    system_packs,
    table_snapshots,
    workspace,
    world,
    worlds,
)
from app.core.auth import AuthMiddleware
from app.core.config import get_settings
from app.core.watcher import WatcherManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    watcher_manager = WatcherManager(settings.watch_world)
    app.state.watcher_manager = watcher_manager
    await watcher_manager.start(settings.resolved_world_root)

    try:
        yield
    finally:
        with suppress(AttributeError):
            await watcher_manager.stop()


def create_app() -> FastAPI:
    app = FastAPI(title="VirtualScreen API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(AuthMiddleware)

    app.include_router(app_config.router, prefix="/api", tags=["app"])
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(auth.router, prefix="/api", tags=["auth"])
    app.include_router(card_templates.router, prefix="/api", tags=["card-templates"])
    app.include_router(dice.router, prefix="/api", tags=["dice"])
    app.include_router(audio.router, prefix="/api", tags=["audio"])
    app.include_router(capture.router, prefix="/api", tags=["capture"])
    app.include_router(fast_slots.router, prefix="/api", tags=["fast-slots"])
    app.include_router(indexing.router, prefix="/api", tags=["index"])
    app.include_router(llm.router, prefix="/api", tags=["llm"])
    app.include_router(map.router, tags=["map"])
    app.include_router(pages.router, prefix="/api", tags=["pages"])
    app.include_router(prep_health.router, prefix="/api", tags=["prep-health"])
    app.include_router(scenarios.router, prefix="/api", tags=["scenarios"])
    app.include_router(scripts.router, prefix="/api", tags=["scripts"])
    app.include_router(search.router, prefix="/api", tags=["search"])
    app.include_router(system_packs.router, prefix="/api", tags=["system-packs"])
    app.include_router(table_snapshots.router, prefix="/api", tags=["table-snapshots"])
    app.include_router(world.router, prefix="/api/world", tags=["world"])
    app.include_router(worlds.router, prefix="/api", tags=["worlds"])
    app.include_router(workspace.router, prefix="/api", tags=["workspace"])
    app.include_router(display.router, tags=["display"])
    app.include_router(events.router, tags=["events"])

    return app


app = create_app()
