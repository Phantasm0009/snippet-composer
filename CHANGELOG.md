# Changelog

All notable changes to Snippet Composer are documented in this file.

## [Unreleased]

## [1.2.0] - 2026-04-26

### Added
- Workspace-level storage mode (`snippetComposer.storage.location = workspace`).
- Create snippet from selected files in Explorer.
- Delete snippet from tree context menu.
- Undo last snippet save/delete action.
- Community snippet import from URL index.
- Onboarding walkthrough in VS Code.
- Keyboard shortcuts:
  - `Ctrl+Alt+S` / `Cmd+Alt+S`: Insert snippet
  - `Ctrl+Alt+N` / `Cmd+Alt+N`: Create snippet
- Optional post-insert hooks (`snippetComposer.postInsertHooks`).
- Usage analytics for snippet ordering.
- Basic CI workflow and smoke tests.

### Changed
- Snippet click in tree now opens edit flow instead of immediately inserting.
- Gist download supports merge or replace.
- Import/export dialogs default to workspace path when available.
- Monaco copy process now copies only `monaco-editor/min`.
- Added additional variable transforms: `pluralize`, `singularize`, `titlecase`, `dotcase`, `pathcase`.
- Added template conditional block support: `{{#if Variable}}...{{/if}}`.

### Fixed
- New snippet `Insert Now` detection logic.
- Output channel cleanup via extension subscriptions.
- Import validation/sanitization to avoid malformed data corruption.
- Drag-and-drop file ordering in editor.
- Dependency and lint configuration mismatches.
- Lockfile/package metadata sync issues.
