import {DocumentMessages} from "&/modules/messages.ts";
import {defineUnlistedScript} from "wxt/sandbox";
import {deepQuerySelector} from "&/modules/foreground/selectors.ts";

function main() {
	const html = document.documentElement;

	const __ExecutingMacro__ = {};

	const __LocalScript__ = {};

	// 工具函数
	function sendBackgroundMessage(type, data) {
		return DocumentMessages.send('background_message', {type, data});
	}

	function varsFilter(vars) {
		const varsCopy = {};
		for (let key in vars) {
			if (vars.hasOwnProperty(key)) {
				const value = vars[key];
				if (
					typeof value !== 'function' &&
					typeof value !== 'object' &&
					typeof value !== 'undefined' &&
					typeof value !== 'symbol' &&
					typeof value !== 'bigint'
				) {
					varsCopy[key] = value;
				}
			}
		}

		delete varsCopy.__ID__;

		return varsCopy;
	}

	async function restoreScripts() {
		const states = await sendBackgroundMessage('Script.RestoreStates');
		states.forEach(({id, steps, vars}) => {
			if (__LocalScript__[id]) {
				console.error("[restoreScripts]", 'Script already exists.', 'id:', id);
				return;
			}
			__SCRIPTS__[id]?.(steps, vars, true);
		});

		console.debug("[restoreScripts]", 'Scripts restored.', 'states:', states);
	}

	async function restoreScript(id) {
		if (__LocalScript__[id]) {
			console.debug("[restoreScript]", 'Script already exists.', 'id:', id);
			return;
		}

		const {steps, vars} = await sendBackgroundMessage('Script.RestoreState', id);
		__SCRIPTS__[id]?.(steps, vars, true);

		console.debug("[restoreScript]", 'Script restored.', 'id:', id, 'steps:', steps, 'vars:', vars);
	}

	async function archiveScripts() {
		const promise = sendBackgroundMessage(
			'Script.ArchiveStates',
			Object.values(__LocalScript__)
			.map(({id, steps, vars}) => {
				return {id, steps, vars: varsFilter(vars)};
			})
		);

		Object.keys(__LocalScript__).forEach((id) => {
			delete __LocalScript__[id];
		});

		console.debug("[archiveScripts]", 'Scripts archived.');

		await promise;
	}

	async function archiveScript(id) {
		if (!__LocalScript__[id]) {
			return;
		}

		const state = __LocalScript__[id];
		const promise = sendBackgroundMessage('Script.ArchiveState', {
			id, steps: state.steps, vars: varsFilter(state.vars)
		});

		delete __LocalScript__[id];

		console.debug("[archiveScript]", 'Script archived.', 'id:', id, 'state:', state);

		await promise;
	}

	function concatArgs(args) {
		args = args.map(arg => {
			if (typeof arg === 'object') {
				return JSON.stringify(arg);
			}
			return arg;
		}).join(' ');
		return args;
	}

	// 执行宏
	function __ExecuteMacro__(macroId) {
		return sendBackgroundMessage('Macro.Execute', macroId);
	}

	// 等待宏执行
	async function __WaitMacroExecute__(macroId) {
		if (await sendBackgroundMessage('Macro.IsExecuting', macroId)) {
			console.debug("[__WaitMacroExecute__]", 'Waiting for macro execution.', 'macroId:', macroId);
			await new Promise((resolve) => {
				__ExecutingMacro__[macroId] = resolve;
			});
			console.debug("[__WaitMacroExecute__]", 'Macro execution completed.', 'macroId:', macroId);
		}
	}

	// 脚本聚焦
	async function __ScriptFocus__(id) {
		await sendBackgroundMessage('Script.Focus', id);
	}

	// 捕获元素
	async function __GetCapturedElement__(elementId) {
		try {
			const storage = await sendBackgroundMessage('Storage.Get', 'Element.List');
			const elementList = storage['Element.List'] ?? [];
			for (let element of elementList) {
				if (element.id === elementId) {
					return deepQuerySelector(document, element.selector);
				}
			}
		} catch (e) {
			await console.error('获取捕获的元素时发生异常：', e);
		}
		return null;
	}

	// 保存数据
	async function __SaveData__(name, data) {
		await sendBackgroundMessage('Data.Save', {name, data});
	}

	// 保存集合
	async function __SaveList__(name, list) {
		for (let data of list) {
			await __SaveData__(name, data);
		}
	}

	// 归档状态
	async function __ArchiveState__(id, steps, vars) {
		await sendBackgroundMessage('Script.ArchiveState', {id, steps, vars: varsFilter(vars)});
	}

	// 注册执行
	async function __RegisterExecute__(id, steps, vars, isRestore = false) {
		if (isRestore) {
			steps[steps.length - 1]++;
		} else {
			await sendBackgroundMessage('Script.RegisterExecute', id);
		}
		__LocalScript__[id] = {id, steps, vars};
	}

	// 完成执行
	async function __FinishExecute__(id) {
		delete __LocalScript__[id];
		await sendBackgroundMessage('Script.FinishExecute', id);
	}

	// 记录日志
	async function __RecordLog__(type, message) {
		await sendBackgroundMessage('Log.Record', {type, message});
	}

	console.log = (...args) => __RecordLog__('log', concatArgs(args));
	console.error = (...args) => __RecordLog__('error', concatArgs(args));
	console.warn = (...args) => __RecordLog__('warn', concatArgs(args));
	console.info = (...args) => __RecordLog__('info', concatArgs(args));

	if (!html.hasAttribute('bb-pagespy')) {
		DocumentMessages.recv("script_focus", async ({state, id}) => {
			if (state) {
				await restoreScript(id);
			} else {
				await archiveScript(id);
			}
		});

		window.addEventListener("pageshow", restoreScripts);

		window.addEventListener("beforeunload", archiveScripts);

		DocumentMessages.recv("execute_script", (id) => {
			console.debug("[execute_script]", "id:", id);
			__SCRIPTS__[id]?.();
		});
		DocumentMessages.recv("macro_execute_finish", (id) => __ExecutingMacro__[id]?.());
	}

	// noinspection JSUnusedGlobalSymbols
	console.log("###ReplacePlaceholder###", {
		__ExecutingMacro__,
		__ExecuteMacro__,
		__WaitMacroExecute__,
		__LocalScript__,
		__ScriptFocus__,
		__GetCapturedElement__,
		__SaveData__,
		__SaveList__,
		__ArchiveState__,
		__RegisterExecute__,
		__FinishExecute__
	});
}

// noinspection JSUnusedGlobalSymbols
export default defineUnlistedScript({
	main
});