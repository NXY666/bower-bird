import * as CryptoJS from "crypto-js";
import * as Selectors from "&/modules/foreground/selectors";
import * as Strings from "&/modules/strings";

interface TabMessageRouter<T> {
	'#connect'?: (server: T) => void;
	'#disconnect'?: () => void;
	[type: string]: (data: any, server: T) => void;
}

export class TabMessageServer {
	_name: string;

	_router: TabMessageRouter<TabMessageServer>;

	_port = [];

	constructor(name: string, router: TabMessageRouter<TabMessageServer> = {}) {
		this._name = name;
		this._router = router;

		chrome.runtime.onConnect.addListener(this._onConnect);
	}

	async send(type: string, data: any): Promise<boolean> {
		try {
			await Promise.all(this._port.map(port => new Promise<void>((resolve, reject): void => {
				port.postMessage({type, data});
				if (chrome.runtime.lastError) {
					console.warn('[TabMessageServer][Send]', chrome.runtime.lastError.message);
					reject();
				} else {
					resolve();
				}
			})));
			return true;
		} catch {
			return false;
		}
	}

	disconnect() {
		// 停止监听
		chrome.runtime.onConnect.removeListener(this._onConnect);
		// 断开所有连接
		this._port.forEach(port => port.disconnect());
	}

	private readonly _onConnect: (port: chrome.runtime.Port) => void = (port) => {
		if (port.name !== this._name) {
			return;
		}

		this._port.push(port);
		if (this._router['#connect']) {
			this._router['#connect'](this);
		}

		port.onMessage.addListener((message) => {
			if (this._router[message.type]) {
				this._router[message.type](message.data, this);
			} else {
				console.warn('[TabMessageServer][Recv]', 'Unexpected message type received:', message.type);
			}
		});

		port.onDisconnect.addListener(() => {
			if (this._router['#disconnect']) {
				this._router['#disconnect']();
			}
			this._port.splice(this._port.indexOf(port), 1);
		});
	};
}

export class TabMessageClient {
	_tabId: number;

	_name: string;

	_router: TabMessageRouter<TabMessageClient>;

	_port = null;

	_aborted = false;

	constructor(tabId: number, name: string, router: TabMessageRouter<TabMessageClient> = {}) {
		this._tabId = tabId;
		this._name = name;
		this._router = router;

		this.connect();
	}

	// 尝试连接，如果失败则无限重试
	connect() {
		if (this._aborted) {
			console.warn('[TabMessageClient][Connect]', 'Port has been aborted.');
			return;
		}

		const port = chrome.tabs.connect(this._tabId, {name: this._name});

		this._port = port;
		if (this._router['#connect']) {
			this._router['#connect'](this);
		}

		port.onMessage.addListener((message) => {
			if (this._router[message.type]) {
				this._router[message.type](message.data, this);
			} else {
				console.warn('[TabMessageClient][Recv]', 'Unexpected message type received:', message.type);
			}
		});
		port.onDisconnect.addListener(() => {
			if (chrome.runtime.lastError) {
				console.warn('[TabMessageClient][Reconnect]', chrome.runtime.lastError.message);
			} else {
				console.log('[TabMessageClient][Reconnect]', 'Port disconnected.');
			}
			if (this._router['#disconnect']) {
				this._router['#disconnect']();
			}
			setTimeout(() => this.connect(), 1);
		});
	}

	send(type: string, data: any): boolean {
		if (this._aborted) {
			console.warn('[TabMessageClient][Send]', 'Port has been aborted.');
			return false;
		}

		try {
			this._port.postMessage({type, data});
			return true;
		} catch (e) {
			console.warn('[TabMessageClient][Send]', e);
			return false;
		}
	}

	disconnect() {
		this._aborted = true;
		this._port?.disconnect();
	}
}

type MessageRouterCallback = (data: any, sender: chrome.runtime.MessageSender, receiver: string) => any;

type MessageRouterDefaultCallback = (type: string, data: any, sender: chrome.runtime.MessageSender) => any;

interface MessageRouter {
	'#default'?: MessageRouterDefaultCallback;
	[type: string]: MessageRouterCallback | MessageRouterDefaultCallback;
}

export class MessageRouterManager {
	_router: MessageRouter = {};

	constructor(router = {}) {
		this._router = router;
	}

	setRouter(type: string, callback: MessageRouterCallback): void {
		this._router[type] = callback;
	}

	delRouter(type: string): void {
		delete this._router[type];
	}
}

