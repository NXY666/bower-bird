// noinspection JSUnusedGlobalSymbols

import {reactive} from "vue";
import {escapeHTML, escapeStringValue, uniqueId} from "&/modules/strings";
import {storage} from "&/modules/chrome_api";
import * as Objects from "&/modules/objects";
import {getBlockTypeMap, getMetaByBlock} from "&/classes/BlockType";

interface AnyStore {
	[key: string | number | symbol]: any;
}

type EnumOption = { label: string, value: string | number | boolean };
type EnumOptions = EnumOption[];

type DefaultValue<T = any> = T | (() => T | Promise<T>);

interface DefaultAttrType {
	[key: string]: {
		type: 'enum';
		label: string;
		options: EnumOptions | (() => EnumOptions | Promise<EnumOptions>);
		defaultValue: DefaultValue;
		limit?: {
			required?: boolean;
		};
	} | {
		type: 'string';
		label: string;
		defaultValue: DefaultValue<string>;
		limit?: {
			required?: boolean;
			patterns?: Array<{ name: string, pattern: string | RegExp }>;
			validators?: Array<{ name: string, func: (value: any) => boolean }>;
			minlength?: number;
			maxlength?: number;
		};
	} | {
		type: 'number';
		label: string;
		defaultValue: DefaultValue<number>;
		limit?: {
			required?: boolean;
			validators?: Array<{ name: string, func: (value: any) => boolean }>;
			min?: number;
			max?: number;
		};
	} | {
		type: 'boolean';
		label: string;
		defaultValue: DefaultValue<boolean>;
		limit?: {
			required?: boolean;
			validators?: Array<{ name: string, func: (value: any) => boolean }>;
		};
	} | {
		type: 'variable';
		label: string;
		options?: EnumOptions;
		defaultValue: null;
		limit?: {
			required?: boolean;
			type?: 'number' | 'string' | 'boolean' | 'data' | 'list' | 'Element' | 'if_result';
			validators?: Array<{ name: string, func: (value: any) => boolean }>;
		};
	};
}

const VariableTypeOptions: EnumOptions = [
	{label: "数字", value: "number"},
	{label: "文本", value: "string"},
	{label: "是非", value: "boolean"},
	{label: "数据", value: "data"},
	{label: "集合", value: "list"},
	{label: "元素", value: "Element"}
];

const NumberOperateOptions: EnumOptions = [
	{label: "加", value: "+"},
	{label: "减", value: "-"},
	{label: "乘", value: "*"},
	{label: "除", value: "/"}
];

const NumberCompareOptions: EnumOptions = [
	{label: "等于", value: "=="},
	{label: "不等于", value: "!="},
	{label: "大于", value: ">"},
	{label: "大于等于", value: ">="},
	{label: "小于", value: "<"},
	{label: "小于等于", value: "<="}
];

const BooleanCompareOptions: EnumOptions = [
	{label: "等于", value: "=="},
	{label: "不等于", value: "!="}
];

const StringCompareOptions: EnumOptions = [
	{label: "等于", value: "=="},
	{label: "不等于", value: "!="}
];

const BaseElementSelectorOptions: EnumOptions = [
	{label: "任意元素", value: "*"},
	{label: "文本框", value: "input[type=text]"},
	{label: "数字输入框", value: "input[type=number]"},
	{label: "密码输入框", value: "input[type=password]"},
	{label: "邮件输入框", value: "input[type=email]"},
	{label: "日期输入框", value: "input[type=date]"},
	{label: "时间输入框", value: "input[type=time]"},
	{label: "日期时间输入框", value: "input[type=datetime-local]"},
	{label: "按钮", value: "input[type=submit],input[type=button],input[type=reset],button"},
	{label: "链接", value: "a"},
	{label: "图片", value: "img"},
	{label: "视频", value: "video"},
	{label: "音频", value: "audio"},
	{label: "下拉框", value: "select"},
	{label: "多选框", value: "input[type=checkbox]"},
	{label: "单选框", value: "input[type=radio]"},
	{label: "文件上传", value: "input[type=file]"},
	{label: "隐藏域", value: "input[type=hidden]"},
	{label: "文本域", value: "textarea"},
	{label: "表格", value: "table"},
	{label: "表单", value: "form"},
	{label: "标题", value: "h1,h2,h3,h4,h5,h6"},
	{label: "段落", value: "p"},
	{label: "列表", value: "ul,ol,li"},
	{label: "表格行", value: "tr"},
	{label: "表格列", value: "td,th"}
];

const DescPH = {
	NeedSelect: "<b style='color: var(--el-color-danger);'>&lt;请选择&gt;</b>",
	NeedInput: "<b style='color: var(--el-color-danger);'>&lt;请输入&gt;</b>",
	Null: "<b style='color: var(--el-color-info);'>空</b>",
	Variable: "<span style='color: var(--el-color-info); font-size: 80%;'>(变量)</span>",
	Export: "<span style='color: var(--el-color-info); font-size: 80%;'>(导出)</span>"
};

enum BlockGroupNames {
	Debug = "Debug",
	UserInteraction = "UserInteraction",
	VariableOperation = "VariableOperation",
	SystemOperation = "SystemOperation",
	ElementOperation = "ElementOperation",
	DataOperation = "DataOperation",
	PageNavigation = "PageNavigation",
	FlowControl = "FlowControl",
	Automation = "Automation",
}

export async function registerRootBlock(rootBlock: Object): Promise<RootBlock> {
	const BlockTypeMap = await getBlockTypeMap();

	if (rootBlock != null) {
		Object.setPrototypeOf(rootBlock, RootBlock.prototype);
		if (!(rootBlock instanceof RootBlock)) {
			throw new Error("Root block must be instance of RootBlock");
		}

		Block.regId(rootBlock);
		const toBlocks = async (blocks: Block[]) => {
			for (let block of blocks) {
				// 先转为Block，获取基本属性；再转为对应类型，获取特殊属性
				Object.setPrototypeOf(block, Block.prototype);
				Object.setPrototypeOf(block, BlockTypeMap[block.type]?.prototype ?? Block.prototype);
				await block.build();
				Block.regId(block);

				// 特殊块
				if (block instanceof IfBlock) {
					Object.setPrototypeOf(block.endIfBlock, EndIfBlock.prototype);
					Block.regId(block.endIfBlock);
				} else if (block instanceof LoopBlock) {
					Object.setPrototypeOf(block.endLoopBlock, EndLoopBlock.prototype);
					Block.regId(block.endLoopBlock);
				}

				await toBlocks(block.children);
			}
		};
		await toBlocks(rootBlock.children);
	} else {
		rootBlock = new RootBlock();
	}

	return rootBlock as RootBlock;
}

export const blockGroups = [
	{label: "日志调试", name: BlockGroupNames.Debug},
	{label: "人机交互", name: BlockGroupNames.UserInteraction},
	{label: "变量操作", name: BlockGroupNames.VariableOperation},
	{label: "系统操作", name: BlockGroupNames.SystemOperation},
	{label: "元素操作", name: BlockGroupNames.ElementOperation},
	{label: "数据操作", name: BlockGroupNames.DataOperation},
	{label: "页面导航", name: BlockGroupNames.PageNavigation},
	{label: "流程控制", name: BlockGroupNames.FlowControl},
	{label: "自动化", name: BlockGroupNames.Automation},
];

export class Block {
	static groupName?: BlockGroupNames = null;

	static defaultAttr: DefaultAttrType = {};

	static defaultTitle = "Default Block";

	static _idMap = {};

	private _type: string;

	private readonly _id: string;
	private readonly _children: {};
	private readonly _attr: {};
	private readonly _data: AnyStore;
	private readonly _varAlias: {};

	constructor() {
		this._id = Block.genId(this);
		this._bid = this.id;

		this._parent = null;
		this._children = {};

		this._beforeBlock = null;
		this._afterBlock = null;

		this._isStartBlock = false;
		this._isEndBlock = false;

		this._attr = {};

		this._data = {};

		this._varAlias = {};
	}

	static get super(): typeof Block | undefined {
		const parentProto = Object.getPrototypeOf(this.prototype);
		return parentProto === Object.prototype ? undefined : parentProto.constructor;
	}

	get prototype() {
		return Object.getPrototypeOf(this).constructor;
	}

	get type(): string {
		return this._type;
	}

	get id() {
		return this._id;
	}

	protected _bid: string;
	get bid() {
		return this._bid;
	}

	get title() {
		return this.prototype.defaultTitle;
	}

	get description(): string {
		return "Default Block Description";
	}

	get lightColor(): string {
		return "var(--el-bg-color)";
	}

	get darkColor(): string {
		return "var(--base-color-info-dark-7)";
	}

	getColor(isDark: boolean) {
		return isDark ? this.darkColor : this.lightColor;
	}

	private _parent: Block;
	get parent() {
		return this._parent;
	}
	set parent(block) {
		this._parent = block;
	}

	private _beforeBlock: Block;

	/**
	 * 获取当前块的前一个块
	 * @return 前一个块。如果没有前一个块则返回null。
	 */
	get beforeBlock(): Block | null {
		return this._beforeBlock ?? null;
	}

