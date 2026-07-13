from __future__ import annotations

import importlib
import logging
import pkgutil
from dataclasses import dataclass

from fastapi import APIRouter, FastAPI

from app import plugins as plugins_pkg

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class BackendPlugin:
    """Capability manifest exposed by a plugin package as module-level `PLUGIN`.

    Future capabilities (e.g. dms_verbs) get added here as additional fields.
    """

    id: str
    router: APIRouter | None = None


def discover_plugins() -> list[BackendPlugin]:
    plugins: list[BackendPlugin] = []

    for module_info in pkgutil.iter_modules(plugins_pkg.__path__, plugins_pkg.__name__ + "."):
        if not module_info.ispkg:
            continue

        module_name = f"{module_info.name}.plugin"
        try:
            module = importlib.import_module(module_name)
            plugin = getattr(module, "PLUGIN", None)
        except ModuleNotFoundError as exc:
            if exc.name == module_name:
                logger.debug("Subpackage %s has no plugin.py; skipping", module_info.name)
            else:
                logger.exception(
                    "Plugin %s failed to import a dependency; skipping", module_info.name
                )
            continue
        except Exception:  # noqa: BLE001 - a broken plugin must never crash startup
            logger.exception("Failed to load plugin %s; skipping", module_info.name)
            continue

        if isinstance(plugin, BackendPlugin):
            plugins.append(plugin)
        else:
            logger.warning("Plugin %s exposes no BackendPlugin PLUGIN; skipping", module_info.name)

    return sorted(plugins, key=lambda plugin: plugin.id)


def register_plugins(app: FastAPI) -> list[str]:
    registered: list[str] = []
    for plugin in discover_plugins():
        try:
            if plugin.router is not None:
                app.include_router(plugin.router, prefix="/api", tags=[f"plugin:{plugin.id}"])
        except Exception:  # noqa: BLE001 - a broken plugin must never crash startup
            logger.exception("Failed to mount plugin %s; skipping", plugin.id)
            continue
        registered.append(plugin.id)
    logger.info("Registered %d plugin(s): %s", len(registered), registered)
    return registered
