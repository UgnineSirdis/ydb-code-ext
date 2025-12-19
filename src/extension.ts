// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Tree item for subfolders
class LocalYdbInstanceItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly folderPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly active: boolean,
	) {
		super(label, collapsibleState);
		this.tooltip = this.folderPath;
		this.contextValue = 'localYdb';
		if (active) {
			this.iconPath = new vscode.ThemeIcon('beaker');
		} else {
			this.iconPath = new vscode.ThemeIcon('beaker-stop');
		}
	}

	// Available icons:
	// https://code.visualstudio.com/api/references/icons-in-labels
	//iconPath = new vscode.ThemeIcon('database');
	//iconPath = new vscode.ThemeIcon('flame');
	iconPath = new vscode.ThemeIcon('beaker-stop'); // beaker for running
}

// Tree data provider for YDB panel
class LocalYdbTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private getLocalYdbPath(): string {
		return path.join(os.homedir(), 'local-ydb');
	}

	async getRunningYdbdInstances(): Promise<Set<string>> {
		try {
			// Execute ps command to list all processes
			// On macOS/Linux, use 'ps aux' to get full command lines
			const { stdout } = await execAsync('ps aux');

			const lines = stdout.split('\n');
			const instanceNames = new Set<string>();
			const localYdbBasePath = this.getLocalYdbPath();

			// Pattern to match --yaml-config parameter
			const yamlConfigPattern = /--yaml-config=([^\s]+)/;

			for (const line of lines) {
				// Check if this line contains ydbd process
				if (line.includes('ydbd')) {
					// Extract --yaml-config parameter value
					const match = line.match(yamlConfigPattern);
					if (match && match[1]) {
						const configPath = match[1];

						// Check if path is within local-ydb directory
						if (configPath.startsWith(localYdbBasePath + path.sep)) {
							// Extract the folder name (the part after local-ydb/)
							const relativePath = configPath.substring(localYdbBasePath.length + 1);
							const folderName = relativePath.split(path.sep)[0];

							if (folderName) {
								instanceNames.add(folderName);
							}
						}
					}
				}
			}

			return instanceNames;
		} catch (error) {
			console.error('Error getting running ydbd instances:', error);
			return new Set<string>();
		}
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

		return new Promise(async (resolve) => {
			// Check if the directory exists
			if (!fs.existsSync(localYdbPath)) {
				resolve([]);
				return;
			}

			try {
				// Get running YDB instances
				const runningInstances = await this.getRunningYdbdInstances();

				// Read directory contents
				const entries = fs.readdirSync(localYdbPath, { withFileTypes: true });

				// Filter only directories
				const subfolders = entries
					.filter(entry => entry.isDirectory())
					.map(entry => {
						const folderPath = path.join(localYdbPath, entry.name);
						const active = runningInstances.has(entry.name);
						return new LocalYdbInstanceItem(
							entry.name,
							folderPath,
							vscode.TreeItemCollapsibleState.None,
							active,
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

	// Create output channel for ya make command output
	const yaMakeOutputChannel = vscode.window.createOutputChannel('ya make');
	context.subscriptions.push(yaMakeOutputChannel);

	// Register YDB tree view
	const localYdbTreeDataProvider = new LocalYdbTreeDataProvider();
	const ydbTreeView = vscode.window.createTreeView('local-ydb', {
		treeDataProvider: localYdbTreeDataProvider
	});
	context.subscriptions.push(ydbTreeView);

	// Helper function to get the selected item or item from arguments
	const getSelectedItem = async (item?: LocalYdbInstanceItem): Promise<LocalYdbInstanceItem | undefined> => {
		if (item && item instanceof LocalYdbInstanceItem) {
			return item;
		}
		// If no item provided, try to get from selection
		const selection = ydbTreeView.selection;
		if (selection && selection.length > 0 && selection[0] instanceof LocalYdbInstanceItem) {
			return selection[0];
		}
		return undefined;
	};

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

			// Get the workspace folder
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No workspace folder open');
				return;
			}

			const workspaceFolderPath = workspaceFolder.uri.fsPath;

			// Execute ya make command with output to VS Code console
			const yaMakeCommand = `${workspaceFolderPath}/ya`;
			const yaMakeArgs = [
				'make',
				'--build', 'relwithdebinfo',
				`${workspaceFolderPath}/ydb/apps/ydbd`,
				`${workspaceFolderPath}/ydb/apps/ydb`,
				`${workspaceFolderPath}/ydb/public/tools/local_ydb`
			];

			// Show and clear the output channel
			yaMakeOutputChannel.clear();
			yaMakeOutputChannel.show(true);
			yaMakeOutputChannel.appendLine(`Executing: ${yaMakeCommand} ${yaMakeArgs.join(' ')}`);
			yaMakeOutputChannel.appendLine('');

			// Execute command using spawn for real-time output
			await new Promise<void>((resolve, reject) => {
				const process = spawn(yaMakeCommand, yaMakeArgs, {
					cwd: workspaceFolderPath,
					shell: true
				});

				process.stdout.on('data', (data) => {
					yaMakeOutputChannel.append(data.toString());
				});

				process.stderr.on('data', (data) => {
					yaMakeOutputChannel.append(data.toString());
				});

				process.on('close', (code) => {
					yaMakeOutputChannel.appendLine('');
					if (code === 0) {
						yaMakeOutputChannel.appendLine(`Command completed successfully with exit code ${code}`);
						resolve();
					} else {
						yaMakeOutputChannel.appendLine(`Command failed with exit code ${code}`);
						reject(new Error(`ya make command failed with exit code ${code}`));
					}
				});

				process.on('error', (error) => {
					yaMakeOutputChannel.appendLine(`Error executing command: ${error.message}`);
					reject(error);
				});
			});

			// Refresh the tree view
			localYdbTreeDataProvider.refresh();

			vscode.window.showInformationMessage(`Added local-ydb: ${folderName}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to add local-ydb: ${error}`);
		}
	});

	context.subscriptions.push(createLocalYdbCommand);

	// Command to start local YDB instance
	const startLocalYdbCommand = vscode.commands.registerCommand('vibedb.startLocalYdb', async (item?: LocalYdbInstanceItem) => {
		const selectedItem = await getSelectedItem(item);
		if (!selectedItem || !selectedItem.folderPath) {
			vscode.window.showErrorMessage('Please select a YDB instance');
			return;
		}

		try {
			// TODO: Implement start logic
			// Example: Execute start command for the YDB instance
			// const { spawn } = require('child_process');
			// const startProcess = spawn('ydb', ['start', '--path', selectedItem.folderPath]);

			vscode.window.showInformationMessage(`Starting YDB instance: ${selectedItem.label}`);
			// Refresh tree view after start
			localYdbTreeDataProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to start YDB instance: ${error}`);
		}
	});
	context.subscriptions.push(startLocalYdbCommand);

	// Command to stop local YDB instance
	const stopLocalYdbCommand = vscode.commands.registerCommand('vibedb.stopLocalYdb', async (item?: LocalYdbInstanceItem) => {
		const selectedItem = await getSelectedItem(item);
		if (!selectedItem || !selectedItem.folderPath) {
			vscode.window.showErrorMessage('Please select a YDB instance');
			return;
		}

		try {
			// TODO: Implement stop logic
			// Example: Execute stop command for the YDB instance
			// const { spawn } = require('child_process');
			// const stopProcess = spawn('ydb', ['stop', '--path', selectedItem.folderPath]);

			vscode.window.showInformationMessage(`Stopping YDB instance: ${selectedItem.label}`);
			// Refresh tree view after stop
			localYdbTreeDataProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to stop YDB instance: ${error}`);
		}
	});
	context.subscriptions.push(stopLocalYdbCommand);

	// Command to delete local YDB instance
	const deleteLocalYdbCommand = vscode.commands.registerCommand('vibedb.deleteLocalYdb', async (item?: LocalYdbInstanceItem) => {
		const selectedItem = await getSelectedItem(item);
		if (!selectedItem || !selectedItem.folderPath) {
			vscode.window.showErrorMessage('Please select a YDB instance');
			return;
		}

		const confirm = await vscode.window.showWarningMessage(
			`Are you sure you want to delete "${selectedItem.label}"?`,
			{ modal: true },
			'Delete'
		);

		if (confirm !== 'Delete') {
			return;
		}

		try {
			// TODO: Implement delete logic
			// Example: Remove the folder and all its contents
			// fs.rmSync(selectedItem.folderPath, { recursive: true, force: true });

			vscode.window.showInformationMessage(`Deleted YDB instance: ${selectedItem.label}`);
			// Refresh tree view after deletion
			localYdbTreeDataProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to delete YDB instance: ${error}`);
		}
	});
	context.subscriptions.push(deleteLocalYdbCommand);

	// Command to edit config for local YDB instance
	const editConfigLocalYdbCommand = vscode.commands.registerCommand('vibedb.editConfigLocalYdb', async (item?: LocalYdbInstanceItem) => {
		const selectedItem = await getSelectedItem(item);
		if (!selectedItem || !selectedItem.folderPath) {
			vscode.window.showErrorMessage('Please select a YDB instance');
			return;
		}

		try {
			// TODO: Implement edit config logic
			// Example: Open config file in editor
			// const configPath = path.join(selectedItem.folderPath, 'config.yaml');
			// const document = await vscode.workspace.openTextDocument(configPath);
			// await vscode.window.showTextDocument(document);

			vscode.window.showInformationMessage(`Opening config for: ${selectedItem.label}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open config: ${error}`);
		}
	});
	context.subscriptions.push(editConfigLocalYdbCommand);

	// Command to open logs for local YDB instance
	const openLogsLocalYdbCommand = vscode.commands.registerCommand('vibedb.openLogsLocalYdb', async (item?: LocalYdbInstanceItem) => {
		const selectedItem = await getSelectedItem(item);
		if (!selectedItem || !selectedItem.folderPath) {
			vscode.window.showErrorMessage('Please select a YDB instance');
			return;
		}

		try {
			// TODO: Implement open logs logic
			// Example: Open log file in editor or output channel
			// const logPath = path.join(selectedItem.folderPath, 'logs', 'ydb.log');
			// const document = await vscode.workspace.openTextDocument(logPath);
			// await vscode.window.showTextDocument(document);

			vscode.window.showInformationMessage(`Opening logs for: ${selectedItem.label}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open logs: ${error}`);
		}
	});
	context.subscriptions.push(openLogsLocalYdbCommand);

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