	/**
	 * 设置当前块的前一个块
	 * @param block 前一个块。如果没有前一个块则传入null。
	 */
	set beforeBlock(block: Block | null) {
		this._beforeBlock = block;
	}

	private _afterBlock: Block;
	/**
	 * 获取当前块的后一个块
	 * @return 后一个块。如果没有后一个块则返回null。
	 */
	get afterBlock(): Block | null {
		return this._afterBlock;
	}

	/**
	 * 设置当前块的后一个块
	 * @param block 后一个块。如果没有后一个块则传入null。
	 */
	set afterBlock(block: Block | null) {
		this._afterBlock = block;
	}

	protected _isStartBlock: boolean;
	get isStartBlock() {
		return this._isStartBlock;
	}

	protected _isEndBlock: boolean;
	get isEndBlock() {
		return this._isEndBlock;
	}

	/**
	 * 获取第一个子块
	 * @return 第一个子块。如果没有子块则返回null。
	 */
	get firstChild(): Block | null {
		for (let block of this.children) {
			if (block.beforeBlock === null) {
				return block;
			}
		}
		return null;
	}

	/**
	 * 获取最后一个子块
	 * @return 最后一个子块。如果没有子块则返回null。
	 */
	get lastChild(): Block | null {
		for (let block of this.children) {
			if (block.afterBlock === null) {
				return block;
			}
		}
		return null;
	}

	/**
	 * 获取当前块的所有子块的平铺列表
	 * @return {Block[]} 平铺列表
	 */
	get flatChildren(): Block[] {
		return [];
	}

	/**
	 * 获取当前块的层级列表
	 * @return {Block[]} 层级列表
	 */
	get layerList(): Block[] {
		let result = [];
		let block: Block = this;
		while (block) {
			result.unshift(block);
			block = block.parent;
		}
		return result.slice(1);
	}

	/**
	 * 获取当前块的所有子块
	 * @return 子块列表
	 */
	get children(): Block[] {
		return Object.values(this._children);
	}

	get data() {
		return this._data;
	}

	/**
	 * 生成块ID
	 * @param instance 块实例
	 * @return 块ID
	 */
	static genId(instance: Block): string {
		let id = uniqueId();
		this._idMap[id] = instance;
		return id;
	}

	/**
	 * 异步获取数据
	 * @description 先返回旧数据，然后异步更新数据。
	 * @param key 数据键
	 * @param asyncGetFunc 异步获取函数
	 */
	getAsyncData(key: string, asyncGetFunc: () => Promise<string>) {
		// 更新缓存
		setTimeout(async () => {
			const newVal = await asyncGetFunc();
			if (newVal !== undefined && newVal !== this.data[key]) {
				this.data[key] = newVal;
			}
		});

		if (this.data[key]) {
			return this.data[key];
		}
	}

	/**
	 * 注册块ID
	 * @param instance 块实例
	 */
	static regId(instance: Block) {
		this._idMap[instance.id] = instance;
	}

	/**
	 * 通过ID查找块
	 * @param id 块ID
	 * @return 块。如果没有找到则返回null。
	 */
	static findBlockById(id: string | number): Block | null {
		const block = this._idMap[id];
		return block ? reactive(block) : null;
	}

	/**
	 * 通过ID移除块
	 * @param {string|number} id 块ID
	 */
	static removeBlockById(id: string | number) {
		delete this._idMap[id];
	}

	static async getAttributeTypes() {
		return {
			...await this.super?.getAttributeTypes(),
			...await Objects.resultifyObject(this.defaultAttr)
		};
	}

	getExportVariables(variables = []) {
		return variables.map(variable => {
			variable.alias = this.getVariableAlias(variable.name);
			return variable;
		});
	}

	getAllExportVariables() {
		return this.getExportVariables().concat(this.children.reduce((acc, child) => acc.concat(child.getAllExportVariables()), []));
	}

	getRootExportVariables() {
		if (this.parent) {
			return this.parent.getRootExportVariables();
		}
		return this.getAllExportVariables();
	}

	getVariableAlias(name: string | number) {
		return this._varAlias[name] ?? "";
	}

	setVariableAlias(name: string | number, alias: string) {
		this._varAlias[name] = alias;
	}

	delVariableAlias(name: string | number) {
		delete this._varAlias[name];
	}

	getRelatedResourcesManifest(resources: { [key in 'smart' | 'macro' | 'script' | 'element']?: string[] } = {}) {
		const childrenResources = this.children.map(child => child.getRelatedResourcesManifest());
		childrenResources.forEach(childResources => {
			for (let key in childResources) {
				if (resources[key]) {
					resources[key].push(...childResources[key]);
					// 去重
					resources[key] = Array.from(new Set(resources[key]));
				} else {
					resources[key] = childResources[key];
				}
			}
		});
		return resources;
	}
	/**
	 * 构建块
	 */
	async build(): Promise<void> {
		const {type: blockType} = await getMetaByBlock(this.prototype);
		this._type = blockType;

		const attributeTypes = await this.prototype.getAttributeTypes();
		for (let attrKey in attributeTypes) {
			const attrType = attributeTypes[attrKey];
			switch (attrType.type) {
				case "enum": {
					if (this.getAttribute(attrKey) === undefined) {
						this.setAttribute(attrKey, typeof attrType.defaultValue === "function" ? await attrType.defaultValue() : attrType.defaultValue);
					}
					this.data.enumOptions = attrType.options;
					break;
				}
				case "variable":
				case "string":
				case "number":
				case "boolean": {
					if (this.getAttribute(attrKey) === undefined) {
						this.setAttribute(attrKey, typeof attrType.defaultValue === "function" ? await attrType.defaultValue() : attrType.defaultValue);
					}
					break;
				}
				default:
					throw new Error(`Unknown attribute type: ${attrType.type}`);
			}
		}
	}

	/**
	 * 通过块ID获取子块
	 * @param id 块ID
	 * @return 子块。如果没有子块则返回null。
	 */
	getChild(id: number): Block | null {
		return this._children[id];
	}

	/**
	 * 设置子块
	 * @param child 子块
	 */
	setChild(child: Block) {
		this._children[child.id] = child;
	}

	/**
	 * 通过块ID移除子块
	 * @param id 子块ID
	 */
	delChild(id: string | number) {
		delete this._children[id];
	}

	/**
	 * 通过块ID获取子块
	 * @param id 块ID
	 * @return 子块。如果没有子块则返回null。
	 */
	getChildById(id: number): Block {
		if (this.getChild(id)) {
			return this.getChild(id);
		}
		for (let child of this.children) {
			let result = child.getChildById(id);
			if (result) {
				return result;
			}
		}
		return null;
	}

	/**
	 * 从尾部推入子块
	 * @param block 子块
	 */
	pushChild(block: Block) {
		block.unlink();
		if (this.lastChild) {
			block.addAfterBlock(this.lastChild);
		} else {
			block.parent = this;
			this.setChild(block);
		}
	}

	/**
	 * 从头部推入子块
	 * @param block 子块
	 */
	unshiftChild(block: Block) {
		block.unlink();
		if (this.firstChild) {
			this.firstChild.addBlockBefore(block);
		} else {
			block.parent = this;
			this.setChild(block);
		}
	}

	/**
	 * 解除当前块的所有关联
	 */
	unlink() {
		this.parent?.delChild(this.id);
		this.parent = null;
		if (this.beforeBlock) {
			this.beforeBlock.afterBlock = this.afterBlock;
		}
		if (this.afterBlock) {
			this.afterBlock.beforeBlock = this.beforeBlock;
		}
		this.beforeBlock = null;
		this.afterBlock = null;
	}

	/**
	 * 摧毁当前块
	 */
	destroy() {
		// 摧毁子块
		for (let child of this.children) {
			child.destroy();
		}
		// 移除当前块
		this.unlink();
		Block.removeBlockById(this.id);
	}

	/**
	 * 将当前块插入到目标块之前
	 * @param block 目标块
	 */
	addBeforeBlock(block: Block) {
		// console.log("addBeforeBlock", block);
		this.unlink();

		this.parent = block.parent;
		this.parent.setChild(this);

		this.afterBlock = block;
		this.beforeBlock = block.beforeBlock;
		if (block.beforeBlock) {
			block.beforeBlock.afterBlock = this;
		}
		block.beforeBlock = this;
	}

	/**
	 * 将目标块插入到当前块之前
	 * @param block 目标块
	 */
	addBlockBefore(block: Block) {
		// console.log("addBlockBefore", block);
		block.addBeforeBlock(this);
	}

	/**
	 * 将当前块插入到目标块之后
	 * @param block 目标块
	 */
	addAfterBlock(block: Block) {
		// console.log("addAfterBlock", block);
		this.unlink();

		this.parent = block.parent;
		this.parent.setChild(this);

		this.beforeBlock = block;
		this.afterBlock = block.afterBlock;
		if (block.afterBlock) {
			block.afterBlock.beforeBlock = this;
		}
		block.afterBlock = this;
	}

