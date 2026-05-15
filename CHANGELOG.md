# Change Log

All notable changes to this extension will be documented in this file following the structure inspired by [Keep a Changelog](https://keepachangelog.com/).

## [0.3.5] - 2026-05-14

### Changed
- Bumped minimatch from 9.0.9 to 10.2.5.
- Updated dev dependencies (TypeScript, ESLint, and related packages).
- Added `node` to tsconfig types to resolve missing Node.js globals.

## [0.3.4] - 2026-05-14

### Changed
- Migrated from yarn to pnpm.
- Added GitHub Actions workflow to publish to VS Code Marketplace and Open VSX on release.

## [0.3.3] - 2026-05-14

### Added
- VS Code debug configuration (`.vscode/launch.json` and `tasks.json`) so contributors can press F5 to launch an Extension Development Host with the `tsc -watch` build task.

### Changed
- Upgraded ESLint to v9 and typescript-eslint to v8, migrated to flat config (`eslint.config.mjs`), and bumped `minimatch` to ^9.0.9.

## [0.3.2] - 2026-05-14

### Changed
- Rewrote the README to more clearly describe the extension's features, supported Markdown extensions, commands, and settings. Added a "Getting started" section and refreshed screenshots.

## [0.3.1] - 2026-05-14

### Changed
- Updated repository URL after renaming the GitHub repo to `vscode-teamdocs`.

## [0.3.0] - 2024-04-05

### Added
- Added a menu to the top of the explorer to trigger a search.

### Changed
- Changed search and explorer to hide files based on the vscode's settings called "Files: Exclude"
- Changed search and explorer to only preview markdown files and open any other type of file.

## [0.2.0] - 2024-04-05

### Added
- Added `Team Docs: Search` command.

### Changed
- Changed the existing `Open Settings` command to `Team Docs: Open Settings`.

## [0.1.1] - 2024-02-13

### Changed
- Improve extension description in the README.md.
- Replace the extension icons that shows up in the Activity Bar.

## [0.1.0] - 2024-02-13

### Added
- required configuration for the documentation folder (`teamdocs.path_to_docs_folder`).
- check for when the configuration is missing with quick button to go to settings.
- explorer showing the documentation files and folders.
- when clicking on file, it shows the markdown preview.