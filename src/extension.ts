// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as azdev from 'azure-devops-node-api';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { getOrUpdateConfiguration } from './tools/configuration';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('azdo-repository.switchRepository', async () => {
		// Import the required Azure DevOps module
		// Connect to Azure DevOps
		// get configuration organization
		const organization = vscode.workspace.getConfiguration('azdo-repository').get('organization');
		const orgUrl = `https://dev.azure.com/${organization}`;

		const token = await getOrUpdateConfiguration('token', 'Please enter your personal access token', true, false);
		const authHandler = azdev.getPersonalAccessTokenHandler(token);
		const connection = new azdev.WebApi(orgUrl, authHandler);

		// Get the list of repositories
		const gitApi = await connection.getGitApi();
		const repositories = await gitApi.getRepositories();
		// show the list of repositories in the quickpick
		const quickPickItems: vscode.QuickPickItem[] = repositories.map(r => {
			return { label: r.name as string, description: r.remoteUrl as string };
		})
		const selectedRepository = await vscode.window.showQuickPick(
			quickPickItems, {
			placeHolder: 'Select a repository'
		});

		if (!selectedRepository) {
			return;
		}

		// check if exist a folder with same name
		const folderPath = await getOrUpdateConfiguration('repositoryPath', 'Please enter your folder path', false, false) + '/' + selectedRepository?.label;

		fs.access(folderPath, fs.constants.F_OK, async (err) => {
			if (err) {
				console.log('Folder does not exist');
				// show prompt asking if you want to clone the repository
				const clone = await vscode.window.showInformationMessage('Repository not found in your folder of repositories. Do you want to Clone repository?', 'Yes', 'No');
				if (clone === 'No') {
					return;
				}

				await cloneRepository(selectedRepository as vscode.QuickPickItem);
				return;
			}

			const open = await vscode.window.showInformationMessage('Do you want to open the folder in the same window or in a new one?', 'Open in same window', 'Open in new window', 'Cancel');
			if (open === 'Cancel') {
				return;
			}

			vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(folderPath), open === 'Open in new window');
		});

	});


	context.subscriptions.push(disposable);
}

async function cloneRepository(selectedRepository: vscode.QuickPickItem) {
	// execute cmd command to clone the repository in the repositoryPath
	const folderPath = vscode.workspace.getConfiguration('azdo-repository').get('repositoryPath') + '/' + selectedRepository.label;
	const command = `git clone ${selectedRepository.description} ${folderPath}`;
	child_process.exec(command, async (error, stdout, stderr) => {
		if (error) {
			vscode.window.showErrorMessage(`Error executing command: ${error.message}`);
			// open Explorer with folderPath
			return;
		}
		if (stderr) {
			vscode.window.showInformationMessage(`Command stderr: ${stderr}`);
		}

		// ask if you want to open the folder in the same window or in a new one or cancel
		const open = await vscode.window.showInformationMessage('Repository cloned. Do you want to open the folder in the same window or in a new one?', 'Open in same window', 'Open in new window', 'Cancel');
		if (open === 'Cancel') {
			return;
		}
		vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(folderPath), open === 'Open in new window');
		vscode.window.showInformationMessage(`Command output: ${stdout}`);
	});
}

// This method is called when your extension is deactivated
export function deactivate() { }