	/**
	 * 将目标块插入到当前块之后
	 * @param block 目标块
	 */
	addBlockAfter(block: Block) {
		// console.log("addBlockAfter", block);
		block.addAfterBlock(this);
	}

	/**
	 * 通过Key获取属性
	 * @param key 属性Key
	 * @return 属性值
	 */
	getAttribute(key: string): any {
		return this._attr[key];
	}

	/**
	 * 获取所有属性
	 * @return 属性对象
	 */
	getAllAttributes() {
		return Object.assign({}, this._attr);
	}

	/**
	 * 设置属性
	 * @param key 属性Key
	 * @param value 属性值
	 */
	setAttribute(key: string, value: any) {
		this._attr[key] = Objects.deepCopyObject(value);
	}

	/**
	 * 移除属性
	 * @param key 属性Key
	 */
	delAttribute(key: string | number) {
		delete this._attr[key];
	}
	/**
	 * 获取属性为描述文本
	 */
	parseDescriptionAttribute(key: string): { type: string, text: string } {
		let value = this.getAttribute(key);

		const defaultAttr = this.prototype.defaultAttr[key];
		if (!defaultAttr) {
			return {type: "string", text: "未知属性"};
		}

		// 判断有没有被变量代理
		const variableAgent = this.data.variableAgent ?? {};
		if (variableAgent[key] || defaultAttr.type === "variable") {
			if (value != null) {
				// 没找到变量就标红
				const rootExportVariables = this.getRootExportVariables();
				if (!rootExportVariables.find(variable => variable.alias === value)) {
					value = `<s style='color: var(--el-color-danger); font-weight: bold;'>${value}</s>`;
				}
				return {type: "variable", text: ` ${value}${DescPH.Variable} `};
			} else {
				return {
					type: "variable",
					text: ` ${defaultAttr.limit?.required ? DescPH.NeedSelect + DescPH.Variable : DescPH.Null} `
				};
			}
		} else if (defaultAttr.type === "enum") {
			if (value != null) {
				const option = defaultAttr.options.find((option: EnumOption) => option.value === value) ?? value;
				return {type: "enum", text: ` ${option?.label} `};
			} else {
				if (defaultAttr.limit?.required) {
					return {type: "enum", text: ` ${DescPH.NeedSelect} `};
				} else {
					return {type: "enum", text: ` ${DescPH.Null} `};
				}
			}
		}

		// 根据类型返回不同的描述文本
		let text: string;
		switch (typeof value) {
			case "string":
				if (!value && defaultAttr.limit?.required) {
					text = ` ${DescPH.NeedInput} `;
				} else {
					text = `“${escapeHTML(value)}”`;
				}
				break;
			case "number":
				if (value === null) {
					text = ` ${defaultAttr.limit?.required ? DescPH.NeedInput : DescPH.Null} `;
				} else {
					text = ` ${value.toString()} `;
				}
				break;
			case "boolean":
				text = value ? " 是 " : " 否 ";
				break;
			case "object":
				text = ` ${DescPH.Null} `;
				break;
			default:
				text = escapeHTML(value);
		}

		return {type: defaultAttr.type, text};
	}

	/**
	 * 获取属性为脚本文本
	 * @param key 属性Key
	 * @return 脚本代码
	 */
	parseScriptAttribute(key: string): string {
		let value = this.getAttribute(key);

		const defaultAttr = this.prototype.defaultAttr[key];
		if (!defaultAttr) {
			throw new Error(`Unknown attribute: ${key}`);
		}

		// 判断有没有被变量代理
		const variableAgent = this.data.variableAgent ?? {};
		if (variableAgent[key] || defaultAttr.type === "variable") {
			return "__VAR__." + value;
		}

		// 根据类型返回不同的脚本文本
		switch (defaultAttr.type) {
			case "enum":
				return value;
			case "string":
				return `'${escapeStringValue(value)}'`;
			case "number":
				return value?.toString() ?? "null";
			case "boolean":
				return value?.toString() ?? "null";
			default:
				throw new Error(`Unknown attribute type: ${typeof value}`);
		}
	}

	/**
	 * 获取导出变量为描述文本
	 * @param key 变量Key
	 * @return 描述文本
	 */
	parseDescriptionVariable(key: string): string | null {
		let value = escapeHTML(this.getVariableAlias(key));

		if (value) {
			return ` ${value}${DescPH.Export} `;
		} else {
			return null;
		}
	}

	/**
	 * 转为JS脚本
	 */
	toScript(_stepList: number[]) {
		return "";
	}

	packScript(stepList: number[] = []) {
		return `case "${stepList.join("-")}":{${this.toScript(stepList)}${this.getExportVariables().filter(variable => {
			const alias = this.getVariableAlias(variable.name);
			variable.alias = alias;
			return alias;
		}).map(variable => `__VAR__.${this.getVariableAlias(variable.name)} = ${variable.innerVar};`).join("\n")}}break;`;
	}
}

export class RootBlock extends Block {
	constructor() {
		super();
	}

	get flatChildren() {
		let result = [];
		let child = this.firstChild;
		while (child) {
			result.push(child);
			result.push(...child.flatChildren);
			child = child.afterBlock;
		}
		return result;
	}

	toScript(stepList: number[]) {
		let childScripts = [];

		stepList.push(0);

		let activeChild = this.firstChild;
		while (activeChild) {
			stepList[stepList.length - 1]++;
			childScripts.push(activeChild.packScript(stepList));
			activeChild = activeChild.afterBlock;
		}

		stepList.pop();
		return childScripts.join(" ");
	}

	packScript(stepList: number[] = []): string {
		return `while (__API__.__LocalScript__[__VAR__.__ID__]) { const step = stepList.join("-"); switch (step) {${this.toScript(stepList)} default: stepList.pop(); } if (stepList.length === 0) { await __API__.__FinishExecute__(__VAR__.__ID__); break; } stepList[stepList.length - 1]++; }`;
	}
}

/**
 * 调试相关
 */
export class TestBlock extends Block {
	static groupName = BlockGroupNames.Debug;

	static defaultAttr: DefaultAttrType = {
		"text": {
			type: "string",
			label: "测试文本",
			defaultValue: "Test Text",
			limit: {
				required: true,
				patterns: [
					{name: "测测你的", pattern: /test/i}
				]
			}
		}
	};

	static defaultTitle = "测试";

	constructor() {
		super();
	}

	get description() {
		const {text: text} = this.parseDescriptionAttribute("text");
		return `测试：弹出一个显有${text}的提示框`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_text",
			name: "测试文本",
			description: "一段测试文本，没有什么卵用。"
		}]);
	}

	toScript() {
		const text = this.parseScriptAttribute("text");
		return `const _text="hello";alert(${text});`;
	}
}

export class LogBlock extends Block {
	static groupName = BlockGroupNames.Debug;

	static defaultAttr: DefaultAttrType = {
		"level": {
			type: "enum",
			label: "级别",
			options: [
				{label: "日志", value: "log"},
				{label: "信息", value: "info"},
				{label: "警告", value: "warn"},
				{label: "错误", value: "error"}
			],
			defaultValue: "log",
			limit: {
				required: true
			}
		},
		"text": {
			type: "string",
			label: "内容",
			defaultValue: ""
		}
	};

	static defaultTitle = "记录日志";

	constructor() {
		super();
	}

	get description() {
		const {text: level} = this.parseDescriptionAttribute("level");
		const {text: text} = this.parseDescriptionAttribute("text");
		return `记录内容为${text}的${level}`;
	}

	toScript() {
		const level = this.parseScriptAttribute("level");
		const text = this.parseScriptAttribute("text");
		return `await console.${level}(${text});`;
	}
}

export class AlertBlock extends Block {
	static groupName = BlockGroupNames.UserInteraction;

	static defaultAttr: DefaultAttrType = {
		"text": {
			type: "string",
			label: "提示内容",
			defaultValue: ""
		}
	};

	static defaultTitle = "提示";

	constructor() {
		super();
	}

	get description() {
		const {text: text} = this.parseDescriptionAttribute("text");
		return `向用户展示${text}的提示`;
	}

	toScript() {
		const text = this.parseScriptAttribute("text");
		return `alert(${text});`;
	}
}

export class PromptBlock extends Block {
	static groupName = BlockGroupNames.UserInteraction;

	static defaultAttr: DefaultAttrType = {
		"text": {
			type: "string",
			label: "询问内容",
			defaultValue: ""
		},
		"default": {
			type: "string",
			label: "默认答案",
			defaultValue: ""
		}
	};

	static defaultTitle = "询问";

	constructor() {
		super();
	}

	get description() {
		const {text: text} = this.parseDescriptionAttribute("text");
		return `向用户询问${text}的答案`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_answer",
			name: "答案",
			description: "用户回答的内容。"
		}]);
	}

	toScript() {
		const text = this.parseScriptAttribute("text");
		const defaultAnswer = this.parseScriptAttribute("default");
		return `const _answer=prompt(${text},${defaultAnswer});`;
	}
}

export class ConfirmBlock extends Block {
	static groupName = BlockGroupNames.UserInteraction;

