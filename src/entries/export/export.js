import {storage} from "&/modules/chrome_api.ts";
import {Messages} from "&/modules/messages.ts";
import {getScript} from "&/classes/Script.ts";
import {registerRootBlock} from "&/classes/Block.ts";

const query = new URLSearchParams(window.location.search);

// hash如果不是close，就不关闭页面
if (window.location.hash !== '#close') {
	window.location.hash = '#close';
} else {
	window.close();
}

document.addEventListener('DOMContentLoaded', async function () {
	const subtitle = document.getElementById('subtitle');
	subtitle.textContent = `来自 ${query.get('origin')} 的请求`;

	const scriptSelect = document.getElementById('script-select');

	storage.getKey('Script.List').then((scriptList) => {
		scriptList = scriptList ?? [];
		for (let script of scriptList) {
			let option = document.createElement('option');
			option.value = script.id;
			option.label = script.name;
			scriptSelect.appendChild(option);
		}
	});

	const exportForm = document.getElementById('export-form');
	const exportCancel = document.getElementById('export-cancel');

	exportCancel.addEventListener('click', async function () {
		location.reload();
	});

	exportForm.addEventListener('submit', async function (ev) {
		ev.preventDefault();

		let selectedScript = scriptSelect.value.toString();
		try {
			// 构建脚本
			const script = await getScript(selectedScript);
			let {blockRoot} = await script.getScriptDetail();
			blockRoot = await registerRootBlock(blockRoot);
			const manifest = blockRoot.getRelatedResourcesManifest();

			const result = {
				entry: null, manifest,
				resources: {macro: [], script: [], element: [], smart: []}
			};

			// 导出脚本
			const scriptList = await storage.getKey('Script.List');
			result.resources.script.push({
				info: scriptList.find((s) => s.id === selectedScript),
				data: await storage.getKey(`Script.${selectedScript}`)
			});
			result.entry = result.resources.script[0].info;
			if (manifest.script) {
				for (let script of manifest.script) {
					const scriptData = scriptList.find((s) => s.id === script);
					if (scriptData) {
						result.resources.script.push({
							info: scriptData,
							data: await storage.getKey(`Script.${script}`)
						});
					}
				}
			}

			// 导出宏
			const macroList = await storage.getKey('Macro.List');
			if (manifest.macro) {
				for (let macro of manifest.macro) {
					const macroData = macroList.find((m) => m.id === macro);
					if (macroData) {
						result.resources.macro.push({
							info: macroData,
							data: await storage.getKey(`Macro.${macro}`)
						});
					}
				}
			}

			// 导出元素
			const elementList = await storage.getKey('Element.List');
			if (manifest.element) {
				for (let element of manifest.element) {
					const elementData = elementList.find((e) => e.id === element);
					if (elementData) {
						result.resources.element.push({
							info: elementData
						});
					}
				}
			}

			// 导出AI函数
			const smartList = await storage.getKey('Smart.List');
			if (manifest.smart) {
				for (let smart of manifest.smart) {
					const smartData = smartList.find((s) => s.id === smart);
					if (smartData) {
						result.resources.smart.push({
							info: smartData
						});
					}
				}
			}

			await Messages.send('Script.Export', {id: query.get('id'), result}, query.get('pageTarget'));
			location.reload();
		} catch (e) {
			alert(e);
		}
	});
});

window.addEventListener('pagehide', async function (ev) {
	await Messages.send('Script.ExportCancel', {id: query.get("id")}, query.get('pageTarget'));
});
