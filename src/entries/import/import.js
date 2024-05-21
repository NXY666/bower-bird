import {storage, tempStorage} from "&/modules/chrome_api.ts";

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

	try {
		const {entry, resources} = await tempStorage.getKey(`ImportScript.Resource_${query.get('id')}`);

		const importTitle = document.getElementById('import-title');
		importTitle.textContent = entry.name;

		const relatedResourceList = document.getElementById('related-resource-list');
		// script
		for (const script of resources.script) {
			const li = document.createElement('li');
			li.className = 'resource-list-item';
			li.innerHTML = `
				<h4 class="type">脚本</h4>
				<div class="info">
					<div class="text-ellipsis title">${script.info.name}</div>
					<div class="text-ellipsis desc">${script.info.description || '无描述'}</div>
				</div>`;
			relatedResourceList.appendChild(li);
		}
		// macro
		for (const macro of resources.macro) {
			const li = document.createElement('li');
			li.className = 'resource-list-item';
			li.innerHTML = `
				<h4 class="type">宏　</h4>
				<div class="info">
					<div class="text-ellipsis title">${macro.info.name}</div>
					<div class="text-ellipsis desc">${macro.info.description || '无描述'}</div>
				</div>`;
			relatedResourceList.appendChild(li);
		}
		// element
		for (const element of resources.element) {
			const li = document.createElement('li');
			li.className = 'resource-list-item';
			li.innerHTML = `
				<h4 class="type">元素</h4>
				<div class="info">
					<div class="text-ellipsis title">${element.info.name}</div>
					<div class="text-ellipsis desc">${element.info.description || '无描述'}</div>
				</div>`;
			relatedResourceList.appendChild(li);
		}
		// smart
		for (const smart of resources.smart) {
			const li = document.createElement('li');
			li.className = 'resource-list-item';
			li.innerHTML = `
				<h4 class="type">函数</h4>
				<div class="info">
					<div class="text-ellipsis title">${smart.info.name}</div>
					<div class="text-ellipsis desc">${smart.info.description || '无描述'}</div>
				</div>`;
			relatedResourceList.appendChild(li);
		}

		const importCancel = document.getElementById('import-cancel');
		importCancel.addEventListener('click', async function () {
			location.reload();
		});

		const importScript = document.getElementById('import-script');
		importScript.addEventListener('click', async function () {
			try {
				// 导入脚本
				const scriptList = await storage.getKey('Script.List');
				for (const script of resources.script) {
					// 没有相同的id才导入
					if (scriptList.find((s) => s.id === script.info.id)) {
						continue;
					}
					scriptList.push(script.info);
					await storage.setKey(`Script.${script.info.id}`, script.data);
				}
				await storage.setKey('Script.List', scriptList);

				// 导入宏
				const macroList = await storage.getKey('Macro.List');
				for (const macro of resources.macro) {
					// 没有相同的id才导入
					if (macroList.find((m) => m.id === macro.info.id)) {
						continue;
					}
					macroList.push(macro.info);
					await storage.setKey(`Macro.${macro.info.id}`, macro.data);
				}
				await storage.setKey('Macro.List', macroList);

				// 导入元素
				const elementList = await storage.getKey('Element.List');
				for (const element of resources.element) {
					// 没有相同的id才导入
					if (elementList.find((e) => e.id === element.info.id)) {
						continue;
					}
					elementList.push(element.info);
				}
				await storage.setKey('Element.List', elementList);

				// 导入函数
				const smartList = await storage.getKey('Smart.List');
				for (const smart of resources.smart) {
					// 没有相同的id才导入
					if (smartList.find((s) => s.id === smart.info.id)) {
						continue;
					}
					smartList.push(smart.info);
				}
				await storage.setKey('Smart.List', smartList);

				location.reload();
			} catch (e) {
				console.error('[ImportScript]', 'Import failed:', e);
				alert("导入失败，脚本可能有问题。");
			}
		});
	} catch (e) {
		console.error('[LoadImportScript]', 'Load failed:', e);
		alert("读取失败，脚本可能有问题。");
		location.reload();
	}
});

window.addEventListener('pagehide', async function () {
	await tempStorage.removeKey(`ImportScript.Resource_${query.get('id')}`);
});