	static defaultAttr: DefaultAttrType = {
		"text": {
			type: "string",
			label: "确认内容",
			defaultValue: ""
		}
	};

	static defaultTitle = "确认";

	constructor() {
		super();
	}

	get description() {
		const {text: text} = this.parseDescriptionAttribute("text");
		return `向用户确认${text}是否成立`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "boolean",
			innerVar: "_isConfirmed",
			name: "确认",
			description: "用户是否确认。"
		}]);
	}

	toScript() {
		const text = this.parseScriptAttribute("text");
		return `const _isConfirmed=!!confirm(${text});`;
	}
}

/**
 * 基本运算
 */
export class CalculateNumberBlock extends Block {
	static groupName = BlockGroupNames.VariableOperation;

	static defaultAttr: DefaultAttrType = {
		"number1": {
			type: "number",
			label: "数字1",
			defaultValue: 0,
			limit: {
				required: true
			}
		},
		"operator": {
			type: "enum",
			label: "运算符",
			options: NumberOperateOptions,
			defaultValue: "+",
			limit: {
				required: true
			}
		},
		"number2": {
			type: "number",
			label: "数字2",
			defaultValue: 0,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "数学计算";

	constructor() {
		super();
	}

	get description() {
		const {text: number1} = this.parseDescriptionAttribute("number1");

		const {text: operator} = this.parseDescriptionAttribute("operator");

		const {text: number2} = this.parseDescriptionAttribute("number2");

		return `将${number1}${operator}${number2}并输出计算结果`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "number",
			innerVar: "_result",
			name: "结果",
			description: "计算结果。"
		}]);
	}

	toScript() {
		const number1 = this.parseScriptAttribute("number1");
		const operator = this.parseScriptAttribute("operator");
		const number2 = this.parseScriptAttribute("number2");
		return `const _result=${number1}${operator}${number2};`;
	}
}

export class ConcatStringBlock extends Block {
	static groupName = BlockGroupNames.VariableOperation;

	static defaultAttr: DefaultAttrType = {
		"string1": {
			type: "string",
			label: "文本1",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"string2": {
			type: "string",
			label: "文本2",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"string3": {
			type: "string",
			label: "文本3",
			defaultValue: ""
		},
		"string4": {
			type: "string",
			label: "文本4",
			defaultValue: ""
		},
		"string5": {
			type: "string",
			label: "文本5",
			defaultValue: ""
		},
		"separator": {
			type: "string",
			label: "分隔符",
			defaultValue: ""
		},
	};

	static defaultTitle = "合并文本";

	constructor() {
		super();
	}

	get description() {
		const {text: string1} = this.parseDescriptionAttribute("string1");
		const {text: string2} = this.parseDescriptionAttribute("string2");
		let {text: string3} = this.parseDescriptionAttribute("string3");
		let {text: string4} = this.parseDescriptionAttribute("string4");
		let {text: string5} = this.parseDescriptionAttribute("string5");

		if (string3 === "“”") {
			string3 = "";
		}
		if (string4 === "“”") {
			string4 = "";
		}
		if (string5 === "“”") {
			string5 = "";
		}
		const strings = {string1, string2, string3, string4, string5};

		let {text: separator} = this.parseDescriptionAttribute("separator");

		if (separator === "“”") {
			separator = "";
		}

		let description = "将文本按", isFirst = true;
		for (let key in strings) {
			if (strings[key]) {
				if (isFirst) {
					isFirst = false;
				} else {
					if (separator) {
						description += `、${separator}`;
					}
					description += "、";
				}
				description += strings[key];
			}
		}
		description += `的顺序合并`;

		const exportString = this.parseDescriptionVariable("结果");
		return description + (exportString ? exportString : "，但不导出为变量");
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_result",
			name: "结果",
			description: "合并后的文本。"
		}]);
	}

	toScript() {
		const string1 = this.parseScriptAttribute("string1");
		const string2 = this.parseScriptAttribute("string2");
		const string3 = this.parseScriptAttribute("string3");
		const string4 = this.parseScriptAttribute("string4");
		const string5 = this.parseScriptAttribute("string5");
		const separator = this.parseScriptAttribute("separator");

		return `let _result; _result = [${string1},${string2},${string3},${string4},${string5}].join(${separator});`;
	}
}

export class ReplaceStringBlock extends Block {
	static groupName = BlockGroupNames.VariableOperation;

	static defaultAttr: DefaultAttrType = {
		"target": {
			type: "variable",
			label: "目标",
			defaultValue: null,
			limit: {
				type: "string",
				required: true
			}
		},
		"search": {
			type: "string",
			label: "查找",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"replace": {
			type: "string",
			label: "替换",
			defaultValue: "",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "替换文本";

	constructor() {
		super();
	}

	get description() {
		const {text: target} = this.parseDescriptionAttribute("target");
		const {text: search} = this.parseDescriptionAttribute("search");
		const {text: replace} = this.parseDescriptionAttribute("replace");
		return `将${target}中的${search}替换为${replace}并输出结果`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_result",
			name: "结果",
			description: "替换后的文本。"
		}]);
	}

	toScript() {
		const target = this.parseScriptAttribute("target");
		const search = this.parseScriptAttribute("search");
		const replace = this.parseScriptAttribute("replace");
		return `const _result=${target}.replace(${search},${replace});`;
	}

}

export class CreateNumberBlock extends Block {
	static groupName = BlockGroupNames.VariableOperation;

	static defaultAttr: DefaultAttrType = {
		"number": {
			type: "number",
			label: "数字",
			defaultValue: 0
		}
	};

	static defaultTitle = "创建数字";

	constructor() {
		super();
	}

	get description() {
		const {text: number} = this.parseDescriptionAttribute("number");
		const exportNumber = this.parseDescriptionVariable("结果");
		return `创建初始值为${number}的数字` + (exportNumber ? exportNumber : "，但不导出为变量");
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "number",
			innerVar: "_result",
			name: "结果",
			description: "创建的数字。"
		}]);
	}

	toScript() {
		const number = this.parseScriptAttribute("number");
		return `const _result=${number};`;
	}
}

export class RandomNumberBlock extends Block {
	static groupName = BlockGroupNames.VariableOperation;

	static defaultAttr: DefaultAttrType = {
		"min": {
			type: "number",
			label: "最小值",
			defaultValue: 0
		},
		"max": {
			type: "number",
			label: "最大值",
			defaultValue: 100
		}
	};

	static defaultTitle = "创建数字（随机）";

	constructor() {
		super();
	}

	get description() {
		const {text: min} = this.parseDescriptionAttribute("min");
		const {text: max} = this.parseDescriptionAttribute("max");
		const exportNumber = this.parseDescriptionVariable("结果");
		return `生成范围在${min}到${max}之间的随机数` + (exportNumber ? exportNumber : "，但不导出为变量");
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "number",
			innerVar: "_result",
			name: "结果",
			description: "生成的随机数。"
		}]);
	}

	toScript() {
		const min = this.parseScriptAttribute("min");
		const max = this.parseScriptAttribute("max");
		return `const _result=Math.floor(Math.random()*(${max}-${min}+1)+${min});`;
	}
}

export class GetDatetimeBlock extends Block {
	static groupName = BlockGroupNames.SystemOperation;

	static defaultAttr: DefaultAttrType = {
		"type": {
			type: "enum",
			label: "类型",
			defaultValue: null,
			options: [
				{label: "日期", value: "date"},
				{label: "时间", value: "time"},
				{label: "日期和时间", value: "datetime"}
			],
			limit: {
				required: true
			}
		},
		// 12或24小时制
		"format": {
			type: "enum",
			label: "制式",
			options: [
				{label: "12小时制", value: "12hour"},
				{label: "24小时制", value: "24hour"}
			],
			defaultValue: "24hour",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "获取系统时间";

	constructor() {
		super();
	}

	get description() {
		const {text: type} = this.parseDescriptionAttribute("type");
		const {text: format} = this.parseDescriptionAttribute("format");
		const exportDatetime = this.parseDescriptionVariable("结果");
		return `获取当前${format}的${type}` + (exportDatetime ? exportDatetime : "，但不导出为变量");
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_result",
			name: "结果",
			description: "当前的日期和时间。"
		}]);
	}

	toScript() {
		const type = this.parseScriptAttribute("type");
		const timeFormat = this.parseScriptAttribute("format");

		let format = "";
		switch (type) {
			case "date":
				format = "{year:'numeric',month:'2-digit',day:'2-digit'}";
				break;
			case "time":
				format = "{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}";
				break;
			case "datetime":
				format = "{hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}";
				break;
		}

		if (timeFormat === "12hour") {
			format = format.replace(/hour12:false,/, "");
		}

		return `const _result=new Date().toLocaleString('zh-CN',${format});`;
	}
}

/**
 * 流程控制
 */
export class IfBlock extends Block {
	static defaultTitle = "比较";
	private readonly _endIfBlock: EndIfBlock;
	constructor() {
		super();

		this._isStartBlock = true;

		this._endIfBlock = new EndIfBlock(this);
	}

	get description() {
		return "可惜没如果";
	}

