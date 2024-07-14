import * as vscode from 'vscode';

export async function getOrUpdateConfiguration(key: string, placeHolder: string, required: boolean = true, displayIfSet: boolean = false): Promise<string> {
    if (vscode.workspace.getConfiguration('azdo-repository').get(key) && !displayIfSet) {
        return vscode.workspace.getConfiguration('azdo-repository').get(key) as string;
    }
    return vscode.window
        .showInputBox({
            placeHolder: placeHolder,
            value: vscode.workspace.getConfiguration('azdo-repository').get(key) as string,
        })
        .then((value) => {
            if (!value && required) {
                vscode.window.showErrorMessage('Please enter a value. Operation cancelled');
                throw Error('Please enter a value. Operation cancelled');
            }
            vscode.workspace.getConfiguration('azdo-repository').update(key, value, true);
            return value as string;
        });
}
