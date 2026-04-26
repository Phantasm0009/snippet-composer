# Snippet Composer 📝

![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Phantasm.snippet-composer)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/Phantasm.snippet-composer)
![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/Phantasm.snippet-composer)
![License](https://img.shields.io/github/license/Phantasm0009/snippet-composer)

> **Supercharge your workflow with modular, multi-file snippet management for VS Code**

## 🚀 Features

### Multi-File Snippet Templates
Create complex snippets that generate multiple files at once - perfect for component libraries, design patterns, and boilerplate code.

![Multi-File Snippets](https://raw.githubusercontent.com/Phantasm0009/snippet-composer/main/media/screenshots/multi-file-demo.gif)

### Powerful Variable System
Define custom variables with default values and optional flags to make your snippets truly reusable. Transform variables with built-in modifiers:
- `{{ComponentName}}` - Use as provided
- `{{ComponentName|lowercase}}` - Convert to lowercase
- `{{ComponentName|uppercase}}` - Convert to uppercase
- `{{ComponentName|capitalize}}` - Capitalize first letter
- `{{ComponentName|camelcase}}` - Convert to camelCase
- `{{ComponentName|snakecase}}` - Convert to snake_case (e.g., `MyComponent` → `my_component`)
- `{{ComponentName|kebabcase}}` - Convert to kebab-case (e.g., `MyComponent` → `my-component`)
- `{{ComponentName|pascalcase}}` - Convert to PascalCase (e.g., `my component` → `MyComponent`)
- `{{ComponentName|titlecase}}` - Convert to Title Case
- `{{ComponentName|dotcase}}` - Convert to dot.case
- `{{ComponentName|pathcase}}` - Convert to path/case
- `{{Resource|pluralize}}` - Convert to plural form
- `{{Resources|singularize}}` - Convert to singular form

Use conditional blocks for optional content:
- `{{#if VariableName}} ... {{/if}}`

### Visual Editor
No more hand-editing JSON files! Our intuitive editor provides syntax highlighting, auto-completion, and real-time preview with theme-aware Monaco editor.

![Visual Editor](https://raw.githubusercontent.com/Phantasm0009/snippet-composer/main/media/screenshots/visual-editor.png)

### Organized Management
- 📂 Folder organization with nested subfolders
- 🏷️ Tag-based filtering with auto-complete suggestions
- 🔍 Quick fuzzy search (Insert or Edit directly)
- 🔄 Drag-and-drop reordering of files within snippets
- ⌨️ Keyboard shortcuts (`Ctrl/Cmd+S` save, `Ctrl/Cmd+Alt+S` insert, `Ctrl/Cmd+Alt+N` create)
- ♻️ Undo last snippet save/delete from toolbar command

### Multi-Root Workspace Support
When working with multiple workspace folders, Snippet Composer lets you:
- Select the target folder when inserting snippets
- Right-click any folder in Explorer and select "Insert Snippet Here"

### File Overwrite Protection
Before creating files, you'll be warned if files already exist with options to:
- **Overwrite** - Replace existing files
- **Skip Existing** - Only create new files
- **Cancel** - Abort the operation

### Cloud Sync (GitHub Gist)
Sync your snippets across devices using GitHub Gist:
1. Authenticate with GitHub
2. Use "Upload to Gist" to save your snippets
3. Use "Download from Gist" on other devices (Merge or Replace)

### Workspace + Local Storage
Choose where snippets are stored:
- `local` (default): extension global storage
- `workspace`: `.vscode/snippet-composer` in the current project
- `cloud`: local cache with GitHub Gist sync commands

### Snippet Creation from Existing Files
Right-click selected files in Explorer and generate a new snippet from them instantly.

### Built-in Snippet Library
Get started immediately with pre-made snippets for popular frameworks and languages:
- React components and hooks
- Express API routes
- TypeScript classes and interfaces
- HTML/CSS templates
- ... and more!

## 📥 Installation

### From VS Code Marketplace
1. Open VS Code
2. Click on the Extensions icon in the Activity Bar
3. Search for "Snippet Composer"
4. Click Install

### From Command Line
```bash
code --install-extension Phantasm.snippet-composer
```
## 🎮 Usage
### Creating a new snippet:
1. Click the Snippet Composer icon in the Activity Bar
2. Click the "+" button to create a new snippet
3. Fill in the details, add files, and define variables
4. Click "Save Snippet"

### Inserting a snippet:
1. Right-click in the explorer view or editor
2. Select "Insert Snippet" from the context menu
3. Choose your snippet from the list
4. Fill in the variable values when prompted

### Managing folders:
1. Right-click on any folder in the Snippets Explorer
2. Use "Rename Folder" or "Delete Folder" options
3. Use "Create Subfolder" for nested structure
4. Drag and drop snippets between folders to reorganize

## ⚙️ Configuration

### Customize Snippet Composer through VS Code settings:
```json
{
  "snippetComposer.storage.location": "local", // "local" | "workspace" | "cloud"
  "snippetComposer.author": "Your Name",       // Default author name for snippets
  "snippetComposer.gist.id": "",               // GitHub Gist ID for cloud sync (auto-set)
  "snippetComposer.postInsertHooks": [],       // Optional commands to run after insertion
  "snippetComposer.community.indexUrl": ""     // Optional community index URL for snippet import
}
```

### 🔗 Use Cases
**React Developers:** Generate component files with tests, styles, and stories

**Backend Developers:** Create API routes, controllers, and models in one go

**Team Leads:** Standardize code patterns across your team

**Open Source Maintainers:** Provide official snippets for your libraries

## 🛠️ Advanced Features

### Variable Transformations
Use built-in transformations to manipulate variable values:
```
{{ComponentName|lowercase}}  => mycomponent
{{ComponentName|uppercase}}  => MYCOMPONENT
{{ComponentName|capitalize}} => Mycomponent
{{ComponentName|camelcase}}  => myComponent
{{ComponentName|snakecase}}  => my_component
{{ComponentName|kebabcase}}  => my-component
{{ComponentName|pascalcase}} => MyComponent
```

### Default Values & Optional Variables
Variables can have default values that pre-fill the input prompt. Mark variables as optional to allow blank values.

### Snippet Import/Export

Share snippets with your team or across devices:

1. Click "Export Snippets" in the explorer view
2. Save the JSON file
3. On another device, click "Import Snippets"
4. Or import community snippets from a shared JSON index URL

Snippet Organization:

1. Create folders and subfolders to categorize snippets
2. Add tags for easier searching
3. Drag and drop to rearrange

### 📊 Why Use Snippet Composer?

| Feature              | VS Code Snippets | Snippet Composer |
|----------------------|------------------|------------------|
| Multi-file generation | ❌               | ✅               |
| Variable system       | Limited          | Advanced         |
| Visual editor         | ❌               | ✅               |
| Organization          | Flat files       | Folders & Tags   |
| Sharing               | Manual           | Import/Export    |
| Preview               | ❌               | ✅               |

### 📣 Support
* [Report Issues](https://github.com/Phantasm0009/snippet-composer/issues)

### 📝 Release Notes

### 1.2.0 (Latest)
* Workspace storage mode (`.vscode/snippet-composer`) and cloud cache mode
* Fixed file reorder drag-and-drop in Edit Snippet -> Files
* Added snippet delete in tree context menu and undo last snippet change
* Added snippet creation from selected files in Explorer
* Added new transforms: `pluralize`, `singularize`, `titlecase`, `dotcase`, `pathcase`
* Added conditional template blocks (`{{#if Variable}} ... {{/if}}`)
* Added fuzzy snippet quick search flow (Insert/Edit)
* Added keyboard shortcuts for insert/create commands
* Added progress UI for Gist sync and merge/replace download strategy
* Added onboarding walkthrough and CHANGELOG support
* Reduced Monaco copy footprint to only required `min` assets

For full historical changes, see `CHANGELOG.md`.

### 📜 License
MIT © Aditya Tiwari