	get lightColor() {
		return "#CCFFFF";
	}

	get darkColor() {
		return "#38494C";
	}

	get endIfBlock() {
		return this._endIfBlock;
	}

	get flatChildren() {
		let result = [];
		let child = this.firstChild;
		while (child) {
			result.push(child);
			result.push(...child.flatChildren);
			child = child.afterBlock;
		}
		result.push(this.endIfBlock);
		return result;
	}

	addBlockAfter(block: Block) {
		this.unshiftChild(block);
	}

	toScript(_stepList: number[], condition?: string) {
		if (!condition) {
			throw new Error("IfBlock.toScript: condition is required.");
		}

		return `const _result = (${condition}); if (_result) { stepList.push(0); } else { stepList.push(-1); }`;
	}

	packScript(stepList: number[] = []): string {
		stepList.push(0);

		let childScripts = [];

		let activeChild = this.firstChild;
		while (activeChild) {
			stepList[stepList.length - 1]++;
			childScripts.push(activeChild.packScript(stepList));
			activeChild = activeChild.afterBlock;
		}

		stepList.pop();

		return super.packScript(stepList) + childScripts.join(" ");
	}
}

export class IfStringBlock extends IfBlock {
	static groupName = BlockGroupNames.FlowControl;

	static defaultAttr: DefaultAttrType = {
		"string1": {
			type: "string",
			label: "文本1",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"condition": {
			type: "enum",
			label: "条件",
			options: StringCompareOptions,
			defaultValue: "==",
			limit: {
				required: true
			}
		},
		"string2": {
			type: "string",
			label: "文本2",
			defaultValue: ""
		}
	};

	static defaultTitle = "比较（文本）";

	constructor() {
		super();
	}

	get description() {
		const {text: string1} = this.parseDescriptionAttribute("string1");
		const {text: condition} = this.parseDescriptionAttribute("condition");
		const {text: string2} = this.parseDescriptionAttribute("string2");
		return `如果满足${string1}${condition}${string2}则执行内部块`;
	}

	toScript(stepList?: number[]) {
		const string1 = this.parseScriptAttribute("string1");
		const condition = this.parseScriptAttribute("condition");
		const string2 = this.parseScriptAttribute("string2");
		return super.toScript(stepList, `${string1}${condition}${string2}`);
	}
}

export class IfNumberBlock extends IfBlock {
	static groupName = BlockGroupNames.FlowControl;

	static defaultAttr: DefaultAttrType = {
		"number1": {
			type: "number",
			label: "数字1",
			defaultValue: 0,
			limit: {
				required: true
			}
		},
		"condition": {
			type: "enum",
			label: "条件",
			options: NumberCompareOptions,
			defaultValue: "==",
			limit: {
				required: true
			}
		},
		"number2": {
			type: "number",
			label: "数字2",
			defaultValue: 0
		}
	};

	static defaultTitle = "比较（数字）";

	constructor() {
		super();
	}

	get description() {
		const {text: number1} = this.parseDescriptionAttribute("number1");
		const {text: condition} = this.parseDescriptionAttribute("condition");
		const {text: number2} = this.parseDescriptionAttribute("number2");
		return `如果满足${number1}${condition}${number2}则执行内部块`;
	}

	toScript(stepList: number[]) {
		const number1 = this.parseScriptAttribute("number1");
		const condition = this.parseScriptAttribute("condition");
		const number2 = this.parseScriptAttribute("number2");
		return super.toScript(stepList, `${number1}${condition}${number2}`);
	}
}

export class IfBooleanBlock extends IfBlock {
	static groupName = BlockGroupNames.FlowControl;

