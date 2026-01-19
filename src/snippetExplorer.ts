import * as vscode from 'vscode';
import { SnippetManager, Snippet, SnippetFolder } from './snippetManager';

export class SnippetExplorerProvider implements vscode.TreeDataProvider<SnippetTreeItem>, vscode.TreeDragAndDropController<SnippetTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SnippetTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Add drag and drop support
  dropMimeTypes = ['application/vnd.code.tree.snippetComposerExplorer'];
  dragMimeTypes = ['application/vnd.code.tree.snippetComposerExplorer'];

  // Filter string for search functionality
  private filterString: string = '';

  constructor(private snippetManager: SnippetManager) {}

  setFilter(filter: string): void {
    this.filterString = filter.toLowerCase();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SnippetTreeItem): vscode.TreeItem {
    return element;
  }

  private matchesFilter(snippet: { name: string; description: string; tags: string[] }): boolean {
    if (!this.filterString) {
      return true;
    }
    
    const searchTerm = this.filterString;
    
    // Check name
    if (snippet.name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Check description
    if (snippet.description && snippet.description.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Check tags
    if (snippet.tags && snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
      return true;
    }
    
    return false;
  }

  async getChildren(element?: SnippetTreeItem): Promise<SnippetTreeItem[]> {
    if (!element) {
      // Root level - show folders and root snippets
      const folders = await this.snippetManager.getFolders();
      const rootFolders = folders.filter(f => !f.parentId);
      
      const folderItems = rootFolders.map(folder => 
        new SnippetTreeItem(
          folder.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          { type: 'folder', id: folder.id }
        )
      );
      
      const snippets = await this.snippetManager.getAllSnippets();
      let rootSnippets = snippets.filter(s => !s.folderId);
      
      // Apply filter if set
      if (this.filterString) {
        rootSnippets = rootSnippets.filter(s => this.matchesFilter(s));
      }
      
      const snippetItems = rootSnippets.map(snippet => 
        new SnippetTreeItem(
          snippet.name,
          vscode.TreeItemCollapsibleState.None,
          { type: 'snippet', id: snippet.id },
          snippet.description
        )
      );
      
      // If filtering, also search in folders and show matching snippets directly
      if (this.filterString) {
        const allSnippets = await this.snippetManager.getAllSnippets();
        const matchingFolderSnippets = allSnippets
          .filter(s => s.folderId && this.matchesFilter(s))
          .map(snippet => 
            new SnippetTreeItem(
              snippet.name,
              vscode.TreeItemCollapsibleState.None,
              { type: 'snippet', id: snippet.id },
              snippet.description
            )
          );
        
        return [...snippetItems, ...matchingFolderSnippets];
      }
      
      return [...folderItems, ...snippetItems];
    } else if (element.contextValue === 'folder') {
      // Folder - show subfolders and snippets in this folder
      const folderId = element.id;
      const folders = await this.snippetManager.getFolders();
      const subFolders = folders.filter(f => f.parentId === folderId);
      
      const folderItems = subFolders.map(folder => 
        new SnippetTreeItem(
          folder.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          { type: 'folder', id: folder.id }
        )
      );
      
      const snippets = await this.snippetManager.getAllSnippets();
      const folderSnippets = snippets.filter(s => s.folderId === folderId);
      
      const snippetItems = folderSnippets.map(snippet => 
        new SnippetTreeItem(
          snippet.name,
          vscode.TreeItemCollapsibleState.None,
          { type: 'snippet', id: snippet.id },
          snippet.description
        )
      );
      
      return [...folderItems, ...snippetItems];
    }
    
    return [];
  }

  async getParent(element: SnippetTreeItem): Promise<SnippetTreeItem | null> {
    if (element.contextValue === 'snippet') {
      const snippets = await this.snippetManager.getAllSnippets();
      const snippet = snippets.find(s => s.id === element.id);
      
      if (snippet?.folderId) {
        const folders = await this.snippetManager.getFolders();
        const parentFolder = folders.find(f => f.id === snippet.folderId);
        
        if (parentFolder) {
          return new SnippetTreeItem(
            parentFolder.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            { type: 'folder', id: parentFolder.id }
          );
        }
      }
    } else if (element.contextValue === 'folder') {
      const folders = await this.snippetManager.getFolders();
      const folder = folders.find(f => f.id === element.id);
      
      if (folder?.parentId) {
        const parentFolder = folders.find(f => f.id === folder.parentId);
        
        if (parentFolder) {
          return new SnippetTreeItem(
            parentFolder.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            { type: 'folder', id: parentFolder.id }
          );
        }
      }
    }
    
    return null;
  }

  // Handle drag operations
  async handleDrag(source: SnippetTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    dataTransfer.set('application/vnd.code.tree.snippetComposerExplorer', new vscode.DataTransferItem(source));
  }

  // Handle drop operations
  async handleDrop(target: SnippetTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    const transferItem = dataTransfer.get('application/vnd.code.tree.snippetComposerExplorer');
    if (!transferItem) {
      return;
    }
    
    const items: SnippetTreeItem[] = transferItem.value;
    
    // Only allow dropping onto folders or the root
    const targetFolderId = target?.contextValue === 'folder' ? target.id : undefined;
    
    for (const item of items) {
      if (item.contextValue === 'snippet') {
        // Move snippet to the target folder
        await this.moveSnippetToFolder(item.id as string, targetFolderId);
      }
    }
    
    // Refresh the view
    this.refresh();
  }

  // Helper method to move a snippet to a folder
  private async moveSnippetToFolder(snippetId: string, folderId: string | undefined): Promise<void> {
    try {
      // Get the snippet
      const snippet = await this.snippetManager.getSnippet(snippetId);
      
      if (snippet) {
        // Update the folder ID
        snippet.folderId = folderId;
        
        // Save the snippet
        await this.snippetManager.saveSnippet(snippet);
        
        // Display a success message
        const folderText = folderId ? 'the selected folder' : 'the root level';
        vscode.window.showInformationMessage(`Moved "${snippet.name}" to ${folderText}`);
      }
    } catch (error) {
      console.error('Error moving snippet to folder:', error);
      vscode.window.showErrorMessage(`Failed to move snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

class SnippetTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly context: { type: 'folder' | 'snippet', id: string },
    description?: string
  ) {
    super(label, collapsibleState);
    
    this.contextValue = context.type;
    // Make sure we're assigning a string, not a boolean
    this.id = context.id;
    
    if (context.type === 'snippet') {
      // Add tooltip/description for more information
      this.tooltip = description || label;
      this.description = description || '';
      
      // Make clicking on the snippet directly insert it
      this.command = {
        command: 'snippet-composer.insertSnippet',
        title: 'Insert Snippet',
        arguments: [context.id] // Only pass the ID string, not an object
      };
      
      this.iconPath = new vscode.ThemeIcon('code');
      
      // Add drag support (handled via TreeDragAndDropController)
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
      // Folders are not draggable but can accept drops
    }
  }
}