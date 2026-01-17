# YDB Code Extension (VS Code / Cursor)

## Project summary
YDB Code is a VS Code / Cursor extension for YDB developers. It manages local YDB instances from the IDE so you can build, start, stop, restart, and inspect local environments without leaving the IDE.

## Key features
- Local YDB management from the "Local YDB" view in Run and Debug.
- Build and run new local YDB instances via `ya make` + `local_ydb`.
- Start/stop/restart existing instances (with or without rebuild).
- Open logs and edit the instance config file.
- Copy connection info and refresh the local instance list.

## How it works
- Activation requires a YDB workspace with `ydb/apps/ydbd`, `ydb/apps/ydb`, and `ydb/public/tools/local_ydb`.
- Local instances are stored under `~/local-ydb/<instance-name>`.
- The extension spawns the `ya` build and `local_ydb` CLI binaries, streaming output to VS Code output channels.

## Repository layout
- `src/extension.ts`: extension entrypoint and command implementations.
- `package.json`: VS Code contributions (commands, views, configuration).
- `out/`: compiled JavaScript output (build artifact).

## Development
- Install dependencies: `npm install`
- Build once: `npm run compile`
- Watch build: `npm run watch`
- Lint: `npm run lint`
- Tests: `npm run test`

## Configuration
- `ydb.localYdbPorts.*`: optional port overrides for local YDB; defaults are computed from the username.
