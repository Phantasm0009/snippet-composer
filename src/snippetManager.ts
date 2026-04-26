import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { builtInFolders, builtInSnippets } from './builtInSnippets';
import { replaceTemplateVariables } from './variableTransforms';

// Define the snippet structure
export interface SnippetFile {
  filename: string;
  path: string;
  content: string;
}

export interface VariableDefinition {
  defaultValue: string;
  optional?: boolean;
}

export interface Snippet {
  id: string;
  name: string;
  description: string;
  tags: string[];
  files: SnippetFile[];
  variables: { [key: string]: string | VariableDefinition };
  folderId?: string;
}

export interface SnippetFolder {
  id: string;
  name: string;
  parentId?: string;
}

interface SnippetImportData {
  snippets: Snippet[];
  folders: SnippetFolder[];
}

interface SnippetHistoryEntry {
  timestamp: string;
  action: 'save' | 'delete';
  snippet: Snippet;
}

export class SnippetManager {
  private snippetsStoragePath: string;
  private snippets: Map<string, Snippet>;
  private folders: Map<string, SnippetFolder>;
  private usageCounts: Map<string, number>;
  private history: SnippetHistoryEntry[];
  
  constructor(private context: vscode.ExtensionContext) {
    this.snippetsStoragePath = this.resolveStoragePath();
    this.snippets = new Map();
    this.folders = new Map();
    this.usageCounts = new Map();
    this.history = [];
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.snippetsStoragePath)) {
      fs.mkdirSync(this.snippetsStoragePath, { recursive: true });
    }
    
    // Load snippets/folders/usage/history
    this.loadSnippets();
    
    // Check if this is the first run
    const firstRunFlag = path.join(this.snippetsStoragePath, '.initialized');
    if (!fs.existsSync(firstRunFlag)) {
      // Load built-in snippets on first run
      this.loadBuiltInSnippets();
      
      // Create a flag file to indicate that built-ins have been loaded
      fs.writeFileSync(firstRunFlag, new Date().toISOString());
    }
  }
  
  private resolveStoragePath(): string {
    const config = vscode.workspace.getConfiguration('snippetComposer');
    const storageLocation = config.get<'local' | 'workspace' | 'cloud'>('storage.location', 'local');
    
    if (storageLocation === 'workspace') {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        return path.join(workspaceFolder.uri.fsPath, '.vscode', 'snippet-composer');
      }
      
      vscode.window.showWarningMessage(
        'Snippet Composer workspace storage is selected, but no workspace is open. Falling back to local storage.'
      );
      return path.join(this.context.globalStoragePath, 'snippets');
    }
    
    if (storageLocation === 'cloud') {
      return path.join(this.context.globalStoragePath, 'snippets-cloud-cache');
    }
    
    return path.join(this.context.globalStoragePath, 'snippets');
  }
  
  private loadSnippets() {
    try {
      const snippetsFile = path.join(this.snippetsStoragePath, 'snippets.json');
      const foldersFile = path.join(this.snippetsStoragePath, 'folders.json');
      const usageFile = path.join(this.snippetsStoragePath, 'usage.json');
      const historyFile = path.join(this.snippetsStoragePath, 'history.json');
      
      if (fs.existsSync(snippetsFile)) {
        const data = JSON.parse(fs.readFileSync(snippetsFile, 'utf8'));
        for (const snippet of data) {
          this.snippets.set(snippet.id, snippet);
        }
      }
      
      if (fs.existsSync(foldersFile)) {
        const data = JSON.parse(fs.readFileSync(foldersFile, 'utf8'));
        for (const folder of data) {
          this.folders.set(folder.id, folder);
        }
      }

      if (fs.existsSync(usageFile)) {
        const data = JSON.parse(fs.readFileSync(usageFile, 'utf8')) as Record<string, number>;
        for (const [snippetId, count] of Object.entries(data)) {
          if (typeof count === 'number') {
            this.usageCounts.set(snippetId, count);
          }
        }
      }

      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        if (Array.isArray(data)) {
          this.history = data.filter(entry => this.isObject(entry)) as SnippetHistoryEntry[];
        }
      }
    } catch (error) {
      console.error('Failed to load snippets:', error);
    }
  }
  
  private saveSnippets() {
    try {
      const snippetsFile = path.join(this.snippetsStoragePath, 'snippets.json');
      const foldersFile = path.join(this.snippetsStoragePath, 'folders.json');
      const usageFile = path.join(this.snippetsStoragePath, 'usage.json');
      const historyFile = path.join(this.snippetsStoragePath, 'history.json');
      
      fs.writeFileSync(snippetsFile, JSON.stringify(Array.from(this.snippets.values())));
      fs.writeFileSync(foldersFile, JSON.stringify(Array.from(this.folders.values())));
      fs.writeFileSync(usageFile, JSON.stringify(Object.fromEntries(this.usageCounts.entries())));
      fs.writeFileSync(historyFile, JSON.stringify(this.history.slice(0, 50)));
    } catch (error) {
      console.error('Failed to save snippets:', error);
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private parseImportData(rawData: unknown): SnippetImportData {
    if (!this.isObject(rawData)) {
      throw new Error('Import file must be a JSON object.');
    }

    const snippetsRaw = rawData.snippets;
    const foldersRaw = rawData.folders;

    if (snippetsRaw !== undefined && !Array.isArray(snippetsRaw)) {
      throw new Error('"snippets" must be an array.');
    }
    if (foldersRaw !== undefined && !Array.isArray(foldersRaw)) {
      throw new Error('"folders" must be an array.');
    }

    const snippets: Snippet[] = [];
    for (const snippet of snippetsRaw ?? []) {
      if (!this.isObject(snippet)) {
        continue;
      }

      if (typeof snippet.id !== 'string' || typeof snippet.name !== 'string') {
        continue;
      }

      snippets.push({
        id: snippet.id,
        name: snippet.name,
        description: typeof snippet.description === 'string' ? snippet.description : '',
        tags: Array.isArray(snippet.tags) ? snippet.tags.filter(tag => typeof tag === 'string') : [],
        files: Array.isArray(snippet.files)
          ? snippet.files
              .filter(file => this.isObject(file))
              .map(file => ({
                filename: typeof file.filename === 'string' ? file.filename : 'newfile.txt',
                path: typeof file.path === 'string' ? file.path : '',
                content: typeof file.content === 'string' ? file.content : ''
              }))
          : [],
        variables: this.isObject(snippet.variables) ? (snippet.variables as Snippet['variables']) : {},
        folderId: typeof snippet.folderId === 'string' ? snippet.folderId : undefined
      });
    }

    const folders: SnippetFolder[] = [];
    for (const folder of foldersRaw ?? []) {
      if (!this.isObject(folder)) {
        continue;
      }

      if (typeof folder.id !== 'string' || typeof folder.name !== 'string') {
        continue;
      }

      folders.push({
        id: folder.id,
        name: folder.name,
        parentId: typeof folder.parentId === 'string' ? folder.parentId : undefined
      });
    }

    return { snippets, folders };
  }
  
  private loadBuiltInSnippets(): void {
    try {
      console.log('Loading built-in snippets and folders...');
      
      // Load built-in folders
      for (const folder of builtInFolders) {
        this.folders.set(folder.id, folder);
      }
      
      // Load built-in snippets
      for (const snippet of builtInSnippets) {
        this.snippets.set(snippet.id, snippet);
      }
      
      this.saveSnippets();
      console.log('Built-in snippets loaded successfully!');
    } catch (error) {
      console.error('Failed to load built-in snippets:', error);
    }
  }
  
  async getAllSnippets(): Promise<Snippet[]> {
    return Array.from(this.snippets.values());
  }

  getUsageCounts(): Map<string, number> {
    return new Map(this.usageCounts);
  }
  
  async getAllTags(): Promise<string[]> {
    const tagSet = new Set<string>();
    for (const snippet of this.snippets.values()) {
      for (const tag of snippet.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }
  
  private resolveSnippetId(input: unknown): string | undefined {
    if (typeof input === 'string') {
      return input;
    }

    if (this.isObject(input)) {
      if (typeof input.id === 'string') {
        return input.id;
      }
      if (this.isObject(input.context) && typeof input.context.id === 'string') {
        return input.context.id;
      }
      if (typeof input._id === 'string') {
        return input._id;
      }
    }

    return undefined;
  }

  async getSnippet(id: unknown): Promise<Snippet | undefined> {
    try {
      const snippetId = this.resolveSnippetId(id);
      if (!snippetId) {
        return undefined;
      }
      console.log('Retrieving snippet with ID:', snippetId);
      return this.snippets.get(snippetId);
    } catch (error) {
      console.error('Error in getSnippet:', error);
      return undefined;
    }
  }
  
  async saveSnippet(snippet: Snippet): Promise<void> {
    const existing = this.snippets.get(snippet.id);
    if (existing) {
      this.addHistoryEntry('save', existing);
    }
    this.snippets.set(snippet.id, snippet);
    this.saveSnippets();
  }

  async createSnippetFromFiles(fileUris: vscode.Uri[]): Promise<Snippet | undefined> {
    if (!fileUris.length) {
      vscode.window.showErrorMessage('No files selected to create snippet from.');
      return undefined;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUris[0]);
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('Selected files must be inside an open workspace folder.');
      return undefined;
    }

    const snippetFiles: SnippetFile[] = [];
    for (const fileUri of fileUris) {
      try {
        const stats = fs.statSync(fileUri.fsPath);
        if (!stats.isFile()) {
          continue;
        }

        const relativePath = path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath);
        const parsedPath = path.parse(relativePath);
        const content = fs.readFileSync(fileUri.fsPath, 'utf8');

        snippetFiles.push({
          filename: parsedPath.base,
          path: parsedPath.dir === '.' ? '' : parsedPath.dir,
          content
        });
      } catch (error) {
        console.error('Failed to read selected file:', fileUri.fsPath, error);
      }
    }

    if (!snippetFiles.length) {
      vscode.window.showErrorMessage('Could not read any selected files to build a snippet.');
      return undefined;
    }

    const defaultName = snippetFiles.length === 1
      ? path.parse(snippetFiles[0].filename).name
      : `Imported Snippet ${new Date().toLocaleDateString()}`;

    const snippetName = await vscode.window.showInputBox({
      prompt: 'Name for the new snippet',
      value: defaultName
    });

    if (!snippetName) {
      return undefined;
    }

    const snippet: Snippet = {
      id: Date.now().toString(),
      name: snippetName,
      description: `Created from ${snippetFiles.length} selected file(s)`,
      tags: ['imported'],
      files: snippetFiles,
      variables: {}
    };

    await this.saveSnippet(snippet);
    return snippet;
  }
  
  async deleteSnippet(id: string): Promise<boolean> {
    console.log('deleteSnippet called with id:', id);
    console.log('Current snippets count:', this.snippets.size);
    console.log('Snippet exists before delete:', this.snippets.has(id));
    
    if (!this.snippets.has(id)) {
      console.error('Snippet not found with id:', id);
      // List all available IDs for debugging
      console.log('Available snippet IDs:', Array.from(this.snippets.keys()));
      return false;
    }

    const existingSnippet = this.snippets.get(id);
    if (existingSnippet) {
      this.addHistoryEntry('delete', existingSnippet);
    }
    
    const deleted = this.snippets.delete(id);
    console.log('Delete result:', deleted);
    console.log('Snippets count after delete:', this.snippets.size);
    
    this.saveSnippets();
    return deleted;
  }

  private addHistoryEntry(action: 'save' | 'delete', snippet: Snippet): void {
    this.history.unshift({
      timestamp: new Date().toISOString(),
      action,
      snippet: JSON.parse(JSON.stringify(snippet))
    });
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }
  }

  async undoLastSnippetChange(): Promise<boolean> {
    const latest = this.history.shift();
    if (!latest) {
      return false;
    }

    this.snippets.set(latest.snippet.id, latest.snippet);
    this.saveSnippets();
    return true;
  }
  
  async getFolders(): Promise<SnippetFolder[]> {
    return Array.from(this.folders.values());
  }
  
  async createFolder(name: string, parentId?: string): Promise<SnippetFolder> {
    const folder: SnippetFolder = {
      id: Date.now().toString(),
      name,
      parentId
    };
    
    this.folders.set(folder.id, folder);
    this.saveSnippets();
    return folder;
  }
  
  async deleteFolder(folderId: string): Promise<void> {
    // First, get all snippets in this folder
    const snippets = Array.from(this.snippets.values()).filter(s => s.folderId === folderId);
    
    // Delete each snippet
    for (const snippet of snippets) {
      this.snippets.delete(snippet.id);
    }
    
    // Find any subfolders
    const subfolders = Array.from(this.folders.values()).filter(f => f.parentId === folderId);
    
    // Recursively delete subfolders
    for (const subfolder of subfolders) {
      await this.deleteFolder(subfolder.id);
    }
    
    // Finally, delete the folder itself
    this.folders.delete(folderId);
    this.saveSnippets();
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    const folder = this.folders.get(folderId);
    
    if (folder) {
      folder.name = newName;
      this.saveSnippets();
    }
  }
  
  async insertSnippet(snippet: Snippet, basePath?: string): Promise<void> {
    try {
      // Collect variable values from user
      const variables: { [key: string]: string } = {};
      for (const [key, varDef] of Object.entries(snippet.variables)) {
        // Handle both old format (string) and new format (VariableDefinition)
        let defaultValue: string;
        let isOptional: boolean;
        
        if (typeof varDef === 'string') {
          defaultValue = varDef;
          isOptional = false;
        } else {
          defaultValue = varDef.defaultValue || '';
          isOptional = varDef.optional || false;
        }
        
        const value = await vscode.window.showInputBox({
          prompt: `Enter value for "${key}" variable:${isOptional ? ' (optional)' : ''}`,
          placeHolder: defaultValue || (isOptional ? 'Leave empty to skip' : 'Enter value'),
          value: defaultValue,
          title: `Snippet Variable: ${key}`
        });
        
        if (value !== undefined) {
          // If value is empty and optional, use empty string (will replace with nothing)
          // If value is empty and not optional but has default, use default
          if (value === '' && isOptional) {
            variables[key] = '';
          } else if (value === '' && defaultValue) {
            variables[key] = defaultValue;
          } else {
            variables[key] = value;
          }
        } else {
          // If user cancelled the input box, stop the insertion process
          vscode.window.showInformationMessage('Snippet insertion cancelled.');
          return;
        }
      }
      
      // Add built-in variables
      variables['Date'] = new Date().toLocaleDateString();
      variables['Author'] = vscode.workspace.getConfiguration('snippetComposer').get('author', '');
      
      // Show preview and confirm insertion
      const shouldInsert = await this.showPreviewAndConfirm(snippet, variables);
      
      if (!shouldInsert) {
        vscode.window.showInformationMessage('Snippet insertion cancelled.');
        return;
      }
      
      // Get workspace folder - use basePath if provided, otherwise select from workspace
      let workspacePath: string;
      
      if (basePath) {
        workspacePath = basePath;
      } else {
        if (!vscode.workspace.workspaceFolders) {
          vscode.window.showErrorMessage('No workspace folder is open');
          return;
        }
        
        // Multi-root workspace support: prompt user to select folder if multiple exist
        if (vscode.workspace.workspaceFolders.length > 1) {
          const folderItems = vscode.workspace.workspaceFolders.map(f => ({
            label: f.name,
            description: f.uri.fsPath,
            folder: f
          }));
          
          const selectedFolder = await vscode.window.showQuickPick(folderItems, {
            placeHolder: 'Select the workspace folder to insert snippet into'
          });
          
          if (!selectedFolder) {
            vscode.window.showInformationMessage('Snippet insertion cancelled.');
            return;
          }
          
          workspacePath = selectedFolder.folder.uri.fsPath;
        } else {
          workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
      }
      
      // Process all files and check for existing files
      const processedFiles: Array<{
        filePath: string;
        fileName: string;
        content: string;
        fullPath: string;
        fullFilePath: string;
        exists: boolean;
      }> = [];
      
      const existingFiles: string[] = [];
      
      for (const file of snippet.files) {
        const filePath = replaceTemplateVariables(file.path, variables);
        const fileName = replaceTemplateVariables(file.filename, variables);
        const content = replaceTemplateVariables(file.content, variables);
        
        const fullPath = path.join(workspacePath, filePath);
        const fullFilePath = path.join(fullPath, fileName);
        const exists = fs.existsSync(fullFilePath);
        
        if (exists) {
          existingFiles.push(fullFilePath);
        }
        
        processedFiles.push({ filePath, fileName, content, fullPath, fullFilePath, exists });
      }
      
      // Handle file overwrite check
      let overwriteDecision: 'overwrite' | 'skip' | 'cancel' = 'overwrite';
      
      if (existingFiles.length > 0) {
        const fileList = existingFiles.map(f => path.basename(f)).join(', ');
        const result = await vscode.window.showWarningMessage(
          `${existingFiles.length} file(s) already exist: ${fileList}`,
          { modal: true },
          'Overwrite',
          'Skip Existing',
          'Cancel'
        );
        
        if (result === 'Cancel' || result === undefined) {
          vscode.window.showInformationMessage('Snippet insertion cancelled.');
          return;
        }
        
        overwriteDecision = result === 'Overwrite' ? 'overwrite' : 'skip';
      }
      
      // Create files
      let filesCreated = 0;
      let filesSkipped = 0;
      
      for (const pf of processedFiles) {
        // Skip existing files if user chose to skip
        if (pf.exists && overwriteDecision === 'skip') {
          filesSkipped++;
          continue;
        }
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(pf.fullPath)) {
          fs.mkdirSync(pf.fullPath, { recursive: true });
        }
        
        // Create file
        fs.writeFileSync(pf.fullFilePath, pf.content);
        filesCreated++;
        
        // Open the created file
        const fileUri = vscode.Uri.file(pf.fullFilePath);
        await vscode.window.showTextDocument(fileUri);
      }
      
      // Show success message with details
      let message = `Snippet '${snippet.name}' inserted successfully`;
      message += ` (${filesCreated} file(s) created`;
      if (filesSkipped > 0) {
        message += `, ${filesSkipped} file(s) skipped - already existed)`;
      } else {
        message += ')';
      }
      vscode.window.showInformationMessage(message);
      this.usageCounts.set(snippet.id, (this.usageCounts.get(snippet.id) || 0) + 1);
      this.saveSnippets();
      await this.runPostInsertHooks(workspacePath);
    } catch (error) {
      console.error('Error in insertSnippet:', error);
      vscode.window.showErrorMessage(`Error inserting snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async runPostInsertHooks(cwd: string): Promise<void> {
    const hooks = vscode.workspace.getConfiguration('snippetComposer').get<string[]>('postInsertHooks', []);
    if (!hooks || hooks.length === 0) {
      return;
    }

    for (const hook of hooks) {
      const command = hook.trim();
      if (!command) {
        continue;
      }

      const terminal = vscode.window.createTerminal({ name: 'Snippet Composer Hook', cwd });
      terminal.show(true);
      terminal.sendText(command);
    }
  }

  async importFromMarketplaceIndex(indexUrl: string): Promise<void> {
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Marketplace index request failed: ${response.status}`);
    }

    const payload = await response.json();
    const importData = this.parseImportData(payload);
    for (const snippet of importData.snippets) {
      this.snippets.set(snippet.id, snippet);
    }
    for (const folder of importData.folders) {
      this.folders.set(folder.id, folder);
    }
    this.saveSnippets();
  }
  
  /**
   * Shows a preview of what will be created and asks for confirmation
   */
  private async showPreviewAndConfirm(snippet: Snippet, variables: { [key: string]: string }): Promise<boolean> {
    // Process the files with variables
    const processedFiles: Array<{
      originalPath: string;
      originalFilename: string;
      path: string;
      filename: string;
      content: string;
    }> = [];
    
    for (const file of snippet.files) {
      const processedPath = replaceTemplateVariables(file.path, variables);
      const processedFilename = replaceTemplateVariables(file.filename, variables);
      const processedContent = replaceTemplateVariables(file.content, variables);
      
      processedFiles.push({
        originalPath: file.path,
        originalFilename: file.filename,
        path: processedPath,
        filename: processedFilename,
        content: processedContent
      });
    }
    
    // Create a preview panel to show the results
    const panel = vscode.window.createWebviewPanel(
      'snippetPreview',
      `Preview: ${snippet.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
        ]
      }
    );
    
    // Get the workspace path for displaying relative paths
    // Generate HTML for the preview
    const previewHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Snippet Preview: ${snippet.name}</title>
        <style>
          :root {
            --border-radius: 6px;
            --section-spacing: 24px;
            --border-color: var(--vscode-panel-border);
            --primary-color: var(--vscode-button-background);
            --primary-hover-color: var(--vscode-button-hoverBackground);
          }
          
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            max-width: 900px;
            margin: 0 auto;
            line-height: 1.5;
          }
          
          h1 {
            margin-bottom: 24px;
            font-size: 24px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 12px;
          }
          
          .info-box {
            background-color: rgba(0,122,204,0.1);
            border-left: 4px solid var(--primary-color);
            padding: 12px;
            margin-bottom: var(--section-spacing);
            border-radius: var(--border-radius);
          }
          
          .file-preview {
            margin-bottom: 24px;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            overflow: hidden;
          }
          
          .file-header {
            padding: 10px 16px;
            background-color: var(--vscode-panel-background);
            border-bottom: 1px solid var(--border-color);
          }
          
          .file-path {
            opacity: 0.7;
            font-size: 12px;
            margin-top: 3px;
          }
          
          .file-content {
            padding: 12px;
            background-color: var(--vscode-editor-background);
            overflow-x: auto;
            white-space: pre;
            font-family: monospace;
            max-height: 400px;
            overflow-y: auto;
          }
          
          .variables-section {
            margin-top: var(--section-spacing);
            margin-bottom: var(--section-spacing);
          }
          
          .variable-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
          }
          
          .variable-item:last-child {
            border-bottom: none;
          }
          
          .variable-name {
            font-weight: bold;
          }
          
          .actions {
            margin-top: 32px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          
          button {
            background-color: var(--primary-color);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: var(--border-radius);
            font-weight: 500;
          }
          
          button:hover {
            background-color: var(--primary-hover-color);
          }
          
          .cancel-button {
            background-color: transparent;
            border: 1px solid var(--border-color);
            color: var(--vscode-foreground);
          }
        </style>
    </head>
    <body>
        <h1>Preview: ${snippet.name}</h1>
        
        <div class="info-box">
          This preview shows what will be created when you insert this snippet. Review the files and their content before confirming.
        </div>
        
        <h2>Files to be created:</h2>
        
        ${processedFiles.map(file => `
          <div class="file-preview">
            <div class="file-header">
              <strong>${file.filename}</strong>
              <div class="file-path">${file.path}/${file.filename}</div>
            </div>
            <pre class="file-content">${this.escapeHtml(file.content)}</pre>
          </div>
        `).join('')}
        
        <div class="variables-section">
          <h2>Variables used:</h2>
          ${Object.entries(variables).map(([key, value]) => `
            <div class="variable-item">
              <span class="variable-name">${'{{'}}${key}${'}}'}</span>
              <span class="variable-value">${value}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="actions">
          <button class="cancel-button" id="cancel">Cancel</button>
          <button id="insert">Insert Snippet</button>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          document.getElementById('insert').addEventListener('click', () => {
            vscode.postMessage({ command: 'confirm' });
          });
          
          document.getElementById('cancel').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
          });
        </script>
    </body>
    </html>
    `;
    
    panel.webview.html = previewHtml;
    
    // Wait for user response
    return new Promise<boolean>(resolve => {
      let resolved = false;
      
      const disposable = panel.webview.onDidReceiveMessage(
        message => {
          if (resolved) {
            return;
          }
          
          if (message.command === 'confirm') {
            resolved = true;
            disposable.dispose();
            panel.dispose();
            resolve(true);
          } else if (message.command === 'cancel') {
            resolved = true;
            disposable.dispose();
            panel.dispose();
            resolve(false);
          }
        },
        undefined,
        this.context.subscriptions
      );
      
      // Also dispose if panel is closed directly
      panel.onDidDispose(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });
    });
  }
  
  /**
   * Helper function to escape HTML for display in preview
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  async exportSnippets(): Promise<void> {
    const exportData = {
      snippets: Array.from(this.snippets.values()),
      folders: Array.from(this.folders.values())
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Show save dialog
    const defaultExportBase = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(defaultExportBase, 'snippet-composer-export.json')),
      filters: {
        'JSON Files': ['json']
      }
    });
    
    if (uri) {
      fs.writeFileSync(uri.fsPath, jsonData);
    }
  }
  
  async importSnippets(): Promise<void> {
    // Show open dialog
    const defaultImportBase = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(defaultImportBase),
      filters: {
        'JSON Files': ['json']
      }
    });
    
    if (uris && uris.length > 0) {
      try {
        const jsonData = fs.readFileSync(uris[0].fsPath, 'utf8');
        const importData = this.parseImportData(JSON.parse(jsonData));
        
        for (const snippet of importData.snippets) {
          this.snippets.set(snippet.id, snippet);
        }
        
        for (const folder of importData.folders) {
          this.folders.set(folder.id, folder);
        }
        
        this.saveSnippets();
        vscode.window.showInformationMessage(
          `Imported ${importData.snippets.length} snippet(s) and ${importData.folders.length} folder(s).`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to import snippets: ${error instanceof Error ? error.message : 'Invalid import file'}`
        );
      }
    }
  }
  
  async duplicateSnippet(snippetId: string): Promise<Snippet | undefined> {
    const original = await this.getSnippet(snippetId);
    if (!original) {
      vscode.window.showErrorMessage('Snippet not found');
      return undefined;
    }
    
    // Create a deep copy with new ID
    const duplicate: Snippet = {
      ...JSON.parse(JSON.stringify(original)),
      id: Date.now().toString(),
      name: `${original.name} (Copy)`
    };
    
    this.snippets.set(duplicate.id, duplicate);
    this.saveSnippets();
    
    return duplicate;
  }
  
  async exportSingleSnippet(snippetId: string): Promise<void> {
    const snippet = await this.getSnippet(snippetId);
    if (!snippet) {
      vscode.window.showErrorMessage('Snippet not found');
      return;
    }
    
    // Get the folder if any
    let folder: SnippetFolder | undefined;
    if (snippet.folderId) {
      folder = this.folders.get(snippet.folderId);
    }
    
    const exportData = {
      snippets: [snippet],
      folders: folder ? [folder] : []
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Sanitize snippet name for filename
    const safeName = snippet.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    // Show save dialog
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${safeName}.json`),
      filters: {
        'JSON Files': ['json']
      }
    });
    
    if (uri) {
      fs.writeFileSync(uri.fsPath, jsonData);
      vscode.window.showInformationMessage(`Snippet '${snippet.name}' exported successfully`);
    }
  }

  async uploadToGist(): Promise<void> {
    try {
      // Get GitHub token from secrets
      const session = await vscode.authentication.getSession('github', ['gist'], { createIfNone: true });
      
      if (!session) {
        vscode.window.showErrorMessage('GitHub authentication required for Gist sync');
        return;
      }

      const token = session.accessToken;
      const config = vscode.workspace.getConfiguration('snippetComposer');
      const gistId = config.get<string>('gist.id', '');
      
      const exportData = {
        snippets: Array.from(this.snippets.values()),
        folders: Array.from(this.folders.values())
      };
      
      const content = JSON.stringify(exportData, null, 2);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      
      let response: Response;
      
      if (gistId) {
        // Update existing gist
        response = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            description: 'Snippet Composer Snippets',
            files: {
              'snippet-composer-data.json': {
                content
              }
            }
          })
        });
      } else {
        // Create new gist
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            description: 'Snippet Composer Snippets',
            public: false,
            files: {
              'snippet-composer-data.json': {
                content
              }
            }
          })
        });
      }
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as { id: string };
      
      // Save gist ID if new
      if (!gistId && data.id) {
        await config.update('gist.id', data.id, vscode.ConfigurationTarget.Global);
      }
      
      vscode.window.showInformationMessage('Snippets uploaded to GitHub Gist successfully');
    } catch (error) {
      console.error('Error uploading to Gist:', error);
      vscode.window.showErrorMessage(`Failed to upload to Gist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadFromGist(): Promise<void> {
    try {
      // Get GitHub token from secrets
      const session = await vscode.authentication.getSession('github', ['gist'], { createIfNone: true });
      
      if (!session) {
        vscode.window.showErrorMessage('GitHub authentication required for Gist sync');
        return;
      }

      const token = session.accessToken;
      const config = vscode.workspace.getConfiguration('snippetComposer');
      const gistId = config.get<string>('gist.id', '');
      
      if (!gistId) {
        vscode.window.showErrorMessage('No Gist ID configured. Upload your snippets first to create a Gist.');
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as { files: { [key: string]: { content: string } } };
      const fileContent = data.files['snippet-composer-data.json']?.content;
      
      if (!fileContent) {
        throw new Error('No snippet data found in Gist');
      }
      
      const parsedData = this.parseImportData(JSON.parse(fileContent));

      // Ask user whether to merge or replace local data
      const syncMode = await vscode.window.showWarningMessage(
        'Choose how to apply cloud snippets to your local data.',
        { modal: true },
        'Merge',
        'Replace',
        'Cancel'
      );
      
      if (!syncMode || syncMode === 'Cancel') {
        return;
      }

      if (syncMode === 'Replace') {
        this.snippets.clear();
        this.folders.clear();
      }

      for (const snippet of parsedData.snippets) {
        this.snippets.set(snippet.id, snippet);
      }

      for (const folder of parsedData.folders) {
        this.folders.set(folder.id, folder);
      }
      
      this.saveSnippets();
      vscode.window.showInformationMessage(
        `Cloud sync complete (${syncMode.toLowerCase()}): ${parsedData.snippets.length} snippet(s), ${parsedData.folders.length} folder(s).`
      );
    } catch (error) {
      console.error('Error downloading from Gist:', error);
      vscode.window.showErrorMessage(`Failed to download from Gist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}