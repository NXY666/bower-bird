const eventPool = {};

function getSpace(eventName) {
	let eventPath = eventName.split('.');
	let nowSpace = eventPool;
	eventPath.forEach((path) => {
		if (!nowSpace[path]) {
			nowSpace[path] = {
				'.': null
			};
		}
		nowSpace = nowSpace[path];
	});
	return nowSpace;
}

function putEvent(eventName, callback) {
	let eventSpace = getSpace(eventName);
	document.addEventListener(eventName, eventSpace['.'] = function ({detail}) {
		callback(detail);
	});
}

function emitEvent(eventName, args, recursive) {
	let eventSpace = getSpace(eventName);
	if (eventSpace['.']) {
		document.dispatchEvent(new CustomEvent(eventName, {detail: args}));
	}
	if (recursive) {
		for (let key in eventSpace) {
			if (key !== '.') {
				emitEvent(eventName + '.' + key, args, recursive);
			}
		}
	}
}

function removeEvent(eventName, recursive = false) {
	let eventSpace = getSpace(eventName);
	document.removeEventListener(eventName, eventSpace['.']);
	eventSpace['.'] = null;
	if (recursive) {
		Object.keys(eventSpace).forEach((newEventName) => {
			if (newEventName !== '.') {
				removeEvent(eventName + '.' + newEventName, true);
			}
		});
	}
}

/**
 * 添加事件监听器
 * @param {string} event - 事件名称。
 * @param {Function} callback - 当事件被触发时调用的回调函数。
 */
export function on(event, callback) {
	putEvent(event, callback);
}

/**
 * 添加只执行一次的事件监听器
 * @param {string} event - 事件名称。
 * @param {Function} callback - 当事件被触发时调用的回调函数。
 */
export function once(event, callback) {
	putEvent(event, () => {
		removeEvent(event);
		callback.apply(this, arguments);
	});
}

/**
 * 触发一个事件
 * @param {string} event - 事件名称。
 * @param {*} [args=null] - 传递给事件处理函数的参数。
 * @param {boolean} [recursive=false] - 是否递归触发子事件。
 */
export function emit(event, args = null, recursive = false) {
	emitEvent(event, args, recursive);
}

/**
 * 移除事件监听器
 * @param {string} event - 事件名称。
 * @param {boolean} [recursive=false] - 是否递归移除子事件的监听器。
 */
export function off(event, recursive = false) {
	removeEvent(event, recursive);
}