import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Provider for Monaco Editor resources in the webview
 */
export class MonacoProvider {
    /**
     * Creates the necessary URIs for loading Monaco editor in a webview
     */
    public static getMonacoResourceUris(_context: vscode.ExtensionContext, webview: vscode.Webview): {
        baseUri: vscode.Uri,
        monacoUri: vscode.Uri,
        loaderUri: vscode.Uri,
        editorWorkerUri: vscode.Uri
    } {
        const baseUri = this.getMonacoDirUri(_context);
        
        return {
            baseUri,
            monacoUri: webview.asWebviewUri(
                vscode.Uri.joinPath(baseUri, 'min', 'vs')
            ),
            loaderUri: webview.asWebviewUri(
                vscode.Uri.joinPath(baseUri, 'min', 'vs', 'loader.js')
            ),
            editorWorkerUri: webview.asWebviewUri(
                vscode.Uri.joinPath(baseUri, 'min', 'vs', 'base', 'worker', 'workerMain.js')
            )
        };
    }

    /**
     * Copies Monaco editor files from node_modules to the extension's global storage path
     */
    public static async ensureMonacoFilesPresent(context: vscode.ExtensionContext): Promise<vscode.Uri> {
        const monacoDir = path.join(context.globalStoragePath, 'monaco-editor');
        const monacoSrcDir = path.join(context.extensionPath, 'node_modules', 'monaco-editor', 'min');
        
        // If Monaco files are already copied, just return the path
        if (await this.pathExists(monacoDir)) {
            return vscode.Uri.file(monacoDir);
        }

        // Create directory if it doesn't exist
        if (!(await this.pathExists(context.globalStoragePath))) {
            await fs.promises.mkdir(context.globalStoragePath, { recursive: true });
        }
        
        // Copy only Monaco "min" files to reduce startup and disk usage
        await this.copyFolder(monacoSrcDir, path.join(monacoDir, 'min'));
        
        return vscode.Uri.file(monacoDir);
    }

    private static getMonacoDirUri(context: vscode.ExtensionContext): vscode.Uri {
        return vscode.Uri.file(path.join(context.globalStoragePath, 'monaco-editor'));
    }

    private static async pathExists(pathToCheck: string): Promise<boolean> {
        try {
            await fs.promises.access(pathToCheck);
            return true;
        } catch {
            return false;
        }
    }

    private static async copyFolder(src: string, dest: string): Promise<void> {
        await fs.promises.mkdir(dest, { recursive: true });
        const files = await fs.promises.readdir(src);

        for (const file of files) {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            const stats = await fs.promises.stat(srcPath);
            
            if (stats.isDirectory()) {
                await this.copyFolder(srcPath, destPath);
            } else {
                await fs.promises.copyFile(srcPath, destPath);
            }
        }
    }
}