	static defaultAttr: DefaultAttrType = {
		"boolean1": {
			type: "boolean",
			label: "是非1",
			defaultValue: true,
			limit: {
				required: true
			}
		},
		"condition": {
			type: "enum",
			label: "条件",
			options: BooleanCompareOptions,
			defaultValue: "==",
			limit: {
				required: true
			}
		},
		"boolean2": {
			type: "boolean",
			label: "是非2",
			defaultValue: false,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "比较（是非）";

	constructor() {
		super();
	}

	get description() {
		const {text: boolean1} = this.parseDescriptionAttribute("boolean1");
		const {text: condition} = this.parseDescriptionAttribute("condition");
		const {text: boolean2} = this.parseDescriptionAttribute("boolean2");

		return `如果满足${boolean1}${condition}${boolean2}则执行内部块`;
	}

	toScript(stepList: number[]) {
		const boolean1 = this.parseScriptAttribute("boolean1");
		const condition = this.parseScriptAttribute("condition");
		const boolean2 = this.parseScriptAttribute("boolean2");
		return super.toScript(stepList, `${boolean1}${condition}${boolean2}`);
	}
}

export class IfExistBlock extends IfBlock {
	static groupName = BlockGroupNames.FlowControl;

	static defaultAttr: DefaultAttrType = {
		"variable": {
			type: "variable",
			label: "变量",
			defaultValue: null,
			limit: {
				required: true
			}
		},
		"condition": {
			type: "enum",
			label: "条件",
			options: [
				{label: "存在", value: true},
				{label: "不存在", value: false}
			],
			defaultValue: true,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "判断（存在性）";

	constructor() {
		super();
	}

	get description() {
		const {text: variable} = this.parseDescriptionAttribute("variable");
		const {text: condition} = this.parseDescriptionAttribute("condition");
		return `如果${variable}${condition}则执行内部块`;
	}

	toScript(stepList: number[]) {
		const variable = this.parseScriptAttribute("variable");
		const condition = this.parseScriptAttribute("condition");
		return super.toScript(stepList, `${variable} != null === ${condition} && ${variable} !== "" === ${condition}`);
	}
}

export class IfContainBlock extends IfBlock {
	static groupName = BlockGroupNames.FlowControl;

	static defaultAttr: DefaultAttrType = {
		"string": {
			type: "string",
			label: "文本",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"search": {
			type: "string",
			label: "查找",
			defaultValue: "",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "判断（包含）";

	constructor() {
		super();
	}

	get description() {
		const {text: string} = this.parseDescriptionAttribute("string");
		const {text: search} = this.parseDescriptionAttribute("search");
		return `如果${string}包含${search}则执行内部块`;
	}

	toScript(stepList: number[]) {
		const string = this.parseScriptAttribute("string");
		const search = this.parseScriptAttribute("search");
		return super.toScript(stepList, `${string}?.includes(${search})`);
	}
}

export class IfVisibleBlock extends IfBlock {
	static groupName = BlockGroupNames.FlowControl;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				required: true
			}
		},
		"condition": {
			type: "enum",
			label: "条件",
			options: [
				{label: "可见", value: true},
				{label: "不可见", value: false}
			],
			defaultValue: true,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "判断（可见性）";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		const {text: condition} = this.parseDescriptionAttribute("condition");
		return `如果${element}在页面中${condition}则执行内部块`;
	}

	toScript(stepList: number[]) {
		const element = this.parseScriptAttribute("element");
		const condition = this.parseScriptAttribute("condition");
		return super.toScript(stepList, `!${condition ? "!" : ""}${element}?.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})`);
	}
}

export class ElseBlock extends Block {
	static groupName = BlockGroupNames.FlowControl;

	static defaultTitle = "否则";

	constructor() {
		super();
	}

	get lightColor() {
		return "#CCFFFF";
	}

	get darkColor() {
		return "#38494C";
	}

	get description() {
		if (this.parent instanceof IfBlock) {
			return "如果条件成立，则执行上方的代码块，否则执行下方的代码块";
		} else {
			return "<span style='color: var(--el-color-danger); font-weight: bold;'>这个块现在不起作用，它应该被放在“比较”或“判断”块内部</span>";
		}
	}

	toScript(stepList: number[]) {
		if (this.parent instanceof IfBlock) {
			const copyStepList = Objects.deepCopyObject(stepList);
			copyStepList[copyStepList.length - 1] = 0;
			return `case "${copyStepList.join("-")}": stepList[stepList.length - 1] = ${stepList[stepList.length - 1]} + 1;`;
		} else {
			return "";
		}
	}

	packScript(stepList: number[] = []) {
		return this.toScript(stepList);
	}
}

export class EndIfBlock extends Block {
	private readonly _ifBlock: IfBlock;

	constructor(ifBlock: IfBlock) {
		super();

		this._bid = ifBlock.id;

		this._isEndBlock = true;

		this._ifBlock = ifBlock;
	}

	get lightColor() {
		return "#CCFFFF";
	}

	get darkColor() {
		return "#38494C";
	}

	get title() {
		return "";
	}

	get description() {
		return "";
	}

	get ifBlock() {
		return this._ifBlock;
	}

	get layerList() {
		return this.ifBlock.layerList;
	}

	get parent() {
		return this.ifBlock.parent;
	}

	set parent(_block) {
		throw new Error("EndIfBlock.parent is readonly");
	}

	get beforeBlock() {
		return this.ifBlock.beforeBlock;
	}

	set beforeBlock(_block) {
		throw new Error("EndIfBlock.beforeBlock is readonly");
	}

	get afterBlock() {
		return this.ifBlock.afterBlock;
	}

	set afterBlock(_block) {
		throw new Error("EndIfBlock.afterBlock is readonly");
	}

	addBeforeBlock(block: Block) {
		this.ifBlock.addBeforeBlock(block);
		// console.log("addBeforeBlock", block);
	}

	addBlockBefore(block: Block) {
		this.ifBlock.pushChild(block);
		// console.log("addBlockBefore", block);
	}

	addAfterBlock(block: Block) {
		this.ifBlock.addAfterBlock(block);
		// console.log("addAfterBlock", block);
	}

	addBlockAfter(block: Block) {
		block.addAfterBlock(this.ifBlock);
		// console.log("addBlockAfter", block);
	}

	unlink() {
		this.ifBlock.unlink();
	}
}

export class LoopBlock extends Block {
	static groupName = BlockGroupNames.FlowControl;

	static defaultTitle = "循环";

	private readonly _endLoopBlock: EndLoopBlock;

	constructor() {
		super();

		this._isStartBlock = true;

		this._endLoopBlock = new EndLoopBlock(this);
	}

	get description() {
		return "循环执行内部块直到终止";
	}

	get lightColor() {
		return "#FFFFCC";
	}

	get darkColor() {
		return "#4C4838";
	}

	get endLoopBlock() {
		return this._endLoopBlock;
	}

	get flatChildren() {
		let result = [];
		let child = this.firstChild;
		while (child) {
			result.push(child);
			result.push(...child.flatChildren);
			child = child.afterBlock;
		}
		result.push(this.endLoopBlock);
		return result;
	}

	addBlockAfter(block: Block) {
		this.unshiftChild(block);
	}

	toScript(_stepList: number[]) {
		return `stepList.push(0);`;
	}

	packScript(stepList: number[] = []): string {
		stepList.push(0);

		let childScripts = [];

		let activeChild = this.firstChild;
		while (activeChild) {
			stepList[stepList.length - 1]++;
			childScripts.push(activeChild.packScript(stepList));
			activeChild = activeChild.afterBlock;
		}

		stepList[stepList.length - 1]++;
		const lastStep = stepList.join("-");
		stepList.pop();

		return super.packScript(stepList) + childScripts.join(" ") + `case "${lastStep}": stepList[stepList.length - 1] = 0; break;`;
	}
}

export class EndLoopBlock extends Block {
	private readonly _loopBlock: LoopBlock;

	constructor(loopBlock: LoopBlock) {
		super();

		this._bid = loopBlock.id;

		this._isEndBlock = true;

		this._loopBlock = loopBlock;
	}

	get title() {
		return "";
	}

	get description() {
		return "";
	}

	get lightColor() {
		return "#FFFFCC";
	}

	get darkColor() {
		return "#4C4838";
	}

	get loopBlock() {
		return this._loopBlock;
	}

	get layerList() {
		return this.loopBlock.layerList;
	}

	get parent() {
		return this.loopBlock.parent;
	}

	set parent(_block) {
		throw new Error("EndLoopBlock.parent is readonly");
	}

	get beforeBlock() {
		return this.loopBlock.beforeBlock;
	}

	set beforeBlock(_block) {
		throw new Error("EndLoopBlock.beforeBlock is readonly");
	}

	get afterBlock() {
		return this.loopBlock.afterBlock;
	}

	set afterBlock(_block) {
		throw new Error("EndLoopBlock.afterBlock is readonly");
	}

	addBeforeBlock(block: Block) {
		this.loopBlock.addBeforeBlock(block);
	}

	addBlockBefore(block: Block) {
		this.loopBlock.pushChild(block);
	}

	addAfterBlock(block: Block) {
		this.loopBlock.addAfterBlock(block);
	}

	addBlockAfter(block: Block) {
		block.addAfterBlock(this.loopBlock);
	}

	unlink() {
		this.loopBlock.unlink();
	}
}

export class BreakBlock extends Block {
	static groupName = BlockGroupNames.FlowControl;

	static defaultTitle = "循环（结束）";

	constructor() {
		super();
	}

	get description() {
		let parent = this.parent;
		while (parent) {
			if (parent instanceof LoopBlock) {
				break;
			}
			parent = parent.parent;
		}
		if (parent) {
			return "结束整个循环";
		} else {
			return "<span style='color: var(--el-color-danger); font-weight: bold;'>这个块现在不起作用，它应该被放在“循环”块内部</span>";
		}
	}

	get lightColor() {
		return "#FFFFCC";
	}

	get darkColor() {
		return "#4C4838";
	}

	toScript() {
		let layer = 0;
		let parent = this.parent;
		while (parent) {
			if (parent instanceof LoopBlock) {
				break;
			}
			layer++;
			parent = parent.parent;
		}
		if (parent) {
			return `stepList.splice(-${layer}, ${layer}); stepList[stepList.length - 1]=-1;`;
		} else {
			return "";
		}
	}
}

export class ContinueBlock extends Block {
	static groupName = BlockGroupNames.FlowControl;

	static defaultTitle = "循环（跳过）";

	constructor() {
		super();
	}

	get description() {
		let parent = this.parent;
		while (parent) {
			if (parent instanceof LoopBlock) {
				break;
			}
			parent = parent.parent;
		}
		if (parent) {
			return "结束本次循环，然后进入下一次循环";
		} else {
			return "<span style='color: var(--el-color-danger); font-weight: bold;'>这个块现在不起作用，它应该被放在“循环”块内部</span>";
		}
	}

	get lightColor() {
		return "#FFFFCC";
	}

	get darkColor() {
		return "#4C4838";
	}

	toScript() {
		let layer = 0;
		let parent = this.parent;
		while (parent) {
			if (parent instanceof LoopBlock) {
				break;
			}
			layer++;
			parent = parent.parent;
		}
		if (parent) {
			return `stepList.splice(-${layer}, ${layer}); stepList[stepList.length - 1]=0;`;
		} else {
			return "";
		}
	}
}

export class ExitBlock extends Block {
	static groupName = BlockGroupNames.FlowControl;

	static defaultTitle = "脚本（停止）";

	constructor() {
		super();
	}

	get description() {
		return "停止脚本的运行";
	}

	get lightColor() {
		return "#FFCCCC";
	}

	get darkColor() {
		return "#4C3838";
	}

	toScript() {
		return "stepList.splice(0, stepList.length, Infinity);";
	}
}

/**
 * 自动化
 */
export class MacroBlock extends Block {
	static groupName = BlockGroupNames.Automation;

	static defaultAttr: DefaultAttrType = {
		"macroId": {
			type: "enum",
			label: "目标宏",
			options: async () => (await storage.getKey("Macro.List") ?? []).map(macro => ({
				label: macro.name,
				value: macro.id
			})),
			defaultValue: null,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "宏";

	constructor() {
		super();
	}

	get description() {
		const macroId = this.getAttribute("macroId");
		if (!macroId) {
			const {text} = this.parseDescriptionAttribute("macroId");
			return `运行 ${text} 宏`;
		}

		const macroName = this.getAsyncData("macroName", async () => {
			const macroList = await storage.getKey('Macro.List') ?? [];
			const macro = macroList.find(macro => macro.id === macroId);
			if (macro) {
				return escapeHTML(macro.name);
			} else {
				return `<s style="color: var(--el-color-danger); font-weight: bold;">${macroId}</s>`;
			}
		});

		return `运行 ${macroName} 宏`;
	}

	getRelatedResourcesManifest() {
		return super.getRelatedResourcesManifest({
			macro: [this.getAttribute("macroId")]
		});
	}

	toScript() {
		const macroId = this.parseScriptAttribute("macroId");
		return `await __API__.__ExecuteMacro__('${macroId}');`;
	}

	packScript(stepList: number[] = []) {
		const macroId = this.parseScriptAttribute("macroId");
		const first = `case "${stepList.join("-")}":{ __TEMP__['Macro.'+__VAR__.__ID__] = true; __VAR__.__MacroExecuting__ = true; } break;`;
		stepList[stepList.length - 1]++;
		const sec = `case "${stepList.join("-")}":{ if(__VAR__.__MacroExecuting__) { stepList[stepList.length - 1]--; if(__TEMP__['Macro.'+__VAR__.__ID__]) { ${this.toScript()} } else { await __WaitMacroExecute__('${macroId}'); } __VAR__.__MacroExecuting__ = false; } } break;`;
		return first + sec;
	}
}

export class SmartBlock extends Block {
	static groupName = BlockGroupNames.Automation;

	static defaultAttr: DefaultAttrType = {
		"smartId": {
			type: "enum",
			label: "目标函数",
			options: async () => (await storage.getKey("Smart.List") ?? []).map(smart => ({
				label: smart.name,
				value: smart.id
			})),
			defaultValue: null,
			limit: {
				required: true
			}
		},
		"smartInputValue": {
			type: "variable",
			label: "输入变量",
			defaultValue: null
		}
	};

	static defaultTitle = "AI 函数";

	constructor() {
		super();
	}

	get description() {
		const smartId = this.getAttribute("smartId");

		if (!smartId) {
			const {text} = this.parseDescriptionAttribute("smartId");
			return `运行 ${text} 函数`;
		}

		const smartName = this.getAsyncData("smartName", async () => {
			const smartList = await storage.getKey('Smart.List') ?? [];
			const smart = smartList.find(smart => smart.id === smartId);
			if (smart) {
				return escapeHTML(smart.name);
			} else {
				return `<s style="color: var(--el-color-danger); font-weight: bold;">${smartId}</s>`;
			}
		});

		return `运行 ${smartName} 函数`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: null,
			innerVar: "_smartOutputValue",
			name: "返回值",
			description: "函数输出的数值。"
		}]);
	}

	getRelatedResourcesManifest() {
		return super.getRelatedResourcesManifest({
			smart: [this.getAttribute("smartId")]
		});
	}

	toScript() {
		let code = this.getAttribute("smartCode");
		let inputValue = this.parseScriptAttribute("smartInputValue");
		return `const _smartOutputValue = (${code})(${inputValue});`;
	}
}

/**
 * 数据操作
 */
// 数据（简单对象），导出变量“数据”
export class CreateDataBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultTitle = "创建数据";

	constructor() {
		super();
	}

	get description() {
		const exportData = this.parseDescriptionVariable("数据");
		return exportData ? `创建空数据${exportData}` : "创建数据，但不导出为变量";
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "data",
			innerVar: "_data",
			name: "数据",
			description: "用于存储和导出数据。"
		}]);
	}