export class Messages {
	static packMsgReq({type, data = null, target, receiver = target}): {
		type: string;
		data: any;
		target: string;
		receiver: string;
		timestamp: number;
	} {
		return {
			type, data, target, receiver,
			timestamp: Date.now()
		};
	}

	static packMsgRes(state: boolean, data: any) {
		return {state, data};
	}

	/**
	 * 发送消息
	 * @param {String} type 消息类型
	 * @param {Object} data 消息数据
	 * @param {String} target 消息目标
	 * @returns {Promise} 返回消息
	 */
	static send(type: string, data: any = null, target: null | string = 'background'): Promise<any> {
		return new Promise<any>(async (resolve, reject) => {
			if (target.startsWith('tab:')) {
				const tabIds = [];
				switch (target) {
					case 'tab:current':
						// 获取当前标签页
						const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
						tabIds.push(tab.id);
						break;
					case 'tab:all':
						// 获取所有标签页
						const tabs = await chrome.tabs.query({});
						tabIds.push(...tabs.map(tab => tab.id));
						break;
					case /^tab:\d+$/.test(target) ? target : null:
						// tab:数字
						tabIds.push(parseInt(target.slice(4)));
						break;
					default:
						console.warn('[Messages][Send]', 'Unexpected target received:', target);
						reject(`Unexpected target received: '${target}'.`);
						return;
				}
				// 发送消息
				const responses = [];
				for (const tabId of tabIds) {
					try {
						const response = await chrome.tabs.sendMessage(tabId, this.packMsgReq({
							type, data, target: 'tab', receiver: `tab:${tabId}`
						}));
						responses.push(response);
					} catch (e) {
						console.warn('[Messages][Send]', e);
					}
				}
				resolve(responses);
			} else {
				chrome.runtime.sendMessage(this.packMsgReq({type, data, target}))
					.then(response => {
						if (response.state) {
							resolve(response.data);
						} else {
							reject(response.data);
						}
					})
					.catch((e) => {
						console.warn('[Messages][Send]', e);
						reject(e);
					});
			}
		});
	}

	static recv(target: string, router: MessageRouter): MessageRouterManager {
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message.target !== target) {
				return false;
			}

			new Promise(async (resolve, reject) => {
				console.debug('[Messages][Recv]', 'Message received:', message, 'from:', sender, 'handler:', router[message?.type]);
				if (router[message.type]) {
					try {
						resolve(await router[message.type](message.data, sender, message.receiver));
					} catch (e) {
						reject(e);
					}
				} else if (router['#default']) {
					try {
						resolve(await router['#default'](message.type, message.data, sender));
					} catch (e) {
						reject(e);
					}
				} else {
					console.warn('[Messages][Recv]', 'Unexpected message type received:', message.type);
					reject(`Unexpected message type received: '${message.type}'.`);
				}
			}).then((data) => {
				sendResponse(this.packMsgRes(true, data));
			}).catch((e) => {
				sendResponse(this.packMsgRes(false, e));
			});
			return true;
		});
		return new MessageRouterManager(router);
	}
}

export class IframeDataPack {
	sign = "bowerbird";

	id = Strings.uniqueId();

	type: string;

	path: string[][];

	vector: number;

	encrypted = false;

	constructor({type, data, path = [], vector = 2147483647}) {
		this.type = type;
		this.data = data;
		this.path = path;
		this.vector = vector;
	}

