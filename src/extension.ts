import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('VibeDB extension is now active!');

    // Register a command
    let disposable = vscode.commands.registerCommand('vibedb.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from VibeDB!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
