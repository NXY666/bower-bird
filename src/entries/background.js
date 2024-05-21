import {chromeApiRouter, storage, tempStorage} from '&/modules/chrome_api';
import {Messages, TabMessageClient} from '&/modules/messages';
import {parseDatetime, uniqueId} from "&/modules/strings";
import {DebounceFunction} from "&/modules/functions";

async function main() {
	console.log('background.js');

	const OffscreenReason = chrome.offscreen.Reason, ContextType = chrome.runtime.ContextType;
	let creatingOffscreen; // A global promise to avoid concurrency issues
	async function setupOffscreenDocument(path) {
		// Check all windows controlled by the service worker to see if one
		// of them is the offscreen document with the given path
		const offscreenUrl = chrome.runtime.getURL(path);
		const existingContexts = await chrome.runtime.getContexts({
			contextTypes: [ContextType.OFFSCREEN_DOCUMENT],
			documentUrls: [offscreenUrl]
		});

		if (existingContexts.length > 0) {
			return;
		}

		// create offscreen document
		if (creatingOffscreen) {
			await creatingOffscreen;
		} else {
			creatingOffscreen = chrome.offscreen.createDocument({
				url: path,
				reasons: [OffscreenReason.DOM_SCRAPING],
				justification: 'reason for needing the document'
			});
			await creatingOffscreen;
			creatingOffscreen = null;
		}
	}

	await setupOffscreenDocument('./offscreen.html').catch(() => {});

	// 宏录制
	class RecordMacro {
		onContextMenuClick;

		onRecordTabChanged;

		onRecordTabRemoved;

		constructor() {
			this.status = 'idle';

			this.macroId = uniqueId();
			this.recEvents = [];
			this.recStartTime = 0;
			this.recLastEventTime = 0;

			this.recWindowId = null;

			this.recTabMsgCli = null;
			this.recTabRouter = {
				"#connect": (cli) => {
					if (this.recStartTime) {
						cli.send('start_record', this.recStartTime);
					}
				},
				"record": (data) => {
					const nowTime = Date.now();
					this.recEvents.push({
						type: "sleep",
						time: nowTime - this.recLastEventTime
					}, data);
					this.recLastEventTime = nowTime;
				}
			};
		}

		async openRecordWindow() {
			if (this.status !== 'idle') {
				return;
			}

			// 创建新窗口
			const newWindow = await chrome.windows.create({});
			// 解析Promise并将新窗口的ID作为解析值
			this.recWindowId = newWindow.id;

			chrome.windows.onRemoved.addListener(this.onRecordTabRemoved = (windowId) => {
				if (this.recWindowId === windowId) {
					recordMacro.stopRecord();
				}
			});

			// 启用页面监听脚本
			await chrome.userScripts.register([
				{
					id: 'page_spy',
					matches: ['<all_urls>'],
					runAt: 'document_start',
					world: "MAIN",
					js: [{file: 'page_spy.js'}],
					allFrames: true
				}
			]);

			// 启用request拦截器kill_csp_ruleset
			const RuleActionType = chrome.declarativeNetRequest.RuleActionType;
			await chrome.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: [2147483647],
				addRules: [
					{
						"id": 2147483647,
						"priority": 1,
						"action": {
							"type": RuleActionType.MODIFY_HEADERS,
							"responseHeaders": [
								{"header": "Content-Security-Policy", "operation": "remove"}
							]
						},
						"condition": {
							"urlFilter": "|http*",
							"resourceTypes": ["script", "main_frame", "sub_frame"]
						}
					}
				]
			});

			// 添加右键菜单
			await chrome.contextMenus.create({
				id: 'bb_startRecord',
				title: '开始录制',
				contexts: ['page'],
				documentUrlPatterns: ['<all_urls>']
			});
			// 取消录制
			await chrome.contextMenus.create({
				id: 'bb_stopRecord',
				title: '取消录制',
				contexts: ['page'],
				documentUrlPatterns: ['<all_urls>']
			});

			chrome.contextMenus.onClicked.addListener(this.onContextMenuClick = (info) => {
				switch (info.menuItemId) {
					case 'bb_startRecord':
						this.startRecord();
						break;
					case 'bb_stopRecord':
						this.stopRecord();
						break;
				}
			});

			await Messages.send('Macro.RecordReady', null, 'tab:all');

			this.status = 'ready';

			console.log('[RecordMacro][openRecordWindow]', 'Record window opened.');
		}

		async startRecord() {
			if (this.status !== 'ready') {
				return;
			}

			// 第一个tab的id是recordingTab
			const startTab = await this.getRecordingTab();
			if (!startTab.url.match(/^(https?|file|urn|ftp):/)) {
				await Messages.send('Alert', '不~~~这里不行~~~', 'offscreen');
				return;
			}
			this.changeRecordingTab(await this.getRecordingTab());

			// 禁用右键菜单
			await chrome.contextMenus.update('bb_startRecord', {enabled: false});
			await chrome.contextMenus.update('bb_stopRecord', {title: "结束录制"});

			this.recStartTime = Date.now();
			this.recLastEventTime = Date.now();

			// 监控window中tab的切换
			chrome.tabs.onActivated.addListener(this.onRecordTabChanged = async ({tabId, windowId}) => {
				// 如果不是录制中的窗口，不处理
				if (windowId !== this.recWindowId) {
					return;
				}

				// 找到tab
				this.changeRecordingTab(await chrome.tabs.get(tabId));
			});

			// 通知页面开始录制
			this.recTabMsgCli.send('start_record', this.recStartTime);

			this.status = 'recording';

			console.log('[RecordMacro][startRecord]', 'Recording started.');
		}

		async getRecordingTab() {
			const tabs = await chrome.tabs.query({windowId: this.recWindowId, active: true});
			return tabs[0];
		}

		changeRecordingTab(tab) {
			// 连接新的tab
			this.recTabMsgCli?.disconnect();
			this.recTabMsgCli = new TabMessageClient(tab.id, 'Record', this.recTabRouter);
		}

		async stopRecord() {
			if (this.status !== 'ready' && this.status !== 'recording') {
				return;
			}
			this.status = 'finished';

			// 移除监听
			chrome.tabs.onActivated.removeListener(this.onRecordTabChanged);
			chrome.tabs.onRemoved.removeListener(this.onRecordTabRemoved);

			// 如果window还在，关闭它
			try {
				await chrome.windows.remove(this.recWindowId);
			} catch {}

			// 移除页面监听脚本
			await chrome.userScripts.unregister({ids: ['page_spy']});

			// 移除request拦截器kill_csp_ruleset
			await chrome.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: [2147483647]
			});

			// 断开tab连接
			this.recTabMsgCli?.disconnect();

			// 移除右键菜单
			await chrome.contextMenus.remove('bb_startRecord');
			await chrome.contextMenus.remove('bb_stopRecord');

			// 移除监听contextMenus
			chrome.contextMenus.onClicked.removeListener(this.onContextMenuClick);

			if (this.recEvents.length > 0) {
				// 获取宏列表
				const macroList = await storage.getKey('Macro.List') ?? [];
				// 添加新宏
				macroList.push({
					id: this.macroId,
					name: `我的宏 ${parseDatetime(new Date().getTime())}`,
					description: `已录制 ${this.recEvents.length} 步操作`,
					stepCount: this.recEvents.length,
					time: Date.now()
				});
				await storage.setKey('Macro.List', macroList);

				// 保存录制数据
				await storage.setKey(`Macro.${this.macroId}`, this.recEvents);

				console.log('[RecordMacro][stopRecord]', 'Recording saved.', 'id:', `Macro.${this.macroId}`, 'steps:', this.recEvents);
			}

			await Messages.send('Macro.RecordStopped', null, 'tab:all');

			console.log('[RecordMacro][stopRecord]', 'Recording stopped.');
		}
	}

	let recordMacro;
	let recordFloatPosition = {left: 20, top: 20};

	// 如果page_spy.js被意外的注入，那现在就移除它
	await chrome.userScripts.unregister({ids: ['page_spy']}).then(() => {
		// 向所有tab发送消息，让它们移除page_spy.js
		return Messages.send('Macro.RecordStopped', null, 'tab:all');
	}).catch(() => {});

	// 宏执行
	class ExecuteMacro {
		constructor(macroId) {
			this.status = 'idle';
			this.macroId = macroId;

			this.execTab = null;
			this.execTabMsgCli = null;
			this.execTabRouter = {
				"execute_result": (data) => {
					// 这里的data是boolean
					if (data) {
						this.execResolve();
					} else {
						this.execReject();
					}
				},
				"#disconnect": () => {
					this.execResolve();
				}
			};
			this.execResolve = () => {};
			this.execReject = () => {};
		}

		async startExecute() {
			if (this.status !== 'idle') {
				return;
			}
			this.status = 'executing';

			this.execMacro = await storage.getKey("Macro." + this.macroId);

			console.log('[ExecuteMacro][startExecute]', 'Executing started.', this.execMacro);

			let onActivatedListener;
			chrome.tabs.onActivated.addListener(onActivatedListener = async ({tabId}) => {
				this.changeTabPort(await chrome.tabs.get(tabId));
			});

			for (let i = 0; i < this.execMacro.length; i++) {
				const event = this.execMacro[i];
				if (!(await this.executeEvent(event))) {
					console.error('[ExecuteMacro][startExecute]', 'Executing', i, 'failed:', event);
					break;
				}
			}

			chrome.tabs.onActivated.removeListener(onActivatedListener);

			this.execTabMsgCli?.disconnect();

			this.status = 'finished';

			console.log('[ExecuteMacro][startExecute]', 'Executing finished.');
		}

		executeEvent(event) {
			return new Promise(async (resolve, reject) => {
				if (event.type === "sleep") {
					setTimeout(resolve, event.time);
					return;
				}

				// 如果发现页面切换，先切换连接的tab
				this.changeTabPort(await this.getCurrentTab());

				this.execResolve = resolve;
				this.execReject = reject;

				this.execTabMsgCli.send('execute', event);
				console.log('[ExecuteMacro][executeEvent]', "Execute sent.");
			})
			.then(() => {
				console.log('[ExecuteMacro][executeEvent]', "Execute success.");
				return true;
			})
			.catch(() => {
				console.warn('[ExecuteMacro][executeEvent]', "Execute failed.");
				return false;
			});
		}

		async getCurrentTab() {
			const tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true});
			return tabs[0];
		}

		changeTabPort(tab) {
			if (!tab || tab.id === this.execTab?.id) {
				return;
			}

			this.execTab = tab;

			// 如果之前有监听的tab，先移除监听
			this.execTabMsgCli?.disconnect();

			// 如果已经结束，不再连接
			if (this.status === 'finished') {
				console.warn('[ExecuteMacro][changeTabPort]', "ExecuteMacro is finished.");
			} else {
				this.execTabMsgCli = new TabMessageClient(tab.id, 'Execute', this.execTabRouter);
			}
		}
	}

	const executeMacroPool = {};

	// 脚本主动聚焦
	async function focusScript(id) {
		// 获取脚本状态
		let stateMap = await tempStorage.getKey('Script.StateMap') ?? {};
		const {tabId} = stateMap[id] ?? {};

		// 存档旧tab的状态
		await Messages.send('Script.Focus', {state: false, id}, 'tab:' + tabId);

		// 获取当前tab
		let [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
		// 如果当前页面不能操作，则等到可以操作的时候再发送消息
		const urlRegexp = /^(https?|file|urn|ftp):/;
		if (!tab.url.match(urlRegexp)) {
			tab = await new Promise((resolve) => {
				let activeListener, updateListener;
				chrome.tabs.onActivated.addListener(activeListener = async function ({tabId}) {
					const newTab = await chrome.tabs.get(tabId);
					if (newTab.url.match(urlRegexp)) {
						chrome.tabs.onActivated.removeListener(activeListener);
						chrome.tabs.onUpdated.removeListener(updateListener);
						resolve(newTab);
					}
				});
				chrome.tabs.onUpdated.addListener(updateListener = function (tabId, changeInfo, tab) {
					if (changeInfo.status === 'complete' && tab.url.match(urlRegexp)) {
						chrome.tabs.onUpdated.removeListener(updateListener);
						chrome.tabs.onActivated.removeListener(activeListener);
						resolve(tab);
					}
				});
			});
		}

		// 因为存档的时候stateMap变了，所以要重新获取
		stateMap = await tempStorage.getKey('Script.StateMap') ?? {};

		// 更新状态
		stateMap[id].tabId = tab.id;
		await tempStorage.setKey('Script.StateMap', stateMap);

		// 恢复新tab的状态
		await Messages.send('Script.Focus', {state: true, id}, 'tab:' + tab.id);

		console.log('[FocusScript]', 'Focus success.', 'id:', id, tabId, 'to', tab.id);
	}

	chrome.tabs.onRemoved.addListener(async (tabId) => {
		const stateMap = await tempStorage.getKey('Script.StateMap') ?? {};
		const states = Object.values(stateMap).map((state) => { return state.tabId === tabId; });
		// 如果有脚本在这个tab上，直接删除
		for (let state of states) {
			delete stateMap[state.id];
		}
		await tempStorage.setKey('Script.StateMap', stateMap);
	});

	// 消息处理
	Messages.recv("background", {
		// Chrome API
		...chromeApiRouter,

		// 标签页
		'Tab.This': async (data, sender) => {
			return sender.tab.id;
		},

		// 宏
		'Macro.IsRecordWindow': async (data, sender) => {
			const tab = await chrome.tabs.get(sender.tab.id);
			return tab.windowId === recordMacro?.recWindowId;
		},
		'Macro.IsRecordMode': async () => {
			// 判断是否处于可以开始录制或录制中的状态
			return recordMacro?.status === 'idle' || recordMacro?.status === 'ready' || recordMacro?.status === 'recording';
		},
		'Macro.IsExecuteMode': async () => {
			return Object.keys(executeMacroPool).length > 0;
		},
		'Macro.GetRecordFloatPosition': () => {
			return recordFloatPosition;
		},
		'Macro.SetRecordFloatPosition': (data) => {
			recordFloatPosition = data;
		},
		'Macro.InitRecord': () => {
			if (recordMacro === undefined || recordMacro?.status === 'finished') {
				recordMacro = new RecordMacro();
			} else {
				throw "已有正在活动的录制窗口。";
			}
		},
		'Macro.ReadyRecord': async () => {
			try {
				await recordMacro.openRecordWindow();
			} catch (e) {
				console.error('[Macro.ReadyRecord]', 'Cannot open record window.', e);
				throw "准备不了一点。(" + e + ")";
			}
		},
		'Macro.StartRecord': async () => {
			try {
				await recordMacro.startRecord();
			} catch (e) {
				throw "不能在这里开始录制。";
			}
		},
		'Macro.StopRecord': async () => {
			try {
				await recordMacro.stopRecord();
			} catch (e) {
				throw "根本停不下来。(" + e + ")";
			}
		},
		'Macro.Execute': async (data) => {
			let executeMacro = executeMacroPool[data];
			if (executeMacro === undefined || executeMacro.status === 'finished') {
				executeMacro = new ExecuteMacro(data);
				executeMacroPool[data] = executeMacro;
				await executeMacro.startExecute().then(() => {
					delete executeMacroPool[data];
					Messages.send('Macro.ExecuteFinish', executeMacro.macroId, 'tab:all');
				});
			} else {
				throw '宏在跑，别急。';
			}
		},
		'Macro.IsExecuting': async (data) => {
			return executeMacroPool[data] !== undefined;
		},

		// 脚本
		'Script.StartExport': async (data) => {
			const urlObj = new URL(chrome.runtime.getURL('export.html'));
			urlObj.searchParams.set('id', data.id);
			urlObj.searchParams.set('origin', data.origin);
			urlObj.searchParams.set('pageTarget', data.pageTarget);

			await chrome.windows.create({
				url: urlObj.href,
				type: 'popup',
				width: 790,
				height: 350,
				top: Math.round(data.windowHeight / 2 - 200),
				left: Math.round(data.windowWidth / 2 - 395),
				focused: true
			});
		},
		'Script.StartImport': async (data) => {
			const urlObj = new URL(chrome.runtime.getURL('import.html'));
			urlObj.searchParams.set('id', data.id);
			urlObj.searchParams.set('origin', data.origin);
			urlObj.searchParams.set('pageTarget', data.pageTarget);

			// 把数据存到临时存储
			await tempStorage.setKey(`ImportScript.Resource_${data.id}`, data.resources);

			await chrome.windows.create({
				url: urlObj.href,
				type: 'popup',
				width: 790,
				height: 350,
				top: Math.round(data.windowHeight / 2 - 200),
				left: Math.round(data.windowWidth / 2 - 395),
				focused: true
			});
		},
		'Script.RegisterExecute': async (id, sender) => {
			const stateMap = await tempStorage.getKey('Script.StateMap') ?? {};

			stateMap[id] = {id, tabId: sender.tab.id};

			await tempStorage.setKey('Script.StateMap', stateMap);

			console.log('[Script.RegisterExecute]', 'Register success.', 'id:', id, 'tabId:', sender.tab.id);
		},
		'Script.ArchiveStates': async (states, sender) => {
			const stateMap = await tempStorage.getKey('Script.StateMap') ?? {};

			const tabId = sender.tab.id;

			for (let {id, steps, vars} of states) {
				if (stateMap[id]?.tabId !== tabId) {
					console.warn('[Script.ArchiveStates]', 'Tab id not match:', 'id:', id, 'tabId:', stateMap[id]?.tabId, 'not', tabId);
					continue;
				}
				stateMap[id] = {id, tabId, steps, vars};
			}

			await tempStorage.setKey('Script.StateMap', stateMap);

			console.log('[Script.ArchiveStates]', 'Archive success.', 'states:', states, 'tabId:', tabId);
		},
		'Script.ArchiveState': async ({id, steps, vars}, sender) => {
			const stateMap = await tempStorage.getKey('Script.StateMap') ?? {};

			const tabId = sender.tab.id;

			if (stateMap[id]?.tabId !== tabId) {
				console.warn('[Script.ArchiveState]', 'Tab id not match:', 'id:', id, 'tabId:', stateMap[id]?.tabId, 'not', tabId);
				return;
			}
			stateMap[id] = {id, tabId, steps, vars};

			await tempStorage.setKey('Script.StateMap', stateMap);

			console.log('[Script.ArchiveState]', 'Archive success.', 'id:', id, 'steps:', steps, 'vars:', vars, 'tabId:', tabId);
		},
		'Script.RestoreStates': async (data, sender) => {
			const stateMap = await tempStorage.getKey('Script.StateMap') ?? {};

			const states = Object.values(stateMap).filter((step) => step.tabId === sender.tab.id && step.steps && step.vars);
			const results = JSON.parse(JSON.stringify(states));

			// 清除已经恢复的数据
			for (let state of states) {
				delete state.steps;
				delete state.vars;
			}

			await tempStorage.setKey('Script.StateMap', stateMap);

			console.log('[Script.RestoreStates]', 'Restore success.', 'results:', results, 'tabId:', sender.tab.id, 'states:', states.length, 'stateMap:', stateMap);

			return results;
		},
		'Script.RestoreState': async (id) => {
			const stateMap = await tempStorage.getKey('Script.StateMap') ?? {};

			const state = stateMap[id];
			const result = JSON.parse(JSON.stringify(state));

			// 清除已经恢复的数据
			delete state.steps;
			delete state.vars;

			await tempStorage.setKey('Script.StateMap', stateMap);

			console.log('[Script.RestoreState]', 'Restore success.', 'id:', id, 'result:', result);

			return result;
		},
		'Script.FinishExecute': async (id, sender) => {
			const stateMap = await tempStorage.getKey('Script.StateMap') ?? {};

			// 只能由对应的tab发送
			if (stateMap[id]?.tabId !== sender.tab.id) {
				console.warn('[Script.FinishExecute]', 'Tab id not match:', 'id:', id, 'tabId:', stateMap[id]?.tabId, 'not', sender.tab.id);
				return;
			}

			delete stateMap[id];

			await tempStorage.setKey('Script.StateMap', stateMap);
			console.log('[Script.FinishExecute]', 'Finish success.', 'id:', id);
		},
		'Script.Focus': async (id) => {
			await focusScript(id);
		},

		// 页面
		'Page.IsInteractable': async () => {
			const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
			return /^(https?|file|urn|ftp):/.test(tab.url);
		},

		// 捕捉元素
		'Element.Capture': async (data) => {
			await Messages.send('Element.CaptureFinish', null, 'tab:all');
			try {
				const urlObj = new URL(chrome.runtime.getURL('capture.html'));

				data.textContent = data.textContent.replace(/\s+/g, ' ').trim().slice(0, 1000);

				// 保存数据
				const screenshot = await chrome.tabs.captureVisibleTab(undefined, {format: 'png'});
				await tempStorage.setKey('Capture.ElementScreenshot', screenshot);

				urlObj.searchParams.set('data', JSON.stringify(data));
				await chrome.windows.create({
					url: urlObj.href,
					type: 'popup',
					width: 790,
					height: 400,
					top: Math.round(data.rect.window.height / 2 - 200),
					left: Math.round(data.rect.window.width / 2 - 395),
					focused: true
				}).catch((e) => {
					console.error('[Element.Capture]', 'Cannot open capture window.', e);
				});
			} catch (e) {
				console.error('[Element.Capture]', 'Capture failed.', e);
			}
		},

		// 日志
		'Log.Record': async (data) => {
			console[data.type](data.message);

			const logList = await storage.getKey('Log.List') ?? [];
			logList.push({
				type: data.type,
				message: data.message,
				time: Date.now()
			});

			// 不能超过100条
			if (logList.length > 100) {
				logList.shift();
			}
			await storage.setKey('Log.List', logList);
		},

		// 数据
		'Data.Save': async (data) => {
			const dataList = await storage.getKey('Data.List') ?? [];
			dataList.push({
				name: data.name,
				data: data.data,
				time: Date.now()
			});
			await storage.setKey('Data.List', dataList);
		},

		// 测试
		'Install': async () => {
			await chrome.userScripts.register([
				{
					id: 'page_spy',
					matches: ['<all_urls>'],
					runAt: 'document_start',
					world: "MAIN",
					js: [{file: 'page_spy.js'}]
				}
			]);
		},
		'Reinstall': async () => {
			await chrome.userScripts.update([
				{
					id: 'page_spy',
					matches: ['http://*/*'],
					runAt: 'document_start',
					world: "MAIN",
					js: [{file: 'page_spy.js'}]
				}
			]);
		},
		'Uninstall': async () => {
			await chrome.userScripts.unregister({ids: ['page_spy']});
		}
	});

	// 监听脚本列表变化
	const registerUserScriptFunction = new DebounceFunction(() => {
		chrome.userScripts.getScripts({ids: ['page_script']}).then(async (scripts) => {
			let js = await fetch(chrome.runtime.getURL('page_script.js')).then((res) => res.text());

			// 获取到占位符和API
			const placeholderRegexp = /,?console\.log\("###ReplacePlaceholder###", ?(\{[^}]*})\);?/;
			const matchResult = js.match(placeholderRegexp);
			const functionIndexer = matchResult[1];

			// 脚本
			let scriptList = await storage.getKey('Script.List') ?? [];
			let scriptContainer = "";
			scriptList.forEach(script => {
				scriptContainer += `"${script.id}": async function (stepList = [1], externalVars = {}, isRestore = false) { ${script.js} },`;
			});

			js = js.replace(placeholderRegexp, `;const __API__=${functionIndexer};const __SCRIPTS__={${scriptContainer}};const __TEMP__={};`);
			// console.log(js);
			if (scripts.length === 0) {
				await chrome.userScripts.register([
					{
						id: 'page_script',
						matches: ['<all_urls>'],
						js: [{code: js}]
					}
				]);
				console.info('[UserScript]', 'UserScript registered.');
			} else {
				await chrome.userScripts.update([
					{
						id: 'page_script',
						matches: ['<all_urls>'],
						js: [{code: js}]
					}
				]);
				console.info('[UserScript]', 'UserScript updated.');
			}
		});
	}, 1000);

	registerUserScriptFunction.debounce();
	chrome.storage.local.onChanged.addListener((changes) => {
		if (changes['Script.List']) {
			console.log('[UserScript]', 'UserScript will be updated.');
			registerUserScriptFunction.debounce();
		}
	});
}

// noinspection JSUnusedGlobalSymbols
export default {main: () => { main().then(() => {}); }};