	toScript() {
		return `const _data={};`;
	}
}

// 编辑数据（字符串）
export class EditStringDataBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "数据",
			defaultValue: null,
			limit: {
				type: "data",
				required: true
			}
		},
		"key": {
			type: "string",
			label: "标题",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"value": {
			type: "string",
			label: "内容",
			defaultValue: ""
		}
	};

	static defaultTitle = "编辑数据（文本）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		const {text: key} = this.parseDescriptionAttribute("key");
		const {text: value} = this.parseDescriptionAttribute("value");
		return `设置${data}的${key}为${value}`;
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		const key = this.parseScriptAttribute("key");
		const value = this.parseScriptAttribute("value");
		return `${data}[${key}]=${value};`;
	}
}

// 编辑数据（数字）
export class EditNumberDataBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "数据",
			defaultValue: null,
			limit: {
				type: "data",
				required: true
			}
		},
		"key": {
			type: "string",
			label: "标题",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"value": {
			type: "number",
			label: "数值",
			defaultValue: 0,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "编辑数据（数字）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		const {text: key} = this.parseDescriptionAttribute("key");
		const {text: value} = this.parseDescriptionAttribute("value");
		return `设置${data}的${key}为${value}`;
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		const key = this.parseScriptAttribute("key");
		const value = this.parseScriptAttribute("value");
		return `${data}[${key}]=${value};`;
	}
}

// 编辑数据（是非）
export class EditBooleanDataBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "数据",
			defaultValue: null,
			limit: {
				type: "data",
				required: true
			}
		},
		"key": {
			type: "string",
			label: "标题",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"value": {
			type: "boolean",
			label: "数值",
			defaultValue: false
		}
	};

	static defaultTitle = "编辑数据（是非）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		const {text: key} = this.parseDescriptionAttribute("key");
		const {text: value} = this.parseDescriptionAttribute("value");
		return `设置${data}的${key}为${value}`;
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		const key = this.parseScriptAttribute("key");
		const value = this.parseScriptAttribute("value");
		return `${data}[${key}]=${value};`;
	}
}

// 集合（数组）
export class CreateListBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultTitle = "创建集合";

	constructor() {
		super();
	}

	get description() {
		const exportList = this.parseDescriptionVariable("集合");
		return exportList ? `创建空集合${exportList}` : `创建集合，但不导出为变量`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "list",
			innerVar: "_list",
			name: "集合",
			description: "用于整合分散的数据。"
		}]);
	}

	toScript() {
		return `const _list=[];`;
	}
}

// 向集合尾部添加数据
export class SetListByPushBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "集合",
			defaultValue: null,
			limit: {
				type: "list",
				required: true
			}
		},
		"value": {
			type: "variable",
			label: "数据",
			defaultValue: null,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "编辑集合（尾部添加数据）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		const {text: value} = this.parseDescriptionAttribute("value");
		return `向${data}的尾部添加${value}`;
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		const value = this.parseScriptAttribute("value");
		return `${data}.push(${value});`;
	}
}

// 从集合尾部删除数据
export class TakeListByPopBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "集合",
			defaultValue: null,
			limit: {
				type: "list",
				required: true
			}
		},
		"type": {
			type: "enum",
			label: "类型",
			options: VariableTypeOptions,
			defaultValue: "string",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "编辑集合（尾部取出数据）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		return `从${data}中取出最后一个数据`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: this.getAttribute("type"),
			innerVar: "_data",
			name: "数据",
			description: ""
		}]);
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		return `const _data=${data}.pop();`;
	}
}

// 从集合中取出指定index的数据
export class TakeListByIndexBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "集合",
			defaultValue: null,
			limit: {
				type: "list",
				required: true
			}
		},
		"index": {
			type: "number",
			label: "位置",
			defaultValue: 1,
			limit: {
				required: true,
				min: 1
			}
		},
		"type": {
			type: "enum",
			label: "类型",
			options: VariableTypeOptions,
			defaultValue: "string",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "编辑集合（指定位置取出数据）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		const {text: index} = this.parseDescriptionAttribute("index");
		return `从${data}中删除第${index}个数据`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: this.getAttribute("type"),
			innerVar: "_data",
			name: "数据",
			description: ""
		}]);
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		const index = this.parseScriptAttribute("index");
		return `const _data=${data}.splice(${index}-1,1);`;
	}
}

// 从指定位置插入数据
export class SetListByIndexBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "集合",
			defaultValue: null,
			limit: {
				type: "list",
				required: true
			}
		},
		"index": {
			type: "number",
			label: "位置",
			defaultValue: 1,
			limit: {
				required: true,
				min: 1
			}
		},
		"value": {
			type: "variable",
			label: "数据",
			defaultValue: null,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "编辑集合（指定位置插入数据）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		const {text: index} = this.parseDescriptionAttribute("index");
		const {text: value} = this.parseDescriptionAttribute("value");
		return `向${data}的第${index}个位置插入${value}`;
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		const index = this.parseScriptAttribute("index");
		const value = this.parseScriptAttribute("value");
		return `${data}.splice(${index}-1,0,${value});`;
	}
}

// 从指定位置获取数据
export class GetListByIndexBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"data": {
			type: "variable",
			label: "集合",
			defaultValue: null,
			limit: {
				type: "list",
				required: true
			}
		},
		"index": {
			type: "number",
			label: "位置",
			defaultValue: 1,
			limit: {
				required: true,
				min: 1
			}
		},
		"type": {
			type: "enum",
			label: "类型",
			options: VariableTypeOptions,
			defaultValue: "string",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "读取集合（指定位置数据）";

	constructor() {
		super();
	}

	get description() {
		const {text: data} = this.parseDescriptionAttribute("data");
		const {text: index} = this.parseDescriptionAttribute("index");
		const {text: type} = this.parseDescriptionAttribute("type");

		return `获取${data}的第${index}个类型为${type}的数据`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: this.getAttribute("type"),
			innerVar: "_data",
			name: "数据",
			description: ""
		}]);
	}

	toScript() {
		const data = this.parseScriptAttribute("data");
		const index = this.parseScriptAttribute("index");
		return `const _data=${data}[${index}-1];`;
	}
}

// 保存数据
export class SaveDataBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"name": {
			type: "string",
			label: "名称",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"data": {
			type: "variable",
			label: "数据",
			defaultValue: null,
			limit: {
				type: "data",
				required: true
			}
		}
	};

	static defaultTitle = "保存数据";

	constructor() {
		super();
	}

	get description() {
		const {text: name} = this.parseDescriptionAttribute("name");
		const {text: data} = this.parseDescriptionAttribute("data");
		return `保存${data}为${name}`;
	}

	toScript() {
		const name = this.parseScriptAttribute("name");
		const data = this.parseScriptAttribute("data");
		return `await __API__.__SaveData__(${name},${data});`;
	}
}

// 保存集合
export class SaveListBlock extends Block {
	static groupName = BlockGroupNames.DataOperation;

	static defaultAttr: DefaultAttrType = {
		"name": {
			type: "string",
			label: "名称",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"data": {
			type: "variable",
			label: "数据",
			defaultValue: null,
			limit: {
				type: "list",
				required: true
			}
		}
	};

	static defaultTitle = "保存集合";

	constructor() {
		super();
	}

	get description() {
		const {text: name} = this.parseDescriptionAttribute("name");
		const {text: data} = this.parseDescriptionAttribute("data");
		return `保存${data}为${name}`;
	}

	toScript() {
		const name = this.parseScriptAttribute("name");
		const data = this.parseScriptAttribute("data");
		return `await __API__.__SaveList__(${name},${data});`;
	}
}

/**
 * 元素相关
 */
// 获取网页中所有的某种元素
export class GetElementListByTypeFromDocumentBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"type": {
			type: "enum",
			label: "类型",
			options: BaseElementSelectorOptions,
			defaultValue: "*",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "获取网页元素（指定类型）";

