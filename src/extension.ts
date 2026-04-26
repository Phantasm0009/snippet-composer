import * as vscode from 'vscode';
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
  context.subscriptions.push(outputChannel);
  
  // Ensure storage directory exists
  if (!fs.existsSync(context.globalStoragePath)) {
    fs.mkdirSync(context.globalStoragePath, { recursive: true });
  }
  
  // Pre-copy Monaco editor files (async, don't wait)
  void MonacoProvider.ensureMonacoFilesPresent(context);
  
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
    
    vscode.commands.registerCommand('snippet-composer.createSubfolder', async (item) => {
      if (!item || item.contextValue !== 'folder') {
        return;
      }
      
      const folderName = await vscode.window.showInputBox({
        placeHolder: 'Subfolder name',
        prompt: `Enter a name for a subfolder inside "${item.label}"`
      });
      
      if (folderName) {
        await snippetManager.createFolder(folderName, item.id);
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
    
    vscode.commands.registerCommand('snippet-composer.deleteSnippet', async (item) => {
      const snippetId = item?.id || item?.context?.id;
      if (!snippetId) {
        vscode.window.showErrorMessage('Could not determine which snippet to delete.');
        return;
      }
      
      const snippet = await snippetManager.getSnippet(snippetId);
      if (!snippet) {
        vscode.window.showErrorMessage('Snippet not found.');
        return;
      }
      
      const confirmed = await vscode.window.showWarningMessage(
        `Are you sure you want to delete snippet "${snippet.name}"?`,
        { modal: true },
        'Delete',
        'Cancel'
      );
      
      if (confirmed !== 'Delete') {
        return;
      }
      
      const deleted = await snippetManager.deleteSnippet(snippetId);
      if (deleted) {
        snippetExplorerProvider.refresh();
        vscode.window.showInformationMessage(`Snippet "${snippet.name}" deleted successfully`);
      } else {
        vscode.window.showErrorMessage('Failed to delete snippet.');
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
        const allSnippets = await snippetManager.getAllSnippets();
        const usageCounts = snippetManager.getUsageCounts();
        const selected = await vscode.window.showQuickPick(
          allSnippets
            .sort((a, b) => (usageCounts.get(b.id) || 0) - (usageCounts.get(a.id) || 0))
            .map(snippet => ({
              label: snippet.name,
              description: snippet.tags.map(tag => `#${tag}`).join(' '),
              detail: snippet.description || `${snippet.files.length} file(s)`,
              snippet
            })),
          {
            placeHolder: 'Search snippets (fuzzy) and press Enter',
            matchOnDescription: true,
            matchOnDetail: true
          }
        );

        if (selected) {
          const action = await vscode.window.showQuickPick(
            [
              { label: 'Insert', action: 'insert' },
              { label: 'Edit', action: 'edit' }
            ],
            { placeHolder: `What do you want to do with "${selected.snippet.name}"?` }
          );

          if (action?.action === 'insert') {
            await snippetManager.insertSnippet(selected.snippet);
          } else if (action?.action === 'edit') {
            snippetEditorProvider.openEditor(selected.snippet);
          }
        }
      } catch (error) {
        console.error('Error searching snippets:', error);
        vscode.window.showErrorMessage(`Error searching: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Sync Upload to Gist
    vscode.commands.registerCommand('snippet-composer.syncUpload', async () => {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Uploading snippets to GitHub Gist',
            cancellable: false
          },
          async () => {
            await snippetManager.uploadToGist();
          }
        );
      } catch (error) {
        console.error('Error uploading to Gist:', error);
        vscode.window.showErrorMessage(`Error uploading: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    // Sync Download from Gist
    vscode.commands.registerCommand('snippet-composer.syncDownload', async () => {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Downloading snippets from GitHub Gist',
            cancellable: false
          },
          async () => {
            await snippetManager.downloadFromGist();
          }
        );
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

    vscode.commands.registerCommand('snippet-composer.createSnippetFromSelection', async (resource: vscode.Uri, resources?: vscode.Uri[]) => {
      try {
        const selectedUris = resources && resources.length > 0
          ? resources
          : resource
            ? [resource]
            : [];

        const snippet = await snippetManager.createSnippetFromFiles(selectedUris);
        if (!snippet) {
          return;
        }

        snippetExplorerProvider.refresh();
        const action = await vscode.window.showInformationMessage(
          `Created snippet "${snippet.name}" from ${snippet.files.length} file(s).`,
          'Edit Snippet',
          'Insert Now'
        );

        if (action === 'Edit Snippet') {
          snippetEditorProvider.openEditor(snippet);
        } else if (action === 'Insert Now') {
          await snippetManager.insertSnippet(snippet);
        }
      } catch (error) {
        console.error('Error creating snippet from selection:', error);
        vscode.window.showErrorMessage(
          `Error creating snippet from selection: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),
    vscode.commands.registerCommand('snippet-composer.undoLastSnippetChange', async () => {
      const didUndo = await snippetManager.undoLastSnippetChange();
      if (!didUndo) {
        vscode.window.showInformationMessage('No snippet history to undo.');
        return;
      }
      snippetExplorerProvider.refresh();
      vscode.window.showInformationMessage('Restored the last saved/deleted snippet state.');
    }),
    vscode.commands.registerCommand('snippet-composer.importCommunitySnippets', async () => {
      const indexUrl = await vscode.window.showInputBox({
        prompt: 'Marketplace index URL (JSON with snippets/folders)',
        value: vscode.workspace.getConfiguration('snippetComposer').get<string>('community.indexUrl', '')
      });
      if (!indexUrl) {
        return;
      }

      try {
        await snippetManager.importFromMarketplaceIndex(indexUrl);
        await vscode.workspace.getConfiguration('snippetComposer')
          .update('community.indexUrl', indexUrl, vscode.ConfigurationTarget.Global);
        snippetExplorerProvider.refresh();
        vscode.window.showInformationMessage('Community snippets imported successfully.');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to import community snippets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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