	static get #secret() {
		return chrome.runtime.id;
	}

	_data: any;

	get data() {
		this.decrypt();
		return this._data;
	}

	set data(data) {
		this._data = data;
		this.encrypted = false;
	}

	getEncryptedData() {
		return this.encrypted ? this._data : CryptoJS.AES.encrypt(JSON.stringify(this._data) ?? 'undefined', IframeDataPack.#secret).toString();
	}

	getDecryptedData() {
		try {
			if (!this.encrypted) {
				return this._data;
			}
			const decrypted = CryptoJS.AES.decrypt(this._data, IframeDataPack.#secret).toString(CryptoJS.enc.Utf8);
			return decrypted === 'undefined' ? undefined : JSON.parse(decrypted);
		} catch (e) {
			console.warn('[IframeDataPack][Decrypt]', e);
			return null;
		}
	}

	encrypt() {
		if (this.encrypted) {
			return;
		}
		this._data = this.getEncryptedData();
		this.encrypted = true;
	}

	decrypt() {
		if (!this.encrypted) {
			return;
		}
		this._data = this.getDecryptedData();
		this.encrypted = false;
	}

	verify() {
		return this.sign === "bowerbird" &&
			typeof this.type === "string" &&
			this.path instanceof Array &&
			typeof this.vector === "number" &&
			(this.encrypted ? typeof this._data === "string" : true);
	}

	goUpstairs(stairSelector: string[]) {
		this.path.unshift(stairSelector);
		this.vector -= 1;
	}

	goDownstairs() {
		this.path.shift();
		this.vector += 1;
	}
}

type IframeMessageRouterCallback = (data: IframeDataPack) => any;

interface IframeMessageRouter {
	[type: string]: IframeMessageRouterCallback;
}

export class IframeMessage {
	_isIframe: boolean;

	_iframeMap = new Map();

	_pendingMessages = [];

	_iframeElementObserver = new MutationObserver((mutationsList) => {
		const handleAddNodes = (node: Node) => {
			// 检查是否是元素节点
			if (node instanceof HTMLIFrameElement) {
				this._iframeMap.set(node.contentWindow, node);
				node.addEventListener('load', node['__bb_load_listener'] = () => {
					// 方向向下且和node相关的消息均失败
					this._pendingMessages.forEach(pendingMessage => {
						if (pendingMessage.target === node) {
							pendingMessage.dataPack.type = '#reject';
							pendingMessage.dataPack.vector = 2147483647;
							pendingMessage.dataPack.data = `Iframe '${JSON.stringify(pendingMessage.dataPack.path[0])}' reloaded.`;
							this.send(pendingMessage.dataPack);
						}
					});
				});
			}

			// 检查子节点
			node.childNodes.forEach(childNode => {
				handleAddNodes(childNode);
			});
		};
		const handleRemoveNodes = (node: Node) => {
			if (node instanceof HTMLIFrameElement) {
				this._iframeMap.delete(node.contentWindow);

				node.removeEventListener('load', node['__bb_load_listener']);

				// 方向向下且和node相关的消息均失败
				this._pendingMessages.forEach(pendingMessage => {
					if (pendingMessage.target === node) {
						pendingMessage.dataPack.type = '#reject';
						pendingMessage.dataPack.vector = 2147483647;
						pendingMessage.dataPack.data = `Iframe '${JSON.stringify(pendingMessage.dataPack.path[0])}' removed.`;
						this.send(pendingMessage.dataPack);
					}
				});
			}

			// 检查子节点
			node.childNodes.forEach(childNode => {
				handleRemoveNodes(childNode);
			});
		};

		for (const mutation of mutationsList) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach(handleAddNodes);
				mutation.removedNodes.forEach(handleRemoveNodes);
			}
		}
	});

	private readonly _router: IframeMessageRouter;

	constructor(router: IframeMessageRouter = {}) {
		this._router = router;
		this._isIframe = window !== window.top;
		this._iframeElementObserver.observe(document, {
			childList: true, // 监听子元素的添加或删除
			subtree: true // 监听所有后代元素的变化
		});
		Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
			this._iframeMap.set(iframe.contentWindow, iframe);
		});
		window.addEventListener('message', async (event) => {
			let dataPack: IframeDataPack;

			// 读取并尝试转化数据
			try {
				const eventData = event.data;
				Object.setPrototypeOf(eventData, IframeDataPack.prototype);
				dataPack = eventData;
			} catch (e) {
				console.warn('[IframeDataPack][Parse]', e);
				return;
			}

			// 验证数据
			if (!dataPack.verify?.()) {
				return;
			}

			// 处理用过的数据
			if (dataPack.vector > 0) {
				const iframe = this._iframeMap.get(event.source);
				const selector = Selectors.getHighQualityCssSelector(iframe);
				dataPack.goUpstairs(selector);
			} else if (dataPack.vector < 0) {
				dataPack.goDownstairs();
			}

			// 看看接下来要干什么
			if (dataPack.vector > 0 && this._isIframe) {
				// 向上且可转发
				this.postParentMessage(dataPack).then(_r => {
				}).catch(_e => {
				});
			} else if (dataPack.vector < 0 && dataPack.path.length > 0) {
				// 向下且可转发
				const iframe = Selectors.deepQuerySelector(document, dataPack.path[0]);
				if (iframe instanceof HTMLIFrameElement) {
					this.postChildMessage(iframe, dataPack).catch(() => {});
				} else {
					console.warn('[PackLost]', dataPack);
					// 回溯为error
					dataPack.type = '#reject';
					dataPack.vector = 2147483647;
					dataPack.data = `Iframe '${JSON.stringify(dataPack.path[0])}' not found.`;
					this.send(dataPack);
				}
			} else {
				// 就是这了
				if (!dataPack.type.startsWith('#')) {
					// 回溯为resolve
					const dataType = dataPack.type;
					dataPack.type = '#resolve';
					dataPack.vector = -dataPack.vector;
					dataPack.data = await this._router[dataType]?.(dataPack);
					this.send(dataPack);
				} else if (dataPack.type === '#resolve' || dataPack.type === '#reject') {
					const pendingMessageIndex = this._pendingMessages.findIndex(pendingMessage => pendingMessage.id === dataPack.id);
					if (pendingMessageIndex !== -1) {
						const [pendingMessage] = this._pendingMessages.splice(pendingMessageIndex, 1);
						pendingMessage.promise[dataPack.type.slice(1)](dataPack.data);
					}
					return null;
				}
			}
		});
	}

	setRouter(type: string, callback: IframeMessageRouterCallback) {
		this._router[type] = callback;
	}

	delRouter(type: string) {
		delete this._router[type];
	}

	/**
	 * 向父级发送消息
	 *
	 * @param {IframeDataPack} dataPack
	 */
	postParentMessage(dataPack: IframeDataPack): null | Promise<any> {
		if (window === window.top) {
			return null;
		}
		dataPack.encrypt();
		window.parent.postMessage(dataPack, '*');

		if (!dataPack.type.startsWith('#')) {
			const pendingMessage = {
				id: dataPack.id, dataPack: dataPack, direction: 'up', timestamp: Date.now(), target: window.parent,
				promise: {resolve: null, reject: null}
			};
			this._pendingMessages.push(pendingMessage);
			return new Promise((resolve, reject) => {
				pendingMessage.promise.resolve = resolve;
				pendingMessage.promise.reject = reject;
			});
		} else if (dataPack.type === '#resolve' || dataPack.type === '#reject') {
			const pendingMessageIndex = this._pendingMessages.findIndex(pendingMessage => pendingMessage.id === dataPack.id);
			if (pendingMessageIndex !== -1) {
				const [pendingMessage] = this._pendingMessages.splice(pendingMessageIndex, 1);
				pendingMessage.promise[dataPack.type === '#resolve' ? 'resolve' : 'reject'](dataPack.data);
			}
			return null;
		}
	}

	/**
	 * 向子级发送消息
	 *
	 * @param {HTMLIFrameElement} iframeChild
	 * @param {IframeDataPack} dataPack
	 */
	postChildMessage(iframeChild: HTMLIFrameElement, dataPack: IframeDataPack): null | Promise<any> {
		dataPack.encrypt();
		iframeChild.contentWindow.postMessage(dataPack, '*');

		if (!dataPack.type.startsWith('#')) {
			const pendingMessage = {
				id: dataPack.id, data: dataPack, direction: 'down', timestamp: Date.now(), target: iframeChild,
				promise: {resolve: null, reject: null}
			};
			this._pendingMessages.push(pendingMessage);
			return new Promise((resolve, reject) => {
				pendingMessage.promise.resolve = resolve;
				pendingMessage.promise.reject = reject;
			});
		} else if (dataPack.type === '#resolve' || dataPack.type === '#reject') {
			const pendingMessageIndex = this._pendingMessages.findIndex(pendingMessage => pendingMessage.id === dataPack.id);
			if (pendingMessageIndex !== -1) {
				const [pendingMessage] = this._pendingMessages.splice(pendingMessageIndex, 1);
				pendingMessage.promise[dataPack.type === '#resolve' ? 'resolve' : 'reject'](dataPack.data);
			}
			return null;
		}
	}

	/**
	 * 向自己发送消息（你想干什么？）
	 * @param dataPack
	 */
	postSelfMessage(dataPack: IframeDataPack): null | Promise<any> {
		dataPack.encrypt();
		window.postMessage(dataPack, '*');
		console.warn('[PostSelf]', dataPack);

		if (!dataPack.type.startsWith('#')) {
			const pendingMessage = {
				id: dataPack.id, data: dataPack, direction: 'self', timestamp: Date.now(), target: window,
				promise: {resolve: null, reject: null}
			};
			this._pendingMessages.push(pendingMessage);
			return new Promise((resolve, reject) => {
				pendingMessage.promise.resolve = resolve;
				pendingMessage.promise.reject = reject;
			});
		} else if (dataPack.type === '#resolve' || dataPack.type === '#reject') {
			const pendingMessageIndex = this._pendingMessages.findIndex(pendingMessage => pendingMessage.id === dataPack.id);
			if (pendingMessageIndex !== -1) {
				const [pendingMessage] = this._pendingMessages.splice(pendingMessageIndex, 1);
				pendingMessage.promise[dataPack.type === '#resolve' ? 'resolve' : 'reject'](dataPack.data);
			}
			return null;
		}
	}

	send(dataPack: IframeDataPack) {
		if (dataPack.vector > 0 && this._isIframe) {
			return this.postParentMessage(dataPack);
		} else if (dataPack.vector < 0 && dataPack.path.length > 0) {
			const iframe = Selectors.deepQuerySelector(document, dataPack.path[0]);
			if (iframe instanceof HTMLIFrameElement) {
				return this.postChildMessage(iframe, dataPack);
			} else {
				console.warn('[PackLost]', dataPack);
				dataPack.type = '#reject';
				dataPack.vector = 0;
				dataPack.data = `Iframe '${JSON.stringify(dataPack.path[0])}' not found.`;
				return this.send(dataPack);
			}
		} else {
			return this.postSelfMessage(dataPack);
		}
	}

	destroy() {
		this._iframeElementObserver.disconnect();
	}
}

