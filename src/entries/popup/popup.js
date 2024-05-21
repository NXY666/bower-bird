import {Messages} from "&/modules/messages";
import {storage} from "&/modules/chrome_api.ts";

// 获取当前tab，然后监听它有没有location变化，如果有变化就刷新popup
chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tabs) {
	let currTabId = tabs[0].id;

	chrome.tabs.onUpdated.addListener(function (tabId) {
		if (currTabId === tabId) {
			location.reload();
		}
	});
});

document.addEventListener('DOMContentLoaded', async function () {
	try {
		const isRecordMode = await Messages.send('Macro.IsRecordMode');
		const isExecuteMode = await Messages.send('Macro.IsExecuteMode');
		const isPageInteractable = await Messages.send('Page.IsInteractable');

		// 通用
		{
			const safetyAlert = document.getElementById('safety-alert');
			const extensionOptionsButton = document.getElementById('extension-options-button');

			extensionOptionsButton.addEventListener('click', async function () {
				await chrome.tabs.create({url: chrome.runtime.getURL('options.html')});
			});

			if (!isPageInteractable) {
				safetyAlert.style.display = 'flex';
			}
		}

		// 脚本
		{
			const scriptSelect = document.getElementById('script-select');
			const scriptEditButton = document.getElementById('script-edit-button');
			const scriptExecuteButton = document.getElementById('script-execute-button');

			storage.getKey('Script.List').then((scriptList) => {
				scriptList = scriptList ?? [];
				for (let script of scriptList) {
					if (!script.state) {
						continue;
					}
					let option = document.createElement('option');
					option.value = script.id;
					option.label = script.name;
					scriptSelect.appendChild(option);
				}
			});

			scriptEditButton.addEventListener('click', async function () {
				let selectedScript = scriptSelect.value.toString();
				try {
					await chrome.tabs.create({url: chrome.runtime.getURL(`options.html#/editor/${selectedScript}`)});

					window.close();
				} catch (e) {
					alert(e);
				}
			});

			scriptExecuteButton.addEventListener('click', async function () {
				let selectedScript = scriptSelect.value.toString();
				try {
					await Messages.send('Script.Execute', selectedScript, 'tab:current');

					window.close();
				} catch (e) {
					alert(e);
				}
			});

			if (isRecordMode || isExecuteMode || !isPageInteractable) {
				scriptExecuteButton.disabled = true;
			}
		}

		// 宏
		{
			const macroSelect = document.getElementById('macro-select');
			const macroRecordButton = document.getElementById('macro-record-button');
			const macroExecuteButton = document.getElementById('macro-execute-button');
			const macroStopRecordButton = document.getElementById('macro-stop-record-button');

			storage.getKey('Macro.List').then((macroList) => {
				macroList = macroList ?? [];
				for (let macro of macroList) {
					let option = document.createElement('option');
					option.value = macro.id;
					option.label = `${macro.name}（${macro.stepCount} 个步骤）`;
					macroSelect.appendChild(option);
				}
			});

			macroRecordButton.addEventListener('click', async function () {
				try {
					await Messages.send('Macro.InitRecord');
					await Messages.send('Macro.ReadyRecord');

					window.close();
				} catch (e) {
					alert(e);
				}
			});

			macroExecuteButton.addEventListener('click', async function () {
				let selectedMacro = macroSelect.value.toString();

				Messages.send('Macro.Execute', selectedMacro).then(() => {});

				window.close();
			});

			macroStopRecordButton.addEventListener('click', async function () {
				try {
					await Messages.send('Macro.StopRecord');

					window.close();
				} catch (e) {
					alert(e);
				}
			});

			if (isRecordMode) {
				macroSelect.style.display = 'none';
				macroRecordButton.style.display = 'none';
				macroExecuteButton.style.display = 'none';
				macroStopRecordButton.style.display = 'block';
			}
			if (isExecuteMode) {
				macroSelect.disabled = true;
				macroRecordButton.disabled = true;
				macroExecuteButton.disabled = true;
			}
			if (!isPageInteractable) {
				macroSelect.disabled = true;
				macroExecuteButton.disabled = true;
			}
		}

		// 元素
		{
			const elementCaptureButton = document.getElementById('element-capture-button');

			elementCaptureButton.addEventListener('click', async function () {
				elementCaptureButton.disabled = true;

				await Messages.send('Element.CaptureStart', null, 'tab:current');

				window.close();
			});

			if (isRecordMode || isExecuteMode || !isPageInteractable) {
				elementCaptureButton.disabled = true;
			}
		}
	} catch (e) {
		console.error(e);

		document.body.innerHTML = "<div style='padding: 20px; color: var(--primary-color-1); font-size: 16px; text-align: center;'>稍等片刻，马上就好。</div>";
		setInterval(async () => {
			try {
				await Messages.send('Page.IsInteractable');
				location.reload();
			} catch {
			}
		}, 100);
	}
});