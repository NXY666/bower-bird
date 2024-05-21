import * as Objects from "&/modules/objects";
import * as Strings from "&/modules/strings";
import {storage} from "&/modules/chrome_api";
import {RootBlock} from "&/classes/Block";

type InitScript = { id?: string, state: boolean, name: string, description: string };

type InitScriptDetail = { blockRoot: RootBlock };

class Script {
	_state: boolean;
	_name: string;
	_description: string;
	_js: string = "";

	constructor(script: InitScript) {
		this._id = script.id;
		this._state = script.state;
		this._name = script.name;
		this._description = script.description;
	}

	static get defaultScriptDetail(): InitScriptDetail {
		return {blockRoot: new RootBlock()};
	};

	static get defaultScript(): InitScript {
		return {id: "", state: true, name: "未名的脚", description: "这脚真臭"};
	}

	_id: string;

	get state() {
		return this._state;
	}

	set state(value) {
		this._state = value;
	}

	get name() {
		return this._name;
	}

	set name(value) {
		this._name = value;
	}

	get description() {
		return this._description;
	}

	set description(value) {
		this._description = value;
	}

	get id() {
		return this._id;
	}

	async generateJs(blockRoot: RootBlock) {
		this._js = `const __VAR__={__ID__:'${this.id}'${blockRoot.getAllExportVariables().filter((variable) => variable.alias).map((variable) => `,${variable.alias}: null`).join("")},...externalVars}; await __API__.__RegisterExecute__(__VAR__.__ID__, stepList, __VAR__, isRestore); ${blockRoot.packScript()}`;
		await setScript(this);
	}

	get js() {
		return this._js;
	}

	async getScriptDetail(): Promise<Object | InitScriptDetail> {
		return Objects.complicateObject(await storage.getKey(`Script.${this.id}`)) ?? Script.defaultScriptDetail;
	}

	async setScriptDetail(detail: InitScriptDetail) {
		await storage.setKey(`Script.${this.id}`, Objects.simplifyObject(detail));
	}

	valueOf() {
		let getters = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(this));
		const object = {};
		for (let key in getters) {
			if (getters[key].get) {
				object[key] = this[key];
			}
		}
		return object;
	}
}

export async function createScript(script: InitScript) {
	script = Objects.mergeObject(Script.defaultScript, script);
	if (!script.id) {
		// 新脚本
		script.id = Strings.uniqueId();
		await storage.setKey(`Script.${script.id}`, Script.defaultScriptDetail);
	}

	return new Script(script);
}

export async function getScript(id: string) {
	const scriptList = await storage.getKey(`Script.List`) ?? [];
	const scriptObj = scriptList?.find(item => item.id === id);
	return scriptObj ? await createScript(scriptObj) : null;
}

export async function setScript(script: Script) {
	const scriptList = await storage.getKey(`Script.List`) ?? [];
	const index = scriptList.findIndex(item => item.id === script.id);
	if (index === -1) {
		scriptList.push(script.valueOf());
	} else {
		scriptList[index] = script.valueOf();
	}
	await storage.setKey(`Script.List`, scriptList);
}

export async function deleteScript(id: string) {
	const scriptList = await storage.getKey(`Script.List`) ?? [];
	const index = scriptList.findIndex(item => item.id === id);
	if (index === -1) {
		return;
	}
	await storage.removeKey(`Script.${id}`);
	scriptList.splice(index, 1);
	await storage.setKey(`Script.List`, scriptList);
}