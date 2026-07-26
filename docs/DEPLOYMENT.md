# Deploying VirtualScreen as an appliance

How to run VirtualScreen unattended on a dedicated machine — a laptop on a shelf, lid closed, no keyboard or
monitor — while still authoring worlds from your own computer (at home, or on the road).

## The shape of it

```
your laptop                          appliance (on the shelf)
─────────────                        ────────────────────────
Claude Code in the world folder      one process: API + UI + /screen
git history, bulk edits              watches the world folder, reindexes
        │                                       │
        └──────── Syncthing (world files) ──────┘
        └──────── browser / agent over HTTP ────┘
                    all inside Tailscale
```

The appliance is the **runtime and the display**. Your laptop stays the **authoring machine** — the workflow
you already have (an agent working directly on plain files in a folder) is preserved exactly. The old "copy
the folder to a USB stick and carry it home" step is replaced by continuous sync.

## 1. Build the frontend and enable production mode

In dev, the UI is served by the Vite dev server on a second port. An appliance should run **one process on
one port** — the backend serves the built SPA:

```bash
cd frontend && npm run build
```

Then set `VIRTUALSCREEN_STATIC_DIR` to the build output (`frontend/dist`). `scripts/start-appliance.ps1` does
this for you. When the variable is unset the backend behaves exactly as before, so the dev workflow is
unchanged.

> ⚠️ Point it at `frontend/dist` and nothing else. Whatever directory you name is served **publicly and
> recursively, without a token** — that is correct for a built SPA and wrong for anything else. Do not set it
> to an empty string or a source directory.

Everything is then reachable on a single port: the DM console at `/`, the player screen at `/screen`, the API
under `/api`.

## 2. Make the machine survive on its own

This is the step people skip and regret. A laptop on a shelf is almost certainly **closed**, and Windows
sleeps on lid-close by default — the appliance would simply vanish, with no way to reach it.

Run **on the appliance**, from an elevated PowerShell:

```powershell
.\scripts\setup-appliance.ps1 -DryRun
```

Review what it plans to do, then run it without `-DryRun`. It:

- disables sleep, hibernation, and display timeout;
- sets **lid close → do nothing**;
- registers a scheduled task that starts `start-appliance.ps1` at logon, with a **watchdog loop** that
  restarts the server if it ever exits (with backoff, logging to `.virtualscreen/appliance.log`).

Then finish the manual steps it prints:

- **Auto-login** via `netplwiz`, so the machine reaches a desktop session after a Windows Update reboot
  without anyone typing a password. (Avoid the registry method — it stores the password in plaintext.)
- **Reserve the machine's IP** in your router's DHCP, or set a static one.
- **Reboot once** and confirm the app comes back by itself. Do this before you need it.

## 3. Network: Tailscale, not port forwarding

