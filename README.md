# YDB Code extension

YDB Code is extension for YDB developers

## Features

- Open the `Local YDB` view under **Run and Debug** to see every instance under `~/local-ydb`, with a running/stopped icon beside each folder.
- All actions stream output to dedicated VS Code output channels so you can watch builds and startup logs without leaving the IDE.

### Toolbar buttons (top of the Local YDB view)
- `+ Build and run new local YDB in specified folder`: prompts for a folder name, builds `ydbd` and `local_ydb`, then deploys a new instance in `~/local-ydb/<name>`.
- `Stop running local YDB`: stops any running `ydbd` started by the extension.
- `Refresh local YDB list`: reloads the list of local instances and updates their running status.
- `Open UI`: opens the local YDB monitoring UI in your browser.
- `Local YDB connection info`: shows gRPC/UI URLs; choose to open the UI or copy either URL to the clipboard.

### Per-instance buttons (hover a row)
- `Build and restart`: rebuilds binaries and restarts the selected instance.
- `Restart without build`: restarts the selected instance using existing binaries.
- `Stop and delete`: stops the instance if running, then removes its folder from `~/local-ydb`.
- `Edit Config`: opens the instance `config.yaml` so you can tweak settings.
- `Open Logs`: opens the log file from the instance folder.

## Installation

### Download from GitHub

- Download `.vsix` file for the latest release from releases page: https://github.com/UgnineSirdis/ydb-code-ext/releases
- Copy the `.vsix` file to the machine where your YDB workspace lives.
- Install from the file:
  - VS Code/Cursor UI: `Ctrl+Shift+P` (`⌘+Shift+P`) →  "Extensions: Install from VSIX..." and select the file.
  - CLI: `code --install-extension /path/to/ydbcode-<version>.vsix` (or `cursor --install-extension ...`).

### Building and installing from source

- One time: install Node.js from https://nodejs.org/en/download.
- One time: install the VS Code packaging tool with `make prepare` (installs `@vscode/vsce` globally).
- Build the extension package with `make` in the repo root; it produces `ydbcode-<version>.vsix` (a prebuilt `ydbcode-1.0.0.vsix` may already exist).
- Copy the `.vsix` file to the machine where your YDB workspace lives.
- Install from the file:
  - VS Code/Cursor UI: `Ctrl+Shift+P` (`⌘+Shift+P`) → "Extensions: Install from VSIX..." and select the file.
  - CLI: `code --install-extension /path/to/ydbcode-<version>.vsix` (or `cursor --install-extension ...`).

## Release Notes

### 1.0

The very first release

### 1.1

Add separate button for opening UI