	constructor() {
		super();
	}

	get description() {
		const {text: type} = this.parseDescriptionAttribute("type");

		return `获取网页中所有的${type}`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "list",
			innerVar: "_elements",
			name: "元素集合",
			description: ""
		}]);
	}

	toScript() {
		const type = this.parseScriptAttribute("type");
		return `const _elements=document.querySelectorAll('${type}');`;
	}
}

// 获取元素的文本内容
export class GetElementContentBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		}
	};

	static defaultTitle = "获取元素信息（文本内容）";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		return `获取${element}的文本内容`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_text",
			name: "文本",
			description: ""
		}]);
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		return `const _text=${element}.textContent ?? ${element}.value;`;
	}
}

// 隐藏元素
export class HideElementBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		}
	};

	static defaultTitle = "隐藏元素";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		return `隐藏${element}`;
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		return `${element}.style.oldDisplay=${element}.style.display;${element}.style.display='none';`;
	}
}

// 显示元素
export class ShowElementBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		}
	};

	static defaultTitle = "显示元素";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		return `显示${element}`;
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		return `${element}.style.display=${element}.style.oldDisplay;delete ${element}.style.oldDisplay;`;
	}
}

// 设置元素的不透明度
export class SetElementOpacityBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		},
		"opacity": {
			type: "number",
			label: "不透明度(%)",
			defaultValue: 100,
			limit: {
				required: true,
				min: 0,
				max: 100
			}
		}
	};

	static defaultTitle = "编辑元素（不透明度）";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		const {type: opacityType, text: opacity} = this.parseDescriptionAttribute("opacity");
		return `设置${element}的不透明度为${opacityType === 'variable' ? opacity : opacity + '%'}`;
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		const opacity = this.parseScriptAttribute("opacity");
		return `${element}.style.opacity=${opacity}/100;`;
	}
}

// 设置元素的文本内容
export class SetElementContentBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		},
		"text": {
			type: "string",
			label: "文本",
			defaultValue: ""
		}
	};

	static defaultTitle = "编辑元素（文本内容）";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		const {text: text} = this.parseDescriptionAttribute("text");
		return `设置${element}的文本内容为${text}`;
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		const text = this.parseScriptAttribute("text");
		return `${element}.value!==undefined?${element}.value=${text}:${element}.textContent=${text};`;
	}
}

// 设置元素的密码内容
export class SetElementPasswordBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		},
		"password": {
			type: "string",
			label: "密码",
			defaultValue: ""
		}
	};

	static defaultTitle = "编辑元素（密码内容）";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		const {text: password} = this.parseDescriptionAttribute("password");
		return `设置${element}的密码内容为${password.replace(/“(.+)”/, '“******”')}`;
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		const password = this.parseScriptAttribute("password");
		return `${element}.value=${password};`;
	}
}

// 移除元素
export class RemoveElementBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		}
	};

	static defaultTitle = "移除元素";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		return `移除${element}`;
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		return `${element}.remove();`;
	}
}

// 获取捕获的元素
export class GetElementByCaptureBlockFromDocument extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"elementId": {
			type: "enum",
			label: "目标元素",
			options: async () => (await storage.getKey("Element.List") ?? []).map(element => ({
				label: element.name,
				value: element.id
			})),
			defaultValue: null,
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "获取网页元素（已捕获）";

	constructor() {
		super();
	}

	get description() {
		const elementId = this.getAttribute("elementId");
		if (!elementId) {
			const {text} = this.parseDescriptionAttribute("elementId");
			return `获取捕获的 ${text} 元素`;
		}

		const elementName = this.getAsyncData("elementName", async () => {
			const elementList = await storage.getKey('Element.List') ?? [];
			const element = elementList.find(element => element.id === elementId);
			if (element) {
				return escapeHTML(element.name);
			} else {
				return `<s style="color: var(--el-color-danger); font-weight: bold;">${elementId}</s>`;
			}
		});

		return `获取捕获的 ${elementName} 元素`;
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "Element",
			innerVar: "_element",
			name: "元素",
			description: ""
		}]);
	}

	getRelatedResourcesManifest() {
		return super.getRelatedResourcesManifest({
			element: [this.getAttribute("elementId")]
		});
	}

	toScript() {
		const elementId = this.parseScriptAttribute("elementId");
		return `const _element=await __API__.__GetCapturedElement__('${elementId}');`;
	}
}

// 点击元素
export class ClickElementBlock extends Block {
	static groupName = BlockGroupNames.ElementOperation;

	static defaultAttr: DefaultAttrType = {
		"element": {
			type: "variable",
			label: "元素",
			defaultValue: null,
			limit: {
				type: "Element",
				required: true
			}
		}
	};

	static defaultTitle = "点击元素";

	constructor() {
		super();
	}

	get description() {
		const {text: element} = this.parseDescriptionAttribute("element");
		return `点击${element}`;
	}

	toScript() {
		const element = this.parseScriptAttribute("element");
		return `${element}.click();`;
	}
}

/**
 * 导航
 */
// 打开网页
export class OpenUrlBlock extends Block {
	static groupName = BlockGroupNames.PageNavigation;

	static defaultAttr: DefaultAttrType = {
		"url": {
			type: "string",
			label: "网址",
			defaultValue: "",
			limit: {
				required: true
			}
		},
		"position": {
			type: "enum",
			label: "位置",
			options: [
				{label: "新的页面", value: "newTab"},
				{label: "当前页面", value: "currentTab"},
				{label: "新的窗口", value: "newWindow"}
			],
			defaultValue: "newTab",
			limit: {
				required: true
			}
		}
	};

	static defaultTitle = "打开网页";

	constructor() {
		super();
	}

	get description() {
		const {text: url} = this.parseDescriptionAttribute("url");
		const {text: position} = this.parseDescriptionAttribute("position");

		return `在${position}中打开网页${url}`;
	}

	toScript() {
		const url = this.parseScriptAttribute("url");
		const position = this.parseScriptAttribute("position");

		switch (position) {
			case "newTab":
				return `window.open(${url}, '_blank');`;
			case "currentTab":
				return `location.href=${url};`;
			case "newWindow":
				return `window.open(${url}, '_blank', 'width=800,height=600');`;
		}
	}
}

export class CloseTabBlock extends Block {
	static groupName = BlockGroupNames.PageNavigation;

	static defaultTitle = "关闭网页";

	constructor() {
		super();
	}

	get description() {
		return "关闭当前网页";
	}

	toScript() {
		return `window.close();`;
	}
}

export class ScriptFocusBlock extends Block {
	static groupName = BlockGroupNames.PageNavigation;

	static defaultTitle = "脚本聚焦";

	constructor() {
		super();
	}

	get description() {
		return "将脚本切换到当前正在浏览的网页";
	}

	toScript() {
		return "await __API__.__ScriptFocus__(__VAR__.__ID__);";
	}
}

export class GetUrlBlock extends Block {
	static groupName = BlockGroupNames.PageNavigation;

	static defaultTitle = "获取网址";

	constructor() {
		super();
	}

	get description() {
		return "获取当前页面的网址";
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_url",
			name: "网址",
			description: ""
		}]);
	}

	toScript() {
		return `const _url=location.href;`;
	}
}

export class GetTitleBlock extends Block {
	static groupName = BlockGroupNames.PageNavigation;

	static defaultTitle = "获取标题";

	constructor() {
		super();
	}

	get description() {
		return "获取当前页面的标题";
	}

	getExportVariables() {
		return super.getExportVariables([{
			type: "string",
			innerVar: "_title",
			name: "标题",
			description: ""
		}]);
	}

	toScript() {
		return `const _title=document.title;`;
	}
}

export class ForwardBlock extends Block {
	static groupName = BlockGroupNames.PageNavigation;

	static defaultTitle = "前进";

	constructor() {
		super();
	}

	get description() {
		return "前进到下一页";
	}

	toScript() {
		return `history.forward();`;
	}
}

export class BackBlock extends Block {
	static groupName = BlockGroupNames.PageNavigation;

	static defaultTitle = "后退";

	constructor() {
		super();
	}

	get description() {
		return "后退到上一页";
	}

	toScript() {
		return `history.back();`;
	}
}

/**
 * 流程控制
 */
// 等待
export class WaitBlock extends Block {
	static groupName = BlockGroupNames.FlowControl;

	static defaultAttr: DefaultAttrType = {
		"time": {
			type: "number",
			label: "时间（毫秒）",
			defaultValue: 1000,
			limit: {
				required: true,
				min: 0
			}
		}
	};

	static defaultTitle = "等待";

	constructor() {
		super();
	}

	get description() {
		const {text: time} = this.parseDescriptionAttribute("time");
		return `等待${time}毫秒`;
	}

	toScript() {
		const time = this.parseScriptAttribute("time");
		return `await new Promise(resolve=>setTimeout(resolve,${time}));`;
	}
}
