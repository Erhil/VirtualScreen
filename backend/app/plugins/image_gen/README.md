# Image Generation plugin

Generates character and scene art through a **separate SDXL service** you run yourself, and saves the
result into the open world so the Screen tool can put it in front of the players.

Deleting `backend/app/plugins/image_gen/` and `frontend/src/plugins/image-gen/` removes the feature
entirely. The environment variables below are documented here rather than in `docs/DEPLOYMENT.md` for
that reason — nothing about this plugin should be left behind in core files.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `VIRTUALSCREEN_IMAGE_GEN_URL` | `http://127.0.0.1:8000` | Base URL of the SDXL service, resolved **from the machine running VirtualScreen** — not from the browser. Loopback only when both run on the same box; otherwise the GPU machine's LAN address. No trailing slash needed. |
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

When it lives on another machine, three things have to line up beyond the URL, and each fails
differently:

- the service must bind a non-loopback address (`0.0.0.0`), or nothing outside the box can connect;
- its host firewall must allow the port inbound on the profile that network is classified as —
  Windows blocks inbound by default, and a rule that exists only for "Private" does nothing on a
  network marked "Public";
- a VPN on either machine must not swallow the LAN subnet. This setup has already lost LAN access
  once to a client that installed a route for the local `/24` at metric 0.

The service has no authentication unless its own token is enabled, so anything on that network can
spend the GPU. That is fine on a home LAN and not fine anywhere the network is shared.
