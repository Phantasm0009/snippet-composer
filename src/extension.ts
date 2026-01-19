import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SnippetEditorProvider } from './snippetEditor';
import { SnippetExplorerProvider } from './snippetExplorer';
import { SnippetManager } from './snippetManager';
import { MonacoProvider } from './monacoProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating Snippet Composer extension');
  
  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel('Snippet Composer');
  outputChannel.appendLine('Snippet Composer extension activated');
  
  // Ensure storage directory exists
  if (!fs.existsSync(context.globalStoragePath)) {
    fs.mkdirSync(context.globalStoragePath, { recursive: true });
  }
  
  // Pre-copy Monaco editor files (async, don't wait)
  MonacoProvider.ensureMonacoFilesPresent(context);
  
  // Initialize the snippet manager
  const snippetManager = new SnippetManager(context);
  
  // Register the snippet explorer view with drag and drop support
  const snippetExplorerProvider = new SnippetExplorerProvider(snippetManager);
  vscode.window.createTreeView('snippetComposerExplorer', {
    treeDataProvider: snippetExplorerProvider,
    dragAndDropController: snippetExplorerProvider,
    showCollapseAll: true
  });
  
  // Register the snippet editor webview
  const snippetEditorProvider = new SnippetEditorProvider(context, snippetManager);
  
  // Wire up the callback to refresh explorer when snippets are saved/deleted
  snippetEditorProvider.setOnSaveCallback(() => {
    snippetExplorerProvider.refresh();
  });
  
  // Register commands
  const commands = [
    vscode.commands.registerCommand('snippet-composer.openSnippetEditor', () => {
      snippetEditorProvider.openEditor();
    }),
    
    vscode.commands.registerCommand('snippet-composer.insertSnippet', async (snippetId) => {
      try {
        console.log('Insert snippet command triggered with ID:', snippetId);
        
        if (!snippetId) {
          // Show quick pick to select a snippet
          const snippets = await snippetManager.getAllSnippets();
          const items = snippets.map(s => ({
            label: s.name,
            description: s.description,
            snippet: s
          }));
          
          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a snippet to insert'
          });
          
          if (selected) {
            console.log(`Inserting snippet: ${selected.snippet.name}`);
            await snippetManager.insertSnippet(selected.snippet);
          }
        } else {
          // We have a snippet ID, insert it directly
          console.log(`Inserting snippet with ID: ${snippetId}`);
          const snippet = await snippetManager.getSnippet(snippetId);
          
          if (snippet) {
            await snippetManager.insertSnippet(snippet);
            // Note: insertSnippet already handles success/cancel messages
          } else {
            vscode.window.showErrorMessage(`Snippet with ID ${snippetId} not found.`);
          }
        }
      } catch (error) {
        console.error('Error inserting snippet:', error);
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error inserting snippet: ${error.message}`);
        } else {
          vscode.window.showErrorMessage('An unknown error occurred while inserting the snippet.');
        }
      }
    }),
    
    vscode.commands.registerCommand('snippet-composer.createSnippet', () => {
      snippetEditorProvider.createNewSnippet();
    }),
    
    vscode.commands.registerCommand('snippet-composer.createFolder', async () => {
      const folderName = await vscode.window.showInputBox({
        placeHolder: 'Folder name',
        prompt: 'Enter a name for the new folder'
      });
      
      if (folderName) {
        await snippetManager.createFolder(folderName);
        snippetExplorerProvider.refresh();
      }
    }),
    
    vscode.commands.registerCommand('snippet-composer.exportSnippets', async () => {
      await snippetManager.exportSnippets();
      vscode.window.showInformationMessage('Snippets exported successfully');
    }),
    
    vscode.commands.registerCommand('snippet-composer.importSnippets', async () => {
      await snippetManager.importSnippets();
      snippetExplorerProvider.refresh();
      vscode.window.showInformationMessage('Snippets imported successfully');
    }),

    vscode.commands.registerCommand('snippet-composer.editSnippet', async (snippetIdOrItem) => {
      try {
        console.log('Edit snippet command triggered with:', JSON.stringify(snippetIdOrItem));
        
        // Extract the ID from whatever was passed (could be object or string)
        let snippetId = null;
        
        // Case 1: Direct string ID
        if (typeof snippetIdOrItem === 'string') {
          snippetId = snippetIdOrItem;
        } 
        // Case 2: Object with ID property
        else if (snippetIdOrItem && typeof snippetIdOrItem === 'object') {
          // Different ways the ID might be stored in the object
          if (snippetIdOrItem.id !== undefined) {
            snippetId = snippetIdOrItem.id;
          } 
          else if (snippetIdOrItem.context && snippetIdOrItem.context.id) {
            snippetId = snippetIdOrItem.context.id;
          }
          else if (snippetIdOrItem.selection && snippetIdOrItem.selection.id) {
            snippetId = snippetIdOrItem.selection.id;
          }
          // Special case for VS Code tree view items
          else if (snippetIdOrItem._id) {
            snippetId = snippetIdOrItem._id;
          }
        }
        
        console.log('Extracted snippet ID:', snippetId);
        
        if (!snippetId) {
          // No ID could be extracted, show quick pick instead
          const snippets = await snippetManager.getAllSnippets();
          const items = snippets.map(s => ({
            label: s.name,
            description: s.description,
            detail: `${s.files.length} file(s)`,
            snippet: s
          }));
          
          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a snippet to edit',
            matchOnDescription: true,
            matchOnDetail: true
          });
          
          if (selected) {
            snippetEditorProvider.openEditor(selected.snippet);
          }
          return;
        }
        
        // We have a snippet ID, try to load and edit it
        console.log(`Fetching snippet with ID: ${snippetId}`);
        const snippet = await snippetManager.getSnippet(snippetId);
        
        if (snippet) {
          console.log(`Opening editor for ${snippet.name}`);
          snippetEditorProvider.openEditor(snippet);
        } else {
          vscode.window.showErrorMessage(`Snippet with ID ${snippetId} not found.`);
        }
      } catch (error) {
        console.error('Error in editSnippet command:', error);
        vscode.window.showErrorMessage(`Error editing snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Add this near the other command registrations
    vscode.commands.registerCommand('snippet-composer._editSnippetFromContextMenu', (item) => {
      // This is a helper command that will be called from the context menu with the tree item
      const id = item.id; // Extract ID directly from the tree item
      console.log(`Editing snippet from context menu with ID: ${id}`);
      
      if (id) {
        vscode.commands.executeCommand('snippet-composer.editSnippet', id);
      } else {
        vscode.window.showErrorMessage('Could not determine which snippet to edit.');
      }
    }),

    vscode.commands.registerCommand('snippet-composer.deleteFolder', async (item) => {
      if (!item || item.contextValue !== 'folder') {
        return;
      }
      
      const folderId = item.id;
      const folderName = item.label;
      
      // Confirm deletion
      const confirmed = await vscode.window.showWarningMessage(
        `Are you sure you want to delete folder "${folderName}" and all its contents?`,
        { modal: true },
        'Delete',
        'Cancel'
      );
      
      if (confirmed === 'Delete') {
        await snippetManager.deleteFolder(folderId);
        snippetExplorerProvider.refresh();
        vscode.window.showInformationMessage(`Folder "${folderName}" deleted successfully`);
      }
    }),

    vscode.commands.registerCommand('snippet-composer.renameFolder', async (item) => {
      if (!item || item.contextValue !== 'folder') {
        return;
      }
      
      const folderId = item.id;
      const currentName = item.label;
      
      const newName = await vscode.window.showInputBox({
        placeHolder: 'New folder name',
        prompt: 'Enter new name for the folder',
        value: currentName
      });
      
      if (newName && newName !== currentName) {
        await snippetManager.renameFolder(folderId, newName);
        snippetExplorerProvider.refresh();
        vscode.window.showInformationMessage(`Folder renamed to "${newName}"`);
      }
    }),

    // Insert Snippet Here - from Explorer context menu
    vscode.commands.registerCommand('snippet-composer.insertSnippetHere', async (folderUri: vscode.Uri) => {
      try {
        if (!folderUri) {
          vscode.window.showErrorMessage('No folder selected');
          return;
        }
        
        const basePath = folderUri.fsPath;
        
        // Show quick pick to select a snippet
        const snippets = await snippetManager.getAllSnippets();
        const items = snippets.map(s => ({
          label: s.name,
          description: s.description,
          snippet: s
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a snippet to insert'
        });
        
        if (selected) {
          await snippetManager.insertSnippet(selected.snippet, basePath);
        }
      } catch (error) {
        console.error('Error in insertSnippetHere:', error);
        vscode.window.showErrorMessage(`Error inserting snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Duplicate Snippet
    vscode.commands.registerCommand('snippet-composer.duplicateSnippet', async (item) => {
      try {
        const snippetId = item?.id || item?.context?.id;
        if (!snippetId) {
          vscode.window.showErrorMessage('Could not determine which snippet to duplicate');
          return;
        }
        
        const duplicate = await snippetManager.duplicateSnippet(snippetId);
        if (duplicate) {
          snippetExplorerProvider.refresh();
          vscode.window.showInformationMessage(`Snippet duplicated as '${duplicate.name}'`);
        }
      } catch (error) {
        console.error('Error duplicating snippet:', error);
        vscode.window.showErrorMessage(`Error duplicating snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Export Single Snippet
    vscode.commands.registerCommand('snippet-composer.exportSingleSnippet', async (item) => {
      try {
        const snippetId = item?.id || item?.context?.id;
        if (!snippetId) {
          vscode.window.showErrorMessage('Could not determine which snippet to export');
          return;
        }
        
        await snippetManager.exportSingleSnippet(snippetId);
      } catch (error) {
        console.error('Error exporting snippet:', error);
        vscode.window.showErrorMessage(`Error exporting snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Search Snippets
    vscode.commands.registerCommand('snippet-composer.searchSnippets', async () => {
      try {
        const searchTerm = await vscode.window.showInputBox({
          prompt: 'Search snippets by name, description, or tags',
          placeHolder: 'Enter search term (leave empty to show all)'
        });
        
        if (searchTerm === undefined) {
          return; // User cancelled
        }
        
        snippetExplorerProvider.setFilter(searchTerm);
        snippetExplorerProvider.refresh();
        
        if (searchTerm) {
          vscode.window.showInformationMessage(`Filtering snippets by: "${searchTerm}". Clear the search to show all.`);
        } else {
          vscode.window.showInformationMessage('Showing all snippets');
        }
      } catch (error) {
        console.error('Error searching snippets:', error);
        vscode.window.showErrorMessage(`Error searching: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Sync Upload to Gist
    vscode.commands.registerCommand('snippet-composer.syncUpload', async () => {
      try {
        await snippetManager.uploadToGist();
      } catch (error) {
        console.error('Error uploading to Gist:', error);
        vscode.window.showErrorMessage(`Error uploading: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Sync Download from Gist
    vscode.commands.registerCommand('snippet-composer.syncDownload', async () => {
      try {
        await snippetManager.downloadFromGist();
        snippetExplorerProvider.refresh();
      } catch (error) {
        console.error('Error downloading from Gist:', error);
        vscode.window.showErrorMessage(`Error downloading: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Open Settings
    vscode.commands.registerCommand('snippet-composer.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'snippet-composer');
    }),
  ];
  
  context.subscriptions.push(...commands);
  
  // Export the providers so they can be accessed from other modules
  return {
    snippetManager,
    snippetExplorerProvider
  };
}

export function deactivate() {}