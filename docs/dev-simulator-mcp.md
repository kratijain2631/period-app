# iOS Simulator MCP setup

This doc covers the local setup for using Codex with the iOS Simulator MCP. The MCP only connects to a booted simulator; it does not build the app. You still run the app with `npm run ios`.

## Prereqs
- Xcode + Command Line Tools
- Node 18+
- fb-idb CLI

## Install idb
```bash
python3 -m pip install --user fb-idb
brew tap facebook/fb
brew install idb-companion
which idb
```

## Configure Codex MCP
Add this to `~/.codex/config.toml` (simulator only):

```toml
[features]
rmcp_client = true

[mcp_servers.ios_simulator]
command = "npx"
args = ["-y", "ios-simulator-mcp"]
env = {
  IOS_SIMULATOR_MCP_IDB_PATH = "/path/to/idb",
  IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR = "/path/to/period-app/screenshots"
}
```

## Boot the simulator
```bash
open -a Simulator
# or
xcrun simctl boot "iPhone 15"
```

## Build and run the app
```bash
npm install
npm run ios
```

If the app opens but does not load JS, start the dev server in another terminal:

```bash
npm run start
```

## Troubleshooting
- Make sure a simulator is booted before using MCP tools.
- Confirm `idb` is on PATH and the MCP env var points to it.
- If screenshots are missing, verify `IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR` exists.