export class DocumentMessages {
	static packMsgReq({data = null}): { id: string, data: any; timestamp: number; } {
		return {id: Strings.uniqueId(), data, timestamp: Date.now()};
	}

	static packMsgRes(id: string, state: boolean, data: any) {
		return {id, state, data};
	}

	/**
	 * 发送消息
	 * @param type 消息类型
	 * @param data 消息数据
	 * @param timeout
	 * @returns 返回消息
	 */
	static send(type: string, data: any = null, timeout = 5000): Promise<any> {
		let hasResponse = false;
		return new Promise<any>((resolve, reject) => {
			const request = this.packMsgReq({data});

			let responseListener = (event: CustomEvent) => {
				const {id, state, data} = event.detail as { id: string, state: boolean; data: any; };
				if (id !== request.id) {
					return;
				}

				if (state) {
					resolve(data);
				} else {
					reject(data);
				}

				hasResponse = true;
				document.removeEventListener(`bb:${type}_response`, responseListener);
			};
			document.addEventListener(`bb:${type}_response`, responseListener);

			document.dispatchEvent(new CustomEvent(`bb:${type}`, {
				detail: request,
				cancelable: false
			}));

			if (timeout > 0) {
				setTimeout(() => {
					if (!hasResponse) {
						reject('Response Timeout');
					}
				}, timeout);
			}
		});
	}

