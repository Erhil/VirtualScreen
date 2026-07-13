import logging
import pkgutil
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import APIRouter, FastAPI

from app.core.plugins import BackendPlugin, discover_plugins, register_plugins


def _fake_module_infos() -> list[pkgutil.ModuleInfo]:
    return [
        pkgutil.ModuleInfo(module_finder=None, name="app.plugins.good", ispkg=True),
        pkgutil.ModuleInfo(module_finder=None, name="app.plugins.broken", ispkg=True),
        pkgutil.ModuleInfo(module_finder=None, name="app.plugins.nomanifest", ispkg=True),
    ]


def _fake_import_module(name: str) -> SimpleNamespace:
    if name == "app.plugins.good.plugin":
        return SimpleNamespace(PLUGIN=BackendPlugin(id="good", router=APIRouter()))
    if name == "app.plugins.broken.plugin":
        raise RuntimeError("boom")
    if name == "app.plugins.nomanifest.plugin":
        return SimpleNamespace()
    raise ImportError(name)


def test_discover_plugins_skips_broken_and_manifestless(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.core.plugins.pkgutil.iter_modules", lambda *a, **k: _fake_module_infos()
    )
    monkeypatch.setattr("app.core.plugins.importlib.import_module", _fake_import_module)

    plugins = discover_plugins()

    assert len(plugins) == 1
    assert plugins[0].id == "good"


def test_register_plugins_mounts_router(monkeypatch: pytest.MonkeyPatch) -> None:
    good_router = APIRouter()

    @good_router.get("/plugins/good/ping")
    def _ping() -> dict[str, str]:
        return {"status": "ok"}

    def fake_import_module(name: str) -> SimpleNamespace:
        if name == "app.plugins.good.plugin":
            return SimpleNamespace(PLUGIN=BackendPlugin(id="good", router=good_router))
        if name == "app.plugins.broken.plugin":
            raise RuntimeError("boom")
        if name == "app.plugins.nomanifest.plugin":
            return SimpleNamespace()
        raise ImportError(name)

    monkeypatch.setattr(
        "app.core.plugins.pkgutil.iter_modules", lambda *a, **k: _fake_module_infos()
    )
    monkeypatch.setattr("app.core.plugins.importlib.import_module", fake_import_module)

    app = FastAPI()
    ids = register_plugins(app)

    assert ids == ["good"]
    assert "/api/plugins/good/ping" in [route.path for route in app.routes]


def test_discover_and_register_are_empty_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.core.plugins.pkgutil.iter_modules", lambda *a, **k: [])

    assert discover_plugins() == []
    assert register_plugins(FastAPI()) == []


def test_discover_and_register_real_scan_does_not_raise() -> None:
    """Exercises the real app.plugins.__path__ scan (no monkeypatching)."""
    plugins = discover_plugins()
    assert isinstance(plugins, list)

    ids = register_plugins(FastAPI())
    assert isinstance(ids, list)


def test_register_plugins_contains_bad_router(monkeypatch: pytest.MonkeyPatch) -> None:
    good_router = APIRouter()

    @good_router.get("/plugins/good/ping")
    def _ping() -> dict[str, str]:
        return {"status": "ok"}

    # cast(...) bypasses the dataclass field's declared APIRouter type so we can
    # simulate a plugin that passes the BackendPlugin isinstance check but carries
    # a router object that blows up when FastAPI tries to mount it.
    bad_plugin = BackendPlugin(id="bad", router=cast(APIRouter, object()))
    good_plugin = BackendPlugin(id="good", router=good_router)

    monkeypatch.setattr(
        "app.core.plugins.discover_plugins", lambda: [bad_plugin, good_plugin]
    )

    app = FastAPI()
    ids = register_plugins(app)

    assert "bad" not in ids
    assert "good" in ids
    assert "/api/plugins/good/ping" in [route.path for route in app.routes]


def test_register_plugins_handles_id_only_plugin(monkeypatch: pytest.MonkeyPatch) -> None:
    idonly_plugin = BackendPlugin(id="idonly", router=None)

    monkeypatch.setattr("app.core.plugins.discover_plugins", lambda: [idonly_plugin])

    app = FastAPI()
    routes_before = list(app.routes)
    ids = register_plugins(app)

    assert ids == ["idonly"]
    assert list(app.routes) == routes_before


def test_discover_plugins_skips_wrong_type_plugin(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_import_module(name: str) -> SimpleNamespace:
        if name == "app.plugins.wrongtype.plugin":
            return SimpleNamespace(PLUGIN="nope")
        raise ImportError(name)

    monkeypatch.setattr(
        "app.core.plugins.pkgutil.iter_modules",
        lambda *a, **k: [
            pkgutil.ModuleInfo(module_finder=None, name="app.plugins.wrongtype", ispkg=True),
        ],
    )
    monkeypatch.setattr("app.core.plugins.importlib.import_module", fake_import_module)

    assert discover_plugins() == []


def test_discover_plugins_quietly_skips_subpackage_without_plugin_module(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def fake_import_module(name: str) -> SimpleNamespace:
        # A sibling/util subpackage with no plugin.py: the missing module IS
        # the plugin module itself, so it should be a quiet debug skip.
        raise ModuleNotFoundError(f"No module named '{name}'", name=name)

    monkeypatch.setattr(
        "app.core.plugins.pkgutil.iter_modules",
        lambda *a, **k: [
            pkgutil.ModuleInfo(module_finder=None, name="app.plugins.util", ispkg=True),
        ],
    )
    monkeypatch.setattr("app.core.plugins.importlib.import_module", fake_import_module)

    with caplog.at_level(logging.DEBUG, logger="app.core.plugins"):
        assert discover_plugins() == []

    assert any(
        record.levelno == logging.DEBUG and "has no plugin.py" in record.getMessage()
        for record in caplog.records
    )
    assert not any(record.levelno >= logging.ERROR for record in caplog.records)


def test_discover_plugins_logs_missing_dependency_as_error(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def fake_import_module(name: str) -> SimpleNamespace:
        # plugin.py exists but imports a missing third-party dependency: the
        # missing module name differs from the plugin module, so it's a real error.
        raise ModuleNotFoundError("No module named 'somedep'", name="somedep")

    monkeypatch.setattr(
        "app.core.plugins.pkgutil.iter_modules",
        lambda *a, **k: [
            pkgutil.ModuleInfo(module_finder=None, name="app.plugins.needsdep", ispkg=True),
        ],
    )
    monkeypatch.setattr("app.core.plugins.importlib.import_module", fake_import_module)

    with caplog.at_level(logging.DEBUG, logger="app.core.plugins"):
        assert discover_plugins() == []

    assert any(
        record.levelno >= logging.ERROR and "failed to import a dependency" in record.getMessage()
        for record in caplog.records
    )


def test_discover_plugins_survives_raising_module_getattr(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class _RaisingModule:
        def __getattr__(self, name: str) -> object:
            raise RuntimeError(f"module-level __getattr__ boom for {name}")

    def fake_import_module(name: str) -> object:
        if name == "app.plugins.evil.plugin":
            return _RaisingModule()
        raise ImportError(name)

    monkeypatch.setattr(
        "app.core.plugins.pkgutil.iter_modules",
        lambda *a, **k: [
            pkgutil.ModuleInfo(module_finder=None, name="app.plugins.evil", ispkg=True),
        ],
    )
    monkeypatch.setattr("app.core.plugins.importlib.import_module", fake_import_module)

    # Accessing PLUGIN triggers the raising __getattr__; discovery must not crash.
    assert discover_plugins() == []
