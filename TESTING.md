# Testing Snippet Composer Extension Locally

This guide explains how to test the Snippet Composer VS Code extension in development mode.

## Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/) (v1.70.0 or higher)
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js)

## Setup

### 1. Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### 2. Compile the Extension

```bash
npm run compile
```

Or use watch mode for automatic recompilation during development:

```bash
npm run watch
```

## Running the Extension

### Method 1: Using VS Code Debug (Recommended)

1. Open the project folder in VS Code
2. Press `F5` or go to **Run > Start Debugging**
3. This opens a new VS Code window (Extension Development Host) with the extension loaded

### Method 2: Manual Launch

1. Open the project folder in VS Code
2. Press `Ctrl+Shift+D` to open the Run and Debug view
3. Select "Run Extension" from the dropdown (if available)
4. Click the green play button

## Testing Each Feature

### 1. Variable Transformations (snakecase, kebabcase, pascalcase)

1. Click the **Snippet Composer** icon in the Activity Bar (left sidebar)
2. Click the **+** button to create a new snippet
3. Add a variable named `ComponentName` with default value `MyComponent`
4. In a file content, use:
   ```
   // Original: {{ComponentName}}
   // Snake Case: {{ComponentName|snakecase}}
   // Kebab Case: {{ComponentName|kebabcase}}
   // Pascal Case: {{ComponentName|pascalcase}}
   ```
5. Save the snippet and insert it
6. **Expected:** Variables transform correctly (e.g., `my_component`, `my-component`, `MyComponent`)

### 2. Variable Default Values & Optional Variables

1. Create a new snippet
2. In the Variables tab, add variables with default values
3. Insert the snippet
4. **Expected:** Input boxes show default values pre-filled

### 3. Multi-Root Workspace Support

1. Open a multi-root workspace (File > Add Folder to Workspace)
2. Try to insert a snippet
3. **Expected:** A QuickPick appears asking which workspace folder to use

### 4. Insert Snippet Here (Explorer Context Menu)

1. In the VS Code Explorer (file tree), right-click on any folder
2. Look for "Insert Snippet Here" option
3. Select a snippet to insert
4. **Expected:** Snippet files are created in that specific folder

### 5. File Overwrite Protection

1. Insert a snippet that creates files
2. Try to insert the same snippet again to the same location
3. **Expected:** Warning appears with "Overwrite", "Skip Existing", "Cancel" options

### 6. Drag-and-Drop File Reordering

1. Open a snippet with multiple files in the editor
2. Go to the "Files" tab
3. Drag a file item by its handle (≡) to reorder
4. **Expected:** Files reorder and indices update

### 7. Tag Auto-Complete

1. Create a snippet with tags like "react", "component"
2. Create another snippet
3. In the Tags field, start typing "re"
4. **Expected:** Suggestions appear from existing tags

### 8. Keyboard Shortcuts (Ctrl/Cmd+S)

1. Open a snippet in the editor
2. Make changes
3. Press `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac)
4. **Expected:** Snippet saves without clicking the Save button

### 9. Theme Awareness

1. Change VS Code theme to a light theme (Ctrl+K Ctrl+T)
2. Open a snippet editor
3. **Expected:** Monaco editor uses light theme
4. Switch to dark theme
5. Re-open the snippet editor
6. **Expected:** Monaco editor uses dark theme

### 10. Search/Filter Snippets

1. Create several snippets with different names and tags
2. Click the search icon (🔍) in the Snippets Explorer toolbar
3. Enter a search term
4. **Expected:** Only matching snippets appear in the tree

### 11. Duplicate Snippet

1. Right-click on any snippet in the Snippets Explorer
2. Select "Duplicate Snippet"
3. **Expected:** A copy appears with "(Copy)" suffix

### 12. Export Single Snippet

1. Right-click on any snippet in the Snippets Explorer
2. Select "Export Snippet..."
3. Choose a location to save
4. **Expected:** JSON file created with just that snippet

### 13. GitHub Gist Sync

1. Run command: `Snippet Composer: Upload to Gist`
2. Authenticate with GitHub when prompted
3. **Expected:** Snippets uploaded to a private Gist
4. Run command: `Snippet Composer: Download from Gist`
5. **Expected:** Snippets downloaded from Gist

## Debugging Tips

### View Extension Logs

1. In the Extension Development Host window
2. Open **Help > Toggle Developer Tools**
3. Go to the **Console** tab
4. Look for logs prefixed with extension messages

### Common Issues

| Issue | Solution |
|-------|----------|
| Extension not appearing | Make sure `npm run compile` completed without errors |
| Changes not reflecting | Reload the Extension Development Host (`Ctrl+R`) |
| Webview not loading | Check Developer Tools console for errors |
| Monaco editor blank | Check that monaco-editor files are in node_modules |

### Reloading the Extension

In the Extension Development Host window:
- Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)
- Or run command: **Developer: Reload Window**

## Running Tests (if available)

```bash
npm test
```

## Building for Production

To create a `.vsix` package for distribution:

```bash
# Install vsce if not already installed
npm install -g @vscode/vsce

# Package the extension
vsce package
```

This creates a `.vsix` file you can install in VS Code via:
- **Extensions > ... > Install from VSIX**

## File Structure Reference

```
snippet-composer-main/
├── src/
│   ├── extension.ts        # Extension entry point, command registration
│   ├── snippetManager.ts   # Core snippet logic, variable processing
│   ├── snippetEditor.ts    # Webview editor UI
│   ├── snippetExplorer.ts  # Tree view provider
│   ├── monacoProvider.ts   # Monaco editor setup
│   └── builtInSnippets.ts  # Default snippets
├── media/                   # Icons and assets
├── out/                     # Compiled JavaScript (generated)
├── package.json            # Extension manifest
└── tsconfig.json           # TypeScript configuration
```

## Quick Test Checklist

- [ ] Extension loads without errors
- [ ] Snippet Explorer view appears
- [ ] Can create new snippets
- [ ] Can edit existing snippets
- [ ] Variable transformations work (snakecase, kebabcase, pascalcase)
- [ ] File overwrite warning appears
- [ ] Drag-and-drop reordering works
- [ ] Tag auto-complete shows suggestions
- [ ] Ctrl+S saves the snippet
- [ ] Monaco theme matches VS Code theme
- [ ] Search filters snippets correctly
- [ ] Duplicate creates a copy
- [ ] Export creates a JSON file
- [ ] Gist upload/download works (requires GitHub auth)
