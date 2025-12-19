// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Tree item for subfolders
class LocalYdbInstanceItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly folderPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.tooltip = this.folderPath;
		this.contextValue = 'localYdb';
	}

	// TODO: make own icon
	// https://code.visualstudio.com/blogs/2016/09/08/icon-themes#_create-your-own-icon-theme
	iconPath = vscode.ThemeIcon.Folder;
}

// Tree data provider for YDB panel
class LocalYdbTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private getLocalYdbPath(): string {
		return path.join(os.homedir(), 'local-ydb');
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		// If element is provided, it's a subfolder - return empty for now
		if (element) {
			return Promise.resolve([]);
		}

		// Return subfolders from $HOME/local-ydb
		const localYdbPath = this.getLocalYdbPath();

		return new Promise((resolve) => {
			// Check if the directory exists
			if (!fs.existsSync(localYdbPath)) {
				resolve([]);
				return;
			}

			try {
				// Read directory contents
				const entries = fs.readdirSync(localYdbPath, { withFileTypes: true });

				// Filter only directories
				const subfolders = entries
					.filter(entry => entry.isDirectory())
					.map(entry => {
						const folderPath = path.join(localYdbPath, entry.name);
						return new LocalYdbInstanceItem(
							entry.name,
							folderPath,
							vscode.TreeItemCollapsibleState.None
						);
					});

				resolve(subfolders);
			} catch (error) {
				// If there's an error reading the directory, return empty array
				console.error('Error reading local-ydb directory:', error);
				resolve([]);
			}
		});
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "VibeDB" is now active!');

	// Register YDB tree view
	const localYdbTreeDataProvider = new LocalYdbTreeDataProvider();
	const ydbTreeView = vscode.window.createTreeView('local-ydb', {
		treeDataProvider: localYdbTreeDataProvider
	});
	context.subscriptions.push(ydbTreeView);

	// Command to create a new subfolder
	const createLocalYdbCommand = vscode.commands.registerCommand('vibedb.createLocalYdb', async () => {
		const folderName = await vscode.window.showInputBox({
			prompt: 'Enter the name of the new local-ydb subfolder',
			placeHolder: 'subfolder-name',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Name cannot be empty';
				}
				// Check for invalid characters in folder names
				if (/[<>:"/\\|?*]/.test(value)) {
					return 'Name contains invalid characters';
				}
				return null;
			}
		});

		if (!folderName) {
			return;
		}

		const localYdbPath = path.join(os.homedir(), 'local-ydb');
		const newFolderPath = path.join(localYdbPath, folderName.trim());

		try {
			// Create local-ydb directory if it doesn't exist
			if (!fs.existsSync(localYdbPath)) {
				fs.mkdirSync(localYdbPath, { recursive: true });
			}

			// Check if folder already exists
			if (fs.existsSync(newFolderPath)) {
				vscode.window.showWarningMessage(`Folder "${folderName}" already exists`);
				return;
			}

			// Create the new subfolder
			fs.mkdirSync(newFolderPath, { recursive: true });

			// Refresh the tree view
			localYdbTreeDataProvider.refresh();

			vscode.window.showInformationMessage(`Added local-ydb: ${folderName}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to add local-ydb: ${error}`);
		}
	});

	context.subscriptions.push(createLocalYdbCommand);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('vibedb.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from VibeDB!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
