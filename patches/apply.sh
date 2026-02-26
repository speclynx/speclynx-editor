#!/bin/bash
# patches/apply.sh — Post-install patches for monaco-vscode-api
# These patches make VSIX-bundled extensions behave as user-installed extensions
# rather than hidden built-in extensions.

set -e

VSIX_PLUGIN="node_modules/@codingame/monaco-vscode-rollup-vsix-plugin/rollup-vsix-plugin.js"
EXTENSIONS_JS="node_modules/@codingame/monaco-vscode-api/extensions.js"

# 1. VSIX plugin: register extensions as non-system (visible in UI)
sed -i 's/system: true/system: false/g' "$VSIX_PLUGIN"

# 2. registerExtension: isBuiltin should follow system flag, not be hardcoded true
sed -i 's/isBuiltin: true/isBuiltin: system/g' "$EXTENSIONS_JS"

echo "Patches applied successfully"