Install [Tailscale](https://tailscale.com/) on the appliance and on every machine you want to reach it from,
and sign them into the same tailnet. The appliance gets a stable `100.x.x.x` address that works from home, from
a café, from anywhere — no port forwarding, no public IP, no dynamic-DNS.

Two things worth knowing:

- Tailscale addresses live in `100.64.0.0/10`, so they are **unaffected by a VPN that hijacks your LAN
  subnet** — a failure mode this project has already hit once (a commercial VPN installed a `192.168.31.0/24`
  route at metric 0 and swallowed all LAN traffic). Over Tailscale the appliance stays reachable regardless.
- It also makes RDP practical if you ever do need a desktop, without exposing RDP to the internet.

> 🚫 **Never port-forward VirtualScreen to the internet.** The player screen (`/api/screen/…`) and all static
> assets are intentionally served **without a token** so the table display can just open a URL. On a private
> tailnet that is fine; on the open internet it is an unauthenticated door into your world. Authentication is
> a single shared token with no per-world scoping — it is not an internet-facing auth system.

## 4. Content: Syncthing between your laptop and the appliance

Install [Syncthing](https://syncthing.net/) on both machines and share the worlds folder (on this setup,
`C:\Users\<you>\Documents\VirtualScreen\worlds`). It is peer-to-peer and works over the internet, so editing
offline in a café and having it land when you reconnect is the normal case, not a special one.

**Folder settings — both sides:**

| Setting | Value | Why |
|---|---|---|
| Folder type | **Send & Receive** | changes happen on both sides (see below) |
| File versioning | **Simple, keep ~5** | one-click undo when an agent rewrites the wrong thing |

**`.stignore` (both sides):**

```
.virtualscreen
.git
```

- `.virtualscreen/` holds the live SQLite index — syncing an open database invites corruption, and it is
  rebuilt from the files anyway. It also holds `dms-trust.json`, a trust flag that should never travel
  between machines.
- `.git` keeps two machines from fighting over repository objects. Keep git on your authoring laptop, where
  the history is useful.

**Why bidirectional:** the appliance legitimately writes during play — HP, statuses, kanban moves are fields
inside card and metadata files. Making the appliance receive-only would silently discard table-side edits.

**Why conflicts are a non-issue here:** you author *between* sessions and adjust statuses *during* them, so
the two rarely touch the same file in the same window. Syncthing resolves per file, so an agent writing story
notes while the table updates a monster's HP is just two independent syncs. If two edits genuinely collide,
Syncthing writes a `*.sync-conflict-<date>` file next to the original — both versions survive, nothing is
lost.

**One consequence to know:** table snapshots live in SQLite, not in files, so they stay **local to each
machine** and do not travel with the world.

## 5. Working with it from elsewhere

- **Browser** — the DM console is a web app. Over Tailscale it is the same experience as sitting in front of
  the machine.
- **Claude Code** — runs on your laptop against your local copy of the world folder, exactly as before. Full
  filesystem power: grep, bulk edits, refactors, git. Syncthing carries the result over.
- **Any HTTP client / agent** — the whole API is available with the access token in the
  `x-virtualscreen-token` header (or the session cookie). This is how a chat-style agent on a machine that
  *cannot* run Claude Code can still read and edit the world, and drive the table live (push a page to the
  player screen, roll dice).

## 6. A second DM on the same machine

The active world is a **server-global** setting: opening a world switches it for everyone, including the
player screen. Two people cannot use one instance with different worlds — one would yank the other's display
mid-session.

If you want to host a friend's world, run a **second instance** instead. No code changes are needed; the app
is configured entirely by environment variables:

| | yours | theirs |
|---|---|---|
| `VIRTUALSCREEN_WORLDS_ROOT` | your worlds folder | their worlds folder |
| `VIRTUALSCREEN_ACCESS_TOKEN` | your code | their code |
| `VIRTUALSCREEN_PORT` | 8000 | 8001 |

Each instance gets its own database, its own screen, and its own token. Their Syncthing share is a separate
folder and never touches yours.

> ⚠️ Separate tokens isolate them **within the app**, but it is still one operating system, and DMS scripts
> are Python. Only host someone you would trust with the machine itself.

## 7. Verify before you rely on it

1. `http://<tailscale-ip>:8000/` — DM console loads.
2. `http://<tailscale-ip>:8000/screen` — player screen loads (SPA route served by the backend).
3. Edit a file in the synced folder on your laptop → it appears in the console within seconds (the watcher
   reindexes automatically).
4. Kill the server process → the watchdog brings it back; check `.virtualscreen/appliance.log`.
5. **Reboot the appliance, close the lid, walk away, and come back.** Everything should still be up. If this
   step passes, the deployment is real.

## Troubleshooting

| Symptom | Look at |
|---|---|
| Nothing responds after a reboot | Did the scheduled task run? Is auto-login on? `.virtualscreen/appliance.log` |
| Reachable at home, not from outside | Both machines signed into the same tailnet; using the `100.x` address, not the LAN one |
| Machine disappears after a while | Sleep/hibernate or lid action re-enabled (Windows Update can reset power plans — re-run `setup-appliance.ps1`) |
| UI loads but API 401s | Access token mismatch between `.env` and what the browser stored; re-enter the unlock code |
| An endpoint answers `404` that you know exists | In production mode a wrong **method** on a real route reports `404`, not `405` — the catch-all SPA mount takes the request first. Check the verb before hunting for a missing route or plugin; dev (Vite proxy) still returns `405` |
| Edits do not show up | Syncthing paused or folder out of sync; check `.stignore` did not exclude your content |
| `*.sync-conflict-*` files | Two sides edited the same file; keep the one you want, delete the other |