	static recv(type: string, callback: (data: any) => any | Promise<any>) {
		if (!document["__bb_message"]) {
			document["__bb_message"] = {};
		}

		if (document["__bb_message"][type]) {
			console.warn('[DocumentMessages][Recv]', 'Message type already exists:', type);
			return;
		}

		document.addEventListener(`bb:${type}`, document["__bb_message"][type] = async (event: CustomEvent) => {
			const {id, data} = event.detail as { id: string, data: any; };
			try {
				const response = await callback(data);
				document.dispatchEvent(new CustomEvent(`bb:${type}_response`, {
					detail: this.packMsgRes(id, true, response),
					cancelable: false
				}));
			} catch (e) {
				document.dispatchEvent(new CustomEvent(`bb:${type}_response`, {
					detail: this.packMsgRes(id, false, e),
					cancelable: false
				}));
			}
		});
	}

	static recvOnce(type: string, callback: (data: any) => any | Promise<any>) {
		if (!document["__bb_message"]) {
			document["__bb_message"] = {};
		}

		if (document["__bb_message"][type]) {
			console.warn('[DocumentMessages][RecvOnce]', 'Message type already exists:', type);
			return;
		}

		document.addEventListener(`bb:${type}`, document["__bb_message"][type] = async (event: CustomEvent) => {
			delete document["__bb_message"][type];

			const {id, data} = event.detail as { id: string, data: any; };
			try {
				const response = await callback(data);
				document.dispatchEvent(new CustomEvent(`bb:${type}_response`, {
					detail: this.packMsgRes(id, true, response),
					cancelable: false
				}));
			} catch (e) {
				document.dispatchEvent(new CustomEvent(`bb:${type}_response`, {
					detail: this.packMsgRes(id, false, e),
					cancelable: false
				}));
			}
		}, {once: true});
	}
}
