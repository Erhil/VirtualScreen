# Image Generation plugin

Generates character and scene art through a **separate SDXL service** you run yourself, and saves the
result into the open world so the Screen tool can put it in front of the players.

Deleting `backend/app/plugins/image_gen/` and `frontend/src/plugins/image-gen/` removes the feature
entirely. The environment variables below are documented here rather than in `docs/DEPLOYMENT.md` for
that reason — nothing about this plugin should be left behind in core files.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `VIRTUALSCREEN_IMAGE_GEN_URL` | `http://127.0.0.1:8000` | Base URL of the SDXL service. No trailing slash needed. |
| `VIRTUALSCREEN_IMAGE_GEN_TOKEN` | *(empty)* | Sent as `Authorization: Bearer …`. Only needed if the service has its token auth enabled. |
| `VIRTUALSCREEN_IMAGE_GEN_MODEL` | *(empty)* | Model name to preselect in the panel, e.g. `sdxl\dvine_v108.safetensors`. |

They are read per request, so restarting VirtualScreen is enough to pick up a change — no rebuild.

## Why the backend proxies instead of the browser calling the service

Three reasons, all of which have bitten this setup:

- The DM console is often open on a tablet over Tailscale, which cannot reach a machine on the local
  network. The VirtualScreen backend can.
- The service's token stays server-side. `/config` reports only whether one is set.
- The browser would need CORS from a service that is not ours to configure.

## The upstream contract this is written against

`POST /api/generate` answers **immediately**, before the image exists, with a `task_id`. The panel then
polls `GET /api/tasks/{id}` until the status is `completed`, `failed` or `cancelled`; on success the
filenames are in `result.images[].filename` and the bytes come from the service's `/images/<file>`
static mount. Anything that is not a 2xx `image/*` response is refused rather than written into the
world — a captive portal or a proxy login page otherwise lands in a campaign as a broken picture.

## Requirements

The service must be running and have the model available. Nothing here starts it.
