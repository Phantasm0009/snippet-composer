import * as vscode from 'vscode';
import * as path from 'path';
import { SnippetManager, Snippet } from './snippetManager';
import { MonacoProvider } from './monacoProvider';

export class SnippetEditorProvider {
  private currentPanel: vscode.WebviewPanel | undefined;
  private onSaveCallback: (() => void) | undefined;
  
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly snippetManager: SnippetManager
  ) {}
  
  public setOnSaveCallback(callback: () => void) {
    this.onSaveCallback = callback;
  }
  
  public openEditor(snippet?: Snippet) {
    try {
      if (this.currentPanel) {
        this.currentPanel.reveal(vscode.ViewColumn.One);
        if (snippet) {
          // Update title to indicate we're editing
          this.currentPanel.title = `Edit Snippet: ${snippet.name}`;
          this.updateContent(snippet);
        }
        return;
      }
      
      // Show a notification with progress while loading
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: snippet ? `Loading snippet: ${snippet.name}` : 'Opening snippet editor',
        cancellable: false
      }, async (progress) => {
        // Prepare Monaco files
        await Promise.resolve(MonacoProvider.ensureMonacoFilesPresent(this.context));
        
        progress.report({ increment: 50, message: "Preparing editor..." });
        
        // Create and show the webview panel
        this.currentPanel = vscode.window.createWebviewPanel(
          'snippetComposerEditor',
          snippet ? `Edit Snippet: ${snippet.name}` : 'Create New Snippet',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
              vscode.Uri.file(path.join(this.context.globalStoragePath))
            ]
          }
        );
        
        // Set initial content - must be done here inside the progress handler
        this.updateContent(snippet);
        
        // Set up message handling and disposal
        this.setupMessageHandling();
        
        return new Promise(resolve => {
          setTimeout(resolve, 500); // Just for visual feedback
        });
      });
    } catch (error) {
      console.error('Error opening snippet editor:', error);
      vscode.window.showErrorMessage(`Error opening snippet editor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private setupMessageHandling() {
    if (!this.currentPanel) {
      return;
    }
    
    // Handle messages from the webview
    this.currentPanel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'saveSnippet':
            const isNewSnippet = message.isNew;
            await this.snippetManager.saveSnippet(message.snippet);
            // Refresh the explorer via callback
            if (this.onSaveCallback) {
              this.onSaveCallback();
            }
            
            // For new snippets, offer to insert immediately
            if (isNewSnippet) {
              const action = await vscode.window.showInformationMessage(
                `Snippet '${message.snippet.name}' created successfully!`,
                'Insert Now',
                'Close'
              );
              
              if (action === 'Insert Now') {
                // Close the editor and insert the snippet
                this.currentPanel?.dispose();
                await this.snippetManager.insertSnippet(message.snippet);
              }
            } else {
              vscode.window.showInformationMessage(`Snippet '${message.snippet.name}' saved successfully`);
            }
            break;
          case 'deleteSnippet':
            try {
              // Add better error handling and logging
              console.log(`Delete request received for snippet ID: ${message.snippetId}`);
              
              // Make sure we have a valid ID
              if (!message.snippetId) {
                throw new Error('No snippet ID provided for deletion');
              }
              
              // Delete the snippet and check if it was successful
              const deleted = await this.snippetManager.deleteSnippet(message.snippetId);
              
              if (!deleted) {
                throw new Error(`Snippet with ID '${message.snippetId}' was not found`);
              }
              
              // Refresh the explorer view via callback
              if (this.onSaveCallback) {
                this.onSaveCallback();
              }
              
              vscode.window.showInformationMessage('Snippet deleted successfully');
              
              // Close the editor panel
              this.currentPanel?.dispose();
            } catch (error) {
              console.error('Error deleting snippet:', error);
              vscode.window.showErrorMessage(`Failed to delete snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            break;
          case 'getFolders':
            const folders = await this.snippetManager.getFolders();
            this.currentPanel?.webview.postMessage({
              command: 'foldersList',
              folders
            });
            break;
          case 'getTags':
            const tags = await this.snippetManager.getAllTags();
            this.currentPanel?.webview.postMessage({
              command: 'tagsList',
              tags
            });
            break;
          case 'editorError':
            vscode.window.showErrorMessage(`Editor error: ${message.error}`);
            break;
          case 'showError':
            vscode.window.showErrorMessage(message.message);
            break;
          case 'confirmDelete':
            // Show VS Code confirmation dialog
            const confirmResult = await vscode.window.showWarningMessage(
              `Are you sure you want to delete "${message.snippetName}"? This action cannot be undone.`,
              { modal: true },
              'Delete'
            );
            
            if (confirmResult === 'Delete') {
              try {
                console.log(`User confirmed deletion of snippet ID: ${message.snippetId}`);
                
                const deleted = await this.snippetManager.deleteSnippet(message.snippetId);
                
                if (!deleted) {
                  throw new Error(`Snippet with ID '${message.snippetId}' was not found`);
                }
                
                if (this.onSaveCallback) {
                  this.onSaveCallback();
                }
                
                vscode.window.showInformationMessage('Snippet deleted successfully');
                this.currentPanel?.dispose();
              } catch (error) {
                console.error('Error deleting snippet:', error);
                vscode.window.showErrorMessage(`Failed to delete snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
    
    // Reset the panel when it's closed
    this.currentPanel.onDidDispose(
      () => {
        this.currentPanel = undefined;
      },
      null,
      this.context.subscriptions
    );
  }
  
  public createNewSnippet() {
    const newSnippet: Snippet = {
      id: Date.now().toString(),
      name: 'New Snippet',
      description: '',
      tags: [],
      files: [{
        filename: 'example.js',
        path: '',
        content: '// Your code here\n'
      }],
      variables: {
        'ComponentName': 'MyComponent'
      }
    };
    
    this.openEditor(newSnippet);
  }
  
  private updateContent(snippet?: Snippet) {
    if (!this.currentPanel) {
      return;
    }
    
    this.currentPanel.webview.html = this.getWebviewContent(snippet);
  }
  
  private getWebviewContent(snippet?: Snippet): string {
    if (!this.currentPanel) {
      return '';
    }
    
    // Get Monaco URIs
    const monacoResources = MonacoProvider.getMonacoResourceUris(this.context, this.currentPanel.webview);
    
    // Get current theme kind for Monaco
    const themeKind = vscode.window.activeColorTheme.kind;
    const monacoTheme = themeKind === vscode.ColorThemeKind.Light || themeKind === vscode.ColorThemeKind.HighContrastLight
      ? 'vs' 
      : 'vs-dark';
    
    // Add edit mode styling
    const isEditMode = !!snippet;
    const editModeStyles = isEditMode ? `
      .edit-badge {
        background-color: var(--vscode-statusBarItem-remoteBackground);
        color: var(--vscode-statusBarItem-remoteForeground);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        margin-left: 10px;
        vertical-align: middle;
      }
    ` : '';

    // Create script content separately
    const previewVariableScript = `
    function updatePreviewVariablesList() {
      const variablesList = document.getElementById('previewVariablesList');
      
      if (!variablesList) return;
      variablesList.innerHTML = '';
      
      // Get all variable keys from the form
      const variableItems = document.getElementsByClassName('variable-item');
      const variables = {};
      
      // Built-in variables
      variables['Date'] = new Date().toLocaleDateString();
      variables['Author'] = 'Sample Author';
      
      // User-defined variables
      for (let i = 0; i < variableItems.length; i++) {
        const nameInput = variableItems[i].querySelector('.var-name');
        const valueInput = variableItems[i].querySelector('.var-value');
        
        if (nameInput && valueInput && nameInput.value) {
          variables[nameInput.value] = valueInput.value || 'Example Value';
        }
      }
      
      // Display the preview variables
      for (const [key, value] of Object.entries(variables)) {
        const item = document.createElement('div');
        item.className = 'preview-variable-item';
        item.innerHTML = '<span class="preview-variable-name">{{' + key + '}}</span>' +
                          '<span class="preview-variable-value">' + value + '</span>';
        variablesList.appendChild(item);
      }
      
      return variables;
    }
    `;

    const generatePreviewScript = `
    function generatePreview() {
      const previewContent = document.getElementById('previewContent');
      if (!previewContent) return;
      
      // Get current variables
      const variables = updatePreviewVariablesList();
      
      // Get all files from the form
      const fileItems = document.getElementsByClassName('file-item');
      
      if (fileItems.length === 0) {
        previewContent.innerHTML = '<div class="preview-empty">' +
                                  '<p>No files to preview. Add files in the Files tab.</p>' +
                                  '</div>';
        return;
      }
      
      let previewHtml = '';
      
      // Process each file
      for (let i = 0; i < fileItems.length; i++) {
        const fileItem = fileItems[i];
        const filepathInput = fileItem.querySelector('.filepath');
        const filenameInput = fileItem.querySelector('.filename');
        const contentTextarea = fileItem.querySelector('.filecontent');
        
        if (!filepathInput || !filenameInput || !contentTextarea) continue;
        
        let filePath = filepathInput.value || '';
        let fileName = filenameInput.value || '';
        let content = '';
        
        // If we have a Monaco editor for this file, get content from there
        const index = fileItem.dataset.index;
        if (monacoEditors && monacoEditors[index]) {
          content = monacoEditors[index].getValue();
        } else {
          content = contentTextarea.value;
        }
        
        // Replace variables in file path, name and content
        const regex = /\{\{([^|{}]+)(?:\|([^{}]+))?\}\}/g;
        
        // Function to process transformations
        const processTransformation = (match, varName, transform, value) => {
          if (!value && variables[varName] !== undefined) {
            value = variables[varName];
          }
          
          if (value === undefined) {
            return match; // No replacement if variable not found
          }
          
          // Apply transformations
          if (transform) {
            // Handle empty string edge case
            if (value === '') {
              return value;
            }
            switch (transform.toLowerCase()) {
              case 'lowercase':
                return value.toLowerCase();
              case 'uppercase':
                return value.toUpperCase();
              case 'capitalize':
                return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
              case 'camelcase':
                return value.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => 
                  index === 0 ? letter.toLowerCase() : letter.toUpperCase()
                ).replace(/\\s+/g, '');
              case 'snakecase':
                return value
                  .replace(/([a-z])([A-Z])/g, '$1_$2')
                  .replace(/[\\s-]+/g, '_')
                  .toLowerCase();
              case 'kebabcase':
                return value
                  .replace(/([a-z])([A-Z])/g, '$1-$2')
                  .replace(/[\\s_]+/g, '-')
                  .toLowerCase();
              case 'pascalcase':
                return value
                  .replace(/(?:^\w|[A-Z]|\b\w|[\\s_-]+\w)/g, (match) => 
                    match.replace(/[\\s_-]/g, '').toUpperCase()
                  )
                  .replace(/[\\s_-]+/g, '');
              default:
                return value;
            }
          }
          
          return value;
        };
        
        // Process replacements
        filePath = filePath.replace(regex, (match, varName, transform) => 
          processTransformation(match, varName, transform));
        fileName = fileName.replace(regex, (match, varName, transform) => 
          processTransformation(match, varName, transform));
        content = content.replace(regex, (match, varName, transform) => 
          processTransformation(match, varName, transform));

        // Create preview HTML for this file
        const previewId = "preview-file-" + i;
        
        previewHtml += '<div class="preview-file">' +
                      '<div class="preview-file-header">' +
                      '<div>' +
                      '<strong>' + fileName + '</strong>' +
                      '<div class="preview-file-path">' + filePath + '</div>' +
                      '</div>' +
                      '</div>' +
                      '<div id="' + previewId + '" class="preview-editor-container"></div>' +
                      '</div>';
      }
      
      // Update the preview content
      previewContent.innerHTML = previewHtml;
      
      // Initialize Monaco editors for the preview files
      setTimeout(() => {
        // Initialize preview editors
        for (let i = 0; i < fileItems.length; i++) {
          const fileItem = fileItems[i];
          const filepathInput = fileItem.querySelector('.filepath');
          const filenameInput = fileItem.querySelector('.filename');
          
          if (!filepathInput || !filenameInput) continue;
          
          let content = '';
          
          // If we have a Monaco editor for this file, get content from there
          const index = fileItem.dataset.index;
          if (monacoEditors && monacoEditors[index]) {
            content = monacoEditors[index].getValue();
          } else {
            const contentTextarea = fileItem.querySelector('.filecontent');
            content = contentTextarea ? contentTextarea.value : '';
          }
          
          // Process variables in content
          const regex = /\{\{([^|{}]+)(?:\|([^{}]+))?\}\}/g;
          content = content.replace(regex, (match, varName, transform) => {
            if (variables[varName] !== undefined) {
              let value = variables[varName];
              
              // Handle empty string edge case
              if (value === '') {
                return value;
              }
              
              // Apply transformations
              if (transform) {
                switch (transform.toLowerCase()) {
                  case 'lowercase':
                    return value.toLowerCase();
                  case 'uppercase':
                    return value.toUpperCase();
                  case 'capitalize':
                    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                  case 'camelcase':
                    return value.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => 
                      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
                    ).replace(/\\s+/g, '');
                  case 'snakecase':
                    return value
                      .replace(/([a-z])([A-Z])/g, '$1_$2')
                      .replace(/[\\s-]+/g, '_')
                      .toLowerCase();
                  case 'kebabcase':
                    return value
                      .replace(/([a-z])([A-Z])/g, '$1-$2')
                      .replace(/[\\s_]+/g, '-')
                      .toLowerCase();
                  case 'pascalcase':
                    return value
                      .replace(/(?:^\w|[A-Z]|\b\w|[\\s_-]+\w)/g, (match) => 
                        match.replace(/[\\s_-]/g, '').toUpperCase()
                      )
                      .replace(/[\\s_-]+/g, '');
                  default:
                    return value;
                }
              }
              
              return value;
            }
            return match; // No replacement if variable not found
          });
          
          // Determine language for syntax highlighting
          const fileName = filenameInput.value;
          const fileExtension = fileName.split('.').pop();
          let language = 'plaintext';
          
          // Map file extensions to languages
          const langMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
          };
          
          if (fileExtension && langMap[fileExtension.toLowerCase()]) {
            language = langMap[fileExtension.toLowerCase()];
          }
          
          // Create Monaco editor for this preview
          const previewId = 'preview-file-' + i;
          const previewElement = document.getElementById(previewId);
          
          if (previewElement && typeof monaco !== 'undefined') {
            monaco.editor.create(previewElement, {
              value: content,
              language: language,
              theme: monacoTheme,
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: 'on',
              contextmenu: false
            });
          }
        }
      }, 100);
    }
    `;

    const filesTabContent = `
      <div id="general" class="tab-content active">
        <div class="info-box">
          Create a reusable code snippet with name, description and tags to help you find it later.
        </div>
        
        <div class="card">
          <div class="form-group">
            <label for="name">Snippet Name *</label>
            <input type="text" id="name" value="${snippet?.name || ''}">
            <div class="help-text">A short, descriptive name for your snippet</div>
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" rows="3">${snippet?.description || ''}</textarea>
            <div class="help-text">What does this snippet do? When would you use it?</div>
          </div>
          
          <div class="form-group">
            <label for="folder">Folder</label>
            <select id="folder">
              <option value="">Root</option>
              <!-- Folders will be populated dynamically -->
            </select>
            <div class="help-text">Organize your snippets in folders</div>
          </div>
          
          <div class="form-group">
            <label>Tags</label>
            <div class="tag-input">
              <input type="text" id="tagInput" list="tagSuggestions" placeholder="Add tag and press Enter">
              <datalist id="tagSuggestions">
                <!-- Tag suggestions will be populated dynamically -->
              </datalist>
              <div class="help-text">Press Enter after each tag. Start typing for suggestions.</div>
            </div>
            <div class="tag-container" id="tagContainer">
              ${(snippet?.tags || []).map(tag => `
                <div class="tag">${tag}<button onclick="removeTag('${tag}')">&times;</button></div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div id="files" class="tab-content">
        <div class="info-box">
          Add files that will be created when you insert this snippet. You can use variables like {{ComponentName}} in file paths, names, and content.
        </div>
        
        <div class="file-list" id="fileList">
          ${(snippet?.files || []).map((file, index) => `
            <div class="file-item" data-index="${index}">
              <div class="file-header">
                <div class="file-title">
                  <div class="drag-handle">≡</div>
                  <span>File ${index + 1}: <span class="filename-display">${file.filename}</span></span>
                </div>
                <button class="secondary-button" onclick="removeFile(${index})">Remove</button>
              </div>
              
              <div class="file-path-section">
                <div class="form-group">
                  <label>Path</label>
                  <input type="text" class="filepath" value="${file.path}" placeholder="e.g., src/components/{{ComponentName}}">
                  <div class="help-text">Folder path where the file will be created</div>
                </div>
                
                <div class="form-group">
                  <label>Filename</label>
                  <input type="text" class="filename" value="${file.filename}" placeholder="e.g., {{ComponentName}}.tsx">
                  <div class="help-text">File name with extension</div>
                </div>
              </div>
              
              <div class="form-group">
                <label>Content</label>
                <div class="editor-container" id="editor-${index}"></div>
                <div class="help-text">Code content with optional variables like {{ComponentName}}</div>
              </div>
              
              <textarea class="filecontent" style="display:none;">${file.content}</textarea>
            </div>
          `).join('')}
        </div>
        
        <button onclick="addFile()" class="primary-button">+ Add File</button>
      </div>
      
      <div id="variables" class="tab-content">
        <div class="info-box">
          Define variables that will be used in your snippet. When inserting a snippet, you'll be prompted to provide values for these variables.
        </div>
        
        <h3 class="section-header">Custom Variables</h3>
        <div class="variable-list" id="variableList">
          ${Object.entries(snippet?.variables || {}).map(([key, value], index) => `
            <div class="variable-item" data-index="${index}">
              <input type="text" class="var-name" placeholder="Variable name" value="${key}" title="Use this in your snippet as {{${key}}}">
              <input type="text" class="var-value" placeholder="Default value" value="${value}">
              <button class="secondary-button" onclick="removeVariable(${index})">Remove</button>
            </div>
          `).join('')}
        </div>
        
        <button onclick="addVariable()" class="primary-button">+ Add Variable</button>
        
        <h3 class="section-header">Built-in Variables</h3>
        <div class="card">
          <p>These variables are available in all snippets:</p>
          <ul>
            <li><code>{{Date}}</code> - Current date</li>
            <li><code>{{Author}}</code> - Your name (set in extension settings)</li>
          </ul>
        </div>
      </div>
      
      <div id="preview" class="tab-content">
        <div class="info-box">
          This preview shows how your snippet will look with sample variable values. The actual content will depend on the values provided when inserting the snippet.
        </div>
        
        <div class="preview-variables">
          <h3 class="section-header">Preview Variables</h3>
          <p>These values will be used to render the preview:</p>
          <div id="previewVariablesList">
            <!-- Variable preview will be generated here -->
          </div>
          <div style="text-align: right; margin-top: 10px;">
            <button onclick="generatePreview()" class="secondary-button">Refresh Preview</button>
          </div>
        </div>
        
        <div id="previewContent">
          <!-- Preview content will be generated here -->
        </div>
      </div>
    `;

    // Create a basic HTML structure with Monaco editor
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this.currentPanel.webview.cspSource} https:; script-src ${this.currentPanel.webview.cspSource} 'unsafe-inline'; style-src ${this.currentPanel.webview.cspSource} 'unsafe-inline'; font-src ${this.currentPanel.webview.cspSource};">
      <title>${snippet ? 'Edit Snippet: ' + snippet.name : 'Create New Snippet'}</title>
      <!-- Include Monaco editor resources -->
      <script>
        var require = { paths: { vs: '${monacoResources.monacoUri.toString()}' } };
      </script>
      <script src="${monacoResources.loaderUri.toString()}"></script>
      <style>
        :root {
          --border-radius: 6px;
          --transition-speed: 0.2s;
          --primary-color: var(--vscode-button-background);
          --primary-hover-color: var(--vscode-button-hoverBackground);
          --error-color: var(--vscode-errorForeground);
          --card-background: var(--vscode-editor-background);
          --border-color: var(--vscode-panel-border);
          --header-color: var(--vscode-panelTitle-activeForeground);
          --section-spacing: 24px;
        }
        
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          max-width: 1000px;
          margin: 0 auto;
          line-height: 1.5;
        }
        
        h1 {
          margin-bottom: 24px;
          font-size: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          color: var(--header-color);
        }
        
        ${editModeStyles}
        
        .form-group {
          margin-bottom: 16px;
        }
        
        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
        }
        
        .help-text {
          font-size: 12px;
          opacity: 0.8;
          margin-top: 4px;
        }

        input, textarea, select {
          width: 100%;
          padding: 8px 12px;
          box-sizing: border-box;
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: var(--border-radius);
          transition: border-color var(--transition-speed);
        }
        
        input:focus, textarea:focus, select:focus {
          border-color: var(--vscode-focusBorder);
          outline: none;
          box-shadow: 0 0 0 2px rgba(0,122,204,0.2);
        }
        
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: var(--section-spacing);
          gap: 5px;
        }
        
        .tab {
          padding: 10px 16px;
          cursor: pointer;
          border-radius: var(--border-radius) var(--border-radius) 0 0;
          border: 1px solid transparent;
          transition: all var(--transition-speed);
          user-select: none;
          position: relative;
        }
        
        .tab:hover {
          background-color: var(--vscode-list-hoverBackground);
        }
        
        .tab.active {
          background-color: var(--card-background);
          border: 1px solid var(--border-color);
          border-bottom-color: var(--card-background);
          position: relative;
          top: 1px;
          font-weight: 500;
        }
        
        .tab-content {
          display: none;
          padding: var(--section-spacing) 0;
        }
        
        .tab-content.active {
          display: block;
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .card {
          background-color: var(--card-background);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 16px;
          margin-bottom: var(--section-spacing);
        }
        
        .file-item {
          border: 1px solid var(--border-color);
          padding: 16px;
          margin-bottom: 16px;
          border-radius: var(--border-radius);
          background-color: var(--card-background);
        }
        
        .file-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        
        .file-title {
          font-weight: bold;
          font-size: 15px;
          display: flex;
          align-items: center;
        }
        
        .drag-handle {
          cursor: grab;
          margin-right: 10px;
          padding: 0 8px;
          color: var(--vscode-disabledForeground);
        }
        
        .file-item.dragging {
          opacity: 0.5;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        
        button {
          background-color: var(--primary-color);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 8px 14px;
          cursor: pointer;
          margin-right: 10px;
          border-radius: var(--border-radius);
          transition: background-color var(--transition-speed);
          font-weight: 500;
        }
        
        button:hover {
          background-color: var(--primary-hover-color);
        }
        
        .secondary-button {
          background-color: transparent;
          border: 1px solid var(--primary-color);
          color: var(--primary-color);
        }
        
        .secondary-button:hover {
          background-color: rgba(0,122,204,0.1);
        }
        
        .delete-btn {
          background-color: var(--error-color);
        }
        
        .delete-btn:hover {
          opacity: 0.8;
        }
        
        .tag-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        
        .tag {
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 4px 8px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          font-size: 12px;
        }
        
        .tag button {
          background: none;
          border: none;
          margin-left: 5px;
          cursor: pointer;
          color: var(--vscode-badge-foreground);
          padding: 0 4px;
          margin-right: 0;
          font-weight: bold;
        }
        
        .editor-container {
          margin-top: 10px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          height: 300px;
        }
        
        .variable-list {
          margin-top: 20px;
        }
        
        .variable-item {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          align-items: center;
          background-color: var(--card-background);
          padding: 10px;
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
        }
        
        .variable-item input {
          flex: 1;
        }
        
        .info-box {
          background-color: rgba(0,122,204,0.1);
          border-left: 4px solid var(--primary-color);
          padding: 12px;
          margin-bottom: var(--section-spacing);
          border-radius: var(--border-radius);
        }
        
        .actions-bar {
          margin-top: var(--section-spacing);
          display: flex;
          justify-content: space-between;
        }
        
        .loading {
          display: none;
          text-align: center;
          padding: var(--section-spacing);
        }
        
        .loading.active {
          display: block;
        }
        
        .spinner {
          border: 3px solid rgba(0,0,0,0.1);
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .section-header {
          font-weight: 500;
          margin-bottom: 16px;
          color: var(--header-color);
        }
        
        .file-path-section {
          display: flex;
          gap: 10px;
        }
        
        .file-path-section input:first-child {
          flex: 3;
        }
        
        .file-path-section input:last-child {
          flex: 1;
        }
        
        .fallback-editor {
          font-family: monospace;
          min-height: 300px;
          resize: vertical;
        }

        .header-wrapper {
          margin-bottom: 20px;
        }

        .edit-info {
          display: flex;
          gap: 16px;
          margin-top: -16px;
          margin-bottom: 16px;
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }

        .edit-info-item .label {
          font-weight: 500;
        }

        .edit-badge {
          background-color: var(--vscode-statusBarItem-remoteBackground);
          color: var(--vscode-statusBarItem-remoteForeground);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
          vertical-align: middle;
        }
        
        /* Preview specific styles */
        .preview-file {
          margin-bottom: 24px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
        }
        
        .preview-file-header {
          padding: 10px 16px;
          background-color: var(--vscode-panel-background);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
        }
        
        .preview-file-path {
          opacity: 0.7;
          font-size: 12px;
          margin-top: 3px;
        }
        
        .preview-editor-container {
          height: 250px;
          border-radius: 0;
        }
        
        .preview-empty {
          padding: 40px;
          text-align: center;
          color: var(--vscode-disabledForeground);
        }
        
        .preview-variables {
          margin-bottom: 20px;
          padding: 12px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
        }
        
        .preview-variable-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .preview-variable-item:last-child {
          border-bottom: none;
        }
        
        .preview-variable-name {
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header-wrapper">
        <h1>
          ${snippet ? 'Edit Snippet' : 'Create New Snippet'}
          ${snippet ? '<span class="edit-badge">EDITING</span>' : ''}
        </h1>
        
        ${snippet ? `
        <div class="edit-info">
          <div class="edit-info-item">
            <span class="label">ID:</span> ${snippet.id}
          </div>
          <div class="edit-info-item">
            <span class="label">Files:</span> ${snippet.files.length}
          </div>
        </div>
        ` : ''}
      </div>
      
      <div id="loading" class="loading active">
        <div class="spinner"></div>
        <p>Loading editor...</p>
      </div>
      
      <div id="editor-content" style="display:none">
        <div class="tabs">
          <div class="tab active" data-tab="general">General</div>
          <div class="tab" data-tab="files">Files</div>
          <div class="tab" data-tab="variables">Variables</div>
          <div class="tab" data-tab="preview">Preview</div>
        </div>
        
        ${filesTabContent}
        
        <div class="actions-bar">
          <div>
            <button id="save-button">Save Snippet</button>
          </div>
          ${snippet ? '<div><button class="delete-btn" id="delete-button">Delete Snippet</button></div>' : ''}
        </div>
      </div>
      
      <script>
        const vscode = acquireVsCodeApi();
        const snippet = ${snippet ? JSON.stringify(snippet) : 'null'};
        const isNewSnippet = ${!snippet || snippet.name === 'New Snippet'};
        let monacoEditors = [];
        const monacoTheme = '${monacoTheme}';
        let allTags = [];
        
        // Setup require.js and Monaco environment
        const monacoBaseUrl = '${monacoResources.monacoUri.toString()}';
        const editorWorkerUrl = '${monacoResources.editorWorkerUri.toString()}';
        
        // This function is called when monaco is loaded
        function initMonacoEnvironment() {
          self.MonacoEnvironment = {
            getWorkerUrl: function(moduleId, label) {
              return editorWorkerUrl;
            }
          };
        }
        
        // Load Monaco editor
        document.addEventListener('DOMContentLoaded', function() {
          console.log("Document loaded, initializing...");
          
          // Setup tab switching
          document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
              const tabId = tab.getAttribute('data-tab');
              switchTab(tabId);
            });
          });
          
          // Handle tags
          const tagInput = document.getElementById('tagInput');
          if (tagInput) {
            tagInput.addEventListener('keypress', (event) => {
              if (event.key === 'Enter') {
                const tag = tagInput.value.trim();
                
                if (tag) {
                  addTag(tag);
                  tagInput.value = '';
                }
                event.preventDefault();
              }
            });
          }
          
          // Request folders when the page loads
          vscode.postMessage({ command: 'getFolders' });
          vscode.postMessage({ command: 'getTags' });
          
          // Setup keyboard shortcuts (Ctrl/Cmd+S to save)
          document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              saveSnippet();
            }
          });
          
          // Initialize Monaco editor
          try {
            console.log("Initializing Monaco environment...");
            initMonacoEnvironment();
            
            require(['vs/editor/editor.main'], function() {
              console.log("Monaco loaded successfully!");
              
              // Hide loading indicator and show editor content
              document.getElementById('loading').classList.remove('active');
              document.getElementById('editor-content').style.display = 'block';
              
              // Setup button event listeners now that content is visible
              setupButtons();
              
              // Setup editors for each file
              setupEditors();
              
              // Setup drag and drop for file items
              setupDragAndDrop();
              
            }, function(error) {
              console.error("Failed to load Monaco:", error);
              fallbackToTextareas();
            });
          } catch (error) {
            console.error("Error loading Monaco:", error);
            fallbackToTextareas();
          }
        });
        
        // Fallback to textareas if Monaco loading fails
        function fallbackToTextareas() {
          console.log("Falling back to textareas");
          document.getElementById('loading').classList.remove('active');
          document.getElementById('editor-content').style.display = 'block';
          
          // Setup button event listeners
          setupButtons();
          
          document.querySelectorAll('.file-item').forEach(fileItem => {
            const index = fileItem.dataset.index;
            const editorContainer = document.getElementById('editor-' + index);
            if (editorContainer) {
              const contentTextarea = fileItem.querySelector('.filecontent');
              const textarea = document.createElement('textarea');
              textarea.className = 'fallback-editor';
              textarea.value = contentTextarea.value;
              textarea.rows = 15;
              
              textarea.addEventListener('input', () => {
                contentTextarea.value = textarea.value;
              });
              
              editorContainer.innerHTML = '';
              editorContainer.appendChild(textarea);
            }
          });
        }
        
        // Setup Monaco editors for file content
        function setupEditors() {
          document.querySelectorAll('.file-item').forEach(fileItem => {
            const index = fileItem.dataset.index;
            const editorContainer = document.getElementById('editor-' + index);
            if (!editorContainer) return;
            
            const contentTextarea = fileItem.querySelector('.filecontent');
            if (!contentTextarea) return;
            
            const fileName = fileItem.querySelector('.filename').value;
            const fileExtension = fileName.split('.').pop();
            
            // Map file extensions to languages
            const langMap = {
              'js': 'javascript',
              'ts': 'typescript',
              'jsx': 'javascript',
              'tsx': 'typescript',
              'html': 'html',
              'css': 'css',
              'json': 'json',
              'md': 'markdown',
              'py': 'python',
            };
            
            let language = langMap[fileExtension?.toLowerCase()] || 'plaintext';
            
            // Create editor
            const editor = monaco.editor.create(editorContainer, {
              value: contentTextarea.value,
              language: language,
              theme: monacoTheme,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14,
            });
            
            // Store editor instance
            monacoEditors[index] = editor;
            
            // Update hidden textarea when editor content changes
            editor.onDidChangeModelContent(() => {
              contentTextarea.value = editor.getValue();
            });
          });
        }
        
        // Switch between tabs
        function switchTab(tabId) {
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });
          
          document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          document.getElementById(tabId).classList.add('active');
          document.querySelector('.tab[data-tab="'+tabId+'"]').classList.add('active');
          
          // Special handling for preview tab
          if (tabId === 'preview') {
            setTimeout(initializePreview, 100);
          }
          
          // When showing files tab, refresh Monaco editor layout
          if (tabId === 'files' && monacoEditors.length > 0) {
            setTimeout(() => {
              monacoEditors.forEach(editor => {
                if (editor) editor.layout();
              });
            }, 50);
          }
        }
        
        // Setup drag and drop functionality for files
        function setupDragAndDrop() {
          const fileList = document.getElementById('fileList');
          if (!fileList) return;
          
          // Make file items draggable
          document.querySelectorAll('.file-item').forEach(item => {
            item.setAttribute('draggable', 'true');
            
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragleave', handleDragLeave);
          });
        }
        
        let draggedItem = null;
        
        function handleDragStart(e) {
          draggedItem = this;
          this.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', this.dataset.index);
        }
        
        function handleDragEnd(e) {
          this.classList.remove('dragging');
          document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('drag-over');
          });
          draggedItem = null;
        }
        
        function handleDragOver(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          
          if (this !== draggedItem) {
            this.classList.add('drag-over');
          }
        }
        
        function handleDragLeave(e) {
          this.classList.remove('drag-over');
        }
        
        function handleDrop(e) {
          e.preventDefault();
          e.stopPropagation();
          
          this.classList.remove('drag-over');
          
          if (draggedItem && this !== draggedItem) {
            const fromIndex = parseInt(draggedItem.dataset.index);
            const toIndex = parseInt(this.dataset.index);
            
            // Reorder in DOM
            const fileList = document.getElementById('fileList');
            const items = Array.from(fileList.querySelectorAll('.file-item'));
            
            // Remove dragged item and insert at new position
            if (fromIndex < toIndex) {
              this.parentNode.insertBefore(draggedItem, this.nextSibling);
            } else {
              this.parentNode.insertBefore(draggedItem, this);
            }
            
            // Reindex all items
            document.querySelectorAll('.file-item').forEach((item, newIndex) => {
              item.dataset.index = newIndex;
              const titleSpan = item.querySelector('.file-title span');
              const filenameDisplay = item.querySelector('.filename-display');
              if (titleSpan && filenameDisplay) {
                const filename = filenameDisplay.textContent;
                titleSpan.innerHTML = \`File \${newIndex + 1}: <span class="filename-display">\${filename}</span>\`;
              }
            });
            
            // Rebuild Monaco editors array to match new order
            const newEditors = [];
            document.querySelectorAll('.file-item').forEach((item, newIndex) => {
              const oldIndex = items.indexOf(item);
              if (monacoEditors[oldIndex]) {
                newEditors[newIndex] = monacoEditors[oldIndex];
              }
            });
            monacoEditors = newEditors;
          }
        }
        
        // Add drag-over styling
        const dragOverStyle = document.createElement('style');
        dragOverStyle.textContent = \`
          .file-item.drag-over {
            border: 2px dashed var(--vscode-focusBorder);
            background-color: rgba(0,122,204,0.1);
          }
        \`;
        document.head.appendChild(dragOverStyle);
        
        // Add a new file to the snippet
        function addFile() {
          const fileList = document.getElementById('fileList');
          const fileCount = document.querySelectorAll('.file-item').length;
          
          const fileItemHtml = \`
            <div class="file-item" data-index="\${fileCount}">
              <div class="file-header">
                <div class="file-title">
                  <div class="drag-handle">≡</div>
                  <span>File \${fileCount + 1}: <span class="filename-display">newfile.js</span></span>
                </div>
                <button class="secondary-button" onclick="removeFile(\${fileCount})">Remove</button>
              </div>
              
              <div class="file-path-section">
                <div class="form-group">
                  <label>Path</label>
                  <input type="text" class="filepath" value="" placeholder="e.g., src/components/{{ComponentName}}">
                  <div class="help-text">Folder path where the file will be created</div>
                </div>
                
                <div class="form-group">
                  <label>Filename</label>
                  <input type="text" class="filename" value="newfile.js" placeholder="e.g., {{ComponentName}}.tsx">
                  <div class="help-text">File name with extension</div>
                </div>
              </div>
              
              <div class="form-group">
                <label>Content</label>
                <div class="editor-container" id="editor-\${fileCount}"></div>
                <div class="help-text">Code content with optional variables like {{ComponentName}}</div>
              </div>
              
              <textarea class="filecontent" style="display:none;">// Your code here</textarea>
            </div>
          \`;
          
          // Create and append the new file element
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = fileItemHtml;
          const fileItem = tempDiv.firstElementChild;
          fileList.appendChild(fileItem);
          
          // Create Monaco editor for the new file
          if (typeof monaco !== 'undefined') {
            const editorContainer = document.getElementById('editor-' + fileCount);
            const contentTextarea = fileItem.querySelector('.filecontent');
            
            const editor = monaco.editor.create(editorContainer, {
              value: '// Your code here',
              language: 'javascript',
              theme: monacoTheme,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14
            });
            
            // Store editor instance
            monacoEditors[fileCount] = editor;
            
            // Update hidden textarea when editor content changes
            editor.onDidChangeModelContent(() => {
              contentTextarea.value = editor.getValue();
            });
          }
        }
        
        // Remove a file from the snippet
        function removeFile(index) {
          const fileItem = document.querySelector(\`.file-item[data-index="\${index}"]\`);
          if (fileItem) {
            // Dispose Monaco editor
            if (monacoEditors[index]) {
              monacoEditors[index].dispose();
              delete monacoEditors[index];
            }
            
            fileItem.remove();
            
            // Update indices
            document.querySelectorAll('.file-item').forEach((item, newIndex) => {
              item.setAttribute('data-index', newIndex);
            });
          }
        }
        
        // Add a variable to the snippet
        function addVariable() {
          const variableList = document.getElementById('variableList');
          const variableCount = document.querySelectorAll('.variable-item').length;
          
          const variableHtml = \`
            <div class="variable-item" data-index="\${variableCount}">
              <input type="text" class="var-name" placeholder="Variable name">
              <input type="text" class="var-value" placeholder="Default value">
              <button class="secondary-button" onclick="removeVariable(\${variableCount})">Remove</button>
            </div>
          \`;
          
          // Create and append the new variable element
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = variableHtml;
          variableList.appendChild(tempDiv.firstElementChild);
        }
        
        // Remove a variable from the snippet
        function removeVariable(index) {
          const variableItem = document.querySelector(\`.variable-item[data-index="\${index}"]\`);
          if (variableItem) {
            variableItem.remove();
          }
        }
        
        // Add a tag
        function addTag(tag) {
          const tagContainer = document.getElementById('tagContainer');
          
          // Check if tag already exists
          const existingTags = Array.from(tagContainer.querySelectorAll('.tag')).map(t => 
            t.textContent.replace('×', '')
          );
          
          if (existingTags.includes(tag)) return;
          
          const tagHtml = \`
            <div class="tag">\${tag}<button onclick="removeTag('\${tag}')">&times;</button></div>
          \`;
          
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = tagHtml;
          tagContainer.appendChild(tempDiv.firstElementChild);
        }
        
        // Remove a tag
        function removeTag(tag) {
          const tags = document.getElementById('tagContainer').children;
          for (let i = 0; i < tags.length; i++) {
            if (tags[i].textContent.replace('×', '') === tag) {
              tags[i].remove();
              break;
            }
          }
        }
        
        // Save the snippet
        function saveSnippet() {
          // Validate required fields
          const nameInput = document.getElementById('name');
          if (!nameInput.value.trim()) {
            alert('Please enter a name for the snippet');
            nameInput.focus();
            return;
          }
          
          // Disable save button to prevent multiple clicks
          const saveButton = document.getElementById('save-button');
          saveButton.disabled = true;
          saveButton.textContent = 'Saving...';
          
          // Get general info
          const name = nameInput.value.trim();
          const description = document.getElementById('description').value.trim();
          const folderId = document.getElementById('folder').value || undefined;
          
          // Collect tags
          const tags = [];
          document.querySelectorAll('#tagContainer .tag').forEach(tag => {
            tags.push(tag.textContent.replace('×', ''));
          });
          
          // Collect files
          const files = [];
          document.querySelectorAll('.file-item').forEach(fileItem => {
            // Get content from Monaco editor if available
            let content = '';
            const index = fileItem.dataset.index;
            if (monacoEditors[index]) {
              content = monacoEditors[index].getValue();
            } else {
              const contentTextarea = fileItem.querySelector('.filecontent');
              content = contentTextarea ? contentTextarea.value : '';
            }
            
            files.push({
              filename: fileItem.querySelector('.filename').value,
              path: fileItem.querySelector('.filepath').value,
              content: content,
            });
          });
          
          // Collect variables
          const variables = {};
          document.querySelectorAll('.variable-item').forEach(item => {
            const name = item.querySelector('.var-name').value.trim();
            const value = item.querySelector('.var-value').value;
            if (name) {
              variables[name] = value;
            }
          });
          
          // Create the updated snippet object
          const updatedSnippet = {
            id: snippet ? snippet.id : Date.now().toString(),
            name,
            description,
            tags,
            files,
            variables,
            folderId
          };
          
          // Send to the extension
          vscode.postMessage({
            command: 'saveSnippet',
            snippet: updatedSnippet,
            isNew: isNewSnippet && !snippet?.id?.match(/^\d+$/)
          });
          
          // Restore button state after delay
          setTimeout(() => {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Snippet';
          }, 1000);
        }
        
        // Setup button event listeners
        function setupButtons() {
          console.log('setupButtons called');
          
          const saveBtn = document.getElementById('save-button');
          console.log('Save button found:', !!saveBtn);
          if (saveBtn) {
            saveBtn.addEventListener('click', function(e) {
              e.preventDefault();
              console.log('Save button clicked');
              saveSnippet();
            });
          }
          
          const deleteBtn = document.getElementById('delete-button');
          console.log('Delete button found:', !!deleteBtn);
          if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
              e.preventDefault();
              console.log('Delete button clicked');
              confirmDelete();
            });
          }
        }
        
        // Confirm deletion of a snippet
        function confirmDelete() {
          // Get the snippet ID from the displayed info or use the original
          const snippetId = snippet?.id;
          
          console.log('confirmDelete called');
          console.log('snippet object:', snippet);
          console.log('snippetId:', snippetId);
          
          if (!snippetId) {
            vscode.postMessage({
              command: 'showError',
              message: 'Cannot delete: No snippet ID found'
            });
            return;
          }
          
          // Use VS Code dialog instead of browser confirm() which is blocked in webviews
          console.log('Requesting delete confirmation for snippet:', snippetId);
          vscode.postMessage({
            command: 'confirmDelete',
            snippetId: snippetId,
            snippetName: snippet?.name || 'this snippet'
          });
        }
        
        // Handle messages from the extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.command) {
            case 'foldersList':
              populateFolders(message.folders);
              break;
            case 'tagsList':
              populateTagSuggestions(message.tags);
              break;
          }
        });
        
        // Populate tag suggestions datalist
        function populateTagSuggestions(tags) {
          allTags = tags || [];
          const datalist = document.getElementById('tagSuggestions');
          if (!datalist) return;
          
          datalist.innerHTML = '';
          tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            datalist.appendChild(option);
          });
        }
        
        // Populate the folder dropdown
        function populateFolders(folders) {
          const select = document.getElementById('folder');
          if (!select) return;
          
          // Clear existing options except the first one (Root)
          while (select.options.length > 1) {
            select.remove(1);
          }
          
          // Add folder options
          folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            select.add(option);
          });
          
          // Set selected folder if editing a snippet
          if (snippet && snippet.folderId) {
            select.value = snippet.folderId;
          }
        }
        
        // Initialize preview tab
        function initializePreview() {
          updatePreviewVariablesList();
          generatePreview();
        }
        
        ${previewVariableScript}
        
        ${generatePreviewScript}
      </script>
    </body>
    </html>`;
  }
}