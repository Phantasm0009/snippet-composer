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
    public static getMonacoResourceUris(context: vscode.ExtensionContext, webview: vscode.Webview): {
        baseUri: vscode.Uri,
        monacoUri: vscode.Uri,
        loaderUri: vscode.Uri,
        editorWorkerUri: vscode.Uri
    } {
        const baseUri = this.getMonacoDirUri(context, webview);
        
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
    public static ensureMonacoFilesPresent(context: vscode.ExtensionContext): vscode.Uri {
        const monacoDir = path.join(context.globalStoragePath, 'monaco-editor');
        const monacoSrcDir = path.join(context.extensionPath, 'node_modules', 'monaco-editor');
        
        // If Monaco files are already copied, just return the path
        if (fs.existsSync(monacoDir)) {
            return vscode.Uri.file(monacoDir);
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(context.globalStoragePath)) {
            fs.mkdirSync(context.globalStoragePath, { recursive: true });
        }
        
        // Copy Monaco editor files
        this.copyFolderSync(monacoSrcDir, monacoDir);
        
        return vscode.Uri.file(monacoDir);
    }

    private static getMonacoDirUri(context: vscode.ExtensionContext, webview: vscode.Webview): vscode.Uri {
        const monacoDir = this.ensureMonacoFilesPresent(context);
        return monacoDir;
    }

    private static copyFolderSync(src: string, dest: string) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        
        for (const file of files) {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            const stats = fs.statSync(srcPath);
            
            if (stats.isDirectory()) {
                this.copyFolderSync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}