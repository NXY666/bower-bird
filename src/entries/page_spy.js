import {getFallbackCssSelector, getHighQualityCssSelector} from "&/modules/foreground/selectors.ts";
import {DocumentMessages} from "&/modules/messages.ts";

function main() {
	console.log('page spy is listening.');

	const html = document.documentElement;
	html.setAttribute("bb-pagespy", "");

	const tagBlacklist = ["HEAD", "TITLE", "LINK", "SCRIPT", "STYLE", "META"];

	const eventWhiteList = [
		"click", "dblclick", "auxclick",
		"submit", "input", "change",
		"pointerenter", "pointerover", "pointerout", "pointerleave", "pointermove", "pointerdown", "pointerup",
		"mouseenter", "mouseover", "mouseout", "mouseleave", "mousemove", "mousedown", "mouseup",
		"keydown", "keyup",
		"focus", "blur",
		"scroll", "wheel",
		"selectionchange"
	];

	// 敏感事件列表（但是这些事件不能触发默认行为）
	const sensitiveEventList = ["click", "submit"];

	// const bubbleEventList = ["click", "dblclick", "auxclick", "focus", "blur",];

	// 为EventTarget添加事件监听器的存储对象
	["spy", "fake"/* , "bubble" */].forEach(prop => {
		Object.defineProperty(EventTarget.prototype, `__bb_${prop}_listeners`, {
			get: function () {
				this[`__bb_${prop}Listeners`] = this[`__bb_${prop}Listeners`] ?? {};
				return this[`__bb_${prop}Listeners`];
			},
			configurable: false,
			enumerable: false
		});
	});

	// 模拟submit
	function simulateSubmit(target, eventInit) {
		// 创建一个SubmitEvent
		const submitEvent = new SubmitEvent("submit", eventInit);

		// 定义一个只触发一次的submit事件监听器，如果中途没有被阻止默认行为，就触发submit事件
		let submitEventListener = () => target.submit();
		target.addEventListener("submit", submitEventListener, {once: true});

		// 阻止默认行为函数被调用，不再执行submit函数
		submitEvent.preventDefault = () => target.removeEventListener("submit", submitEventListener);

		// 触发submit事件
		target.dispatchEvent(submitEvent);
	}

	// 重写addEventListener
	const __addEventListener = EventTarget.prototype.addEventListener;
	EventTarget.prototype.addRawEventListener = __addEventListener;
	EventTarget.prototype.addEventListener = function (type, listener, options) {
		// 包一层，防止中途return跳过监听原始事件
		(() => {
			// 忽略非HTMLElement的事件监听
			if (!(this instanceof HTMLElement) && !(this instanceof Document) && !(this instanceof Window)) {
				return;
			}

			if (eventWhiteList.includes(type) && !tagBlacklist.includes(this.tagName)) {
				let emitter = this;
				if (emitter instanceof Window) {
					emitter = document;
				}
				// if (bubbleEventList.includes(type)) {
				// 	emitter["__bb_bubble_listeners"][type] = emptyEventListener;
				// 	// 找到自己的祖先。不是ShadowRoot或者Document说明不在DOM树上，等插进去了再监听。
				// 	if (emitter instanceof Window) {
				// 		emitter = document;
				// 	} else if (emitter.getRootNode() instanceof ShadowRoot || emitter.getRootNode() instanceof Document) {
				// 		emitter = emitter.getRootNode();
				// 	} else {
				// 		return;
				// 	}
				// }
				if (!emitter["__bb_spy_listeners"][type]) {
					const fakeListenerOptions = {capture: true, passive: !sensitiveEventList.includes(type)};

					// 触发事件时，把事件信息发送到后台
					emitter["__bb_spy_listeners"][type] = async function (event) {
						if (!event.isTrusted || event.target?.hasAttribute?.("bb-ignore")) {
							return;
						} else if (event.target?.['__bb_ignore_once'] || event['__bb_ignore']) {
							event['__bb_ignore'] = true;
							delete event.target['__bb_ignore_once'];
							return;
						}

						event.stopImmediatePropagation();

						if (sensitiveEventList.includes(event.type)) { // 敏感事件可能会触发默认行为跳转
							event.preventDefault();

							await sendRecordInfo(event);

							// 模拟
							switch (event.type) {
								case "submit":
									simulateSubmit(event.target, event);
									return;
								case "click":
									// 制造一个isTrusted为false的submit事件
									let form = event.target;
									while (form && form.tagName !== "FORM") {
										form = form.parentElement;
									}
									if (form) {
										form['__bb_ignore_once'] = true;
									}
									break;
								default:
									console.warn('[PageSpy]', 'Unhandled sensitive event', event.type, event.target.tagName, event);
									break;
							}
						} else if ( // 输入事件
							event.type === 'input' && ['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target.tagName)
						) {
							await sendRecordInfo(event, {extraData: extractExtraData(event, "BaseInputEvent")});
						} else if (event.type === 'scroll') { // 滚动事件
							await sendRecordInfo(event, {extraData: extractExtraData(event, "BaseScrollEvent")});
						} else if (event.type === 'selectionchange') { // 选择事件
							await sendRecordInfo(event, {extraData: extractExtraData(event, "BaseSelectEvent")});
						} else { // 其他事件
							await sendRecordInfo(event);
						}

						// 原样模拟一个
						const newEvent = new event.constructor(event.type, event);
						// 如果是敏感事件，因为现在已经阻止了默认行为，所以需要setTimeout等待后续事件处理完毕再触发
						if (sensitiveEventList.includes(event.type)) {
							setTimeout(() => event.target?.dispatchEvent(newEvent));
						} else {
							event.target?.dispatchEvent(newEvent);
						}
					}.bind(emitter);
					__addEventListener.call(emitter, type, emitter["__bb_spy_listeners"][type], fakeListenerOptions);
				}
				// console.log('add', type, this.tagName);
			} else {
				// console.log('ignore', type, target.tagName);
			}
		})();
		__addEventListener.call(this, type, listener, options);
	};

	function sendRecordInfo(event, extraRecordInfo = null) {
		const selector = {
			primary: getHighQualityCssSelector(event.target),
			fallback: getFallbackCssSelector(event.target)
		};
		// 两个数组如果一样，就只保留fallbackSelector
		if (selector.primary.every((v, i) => v === selector.fallback[i])) {
			delete selector.primary;
		}

		const recordInfo = {
			type: event.type,
			selector,
			time: Date.now(),
			extraData: extractExtraData(event),
			...extraRecordInfo
		};
		return DocumentMessages.send("record", recordInfo);
	}

	function extractExtraData(event, proto = null) {
		switch (proto ?? event.__proto__) {
			case Event.prototype:
			default:
				return {
					prototype: "Event",
					bubbles: event.bubbles,
					cancelable: event.cancelable,
					composed: event.composed
				};
			case UIEvent.prototype:
				return {
					...extractExtraData(event, Event.prototype),
					prototype: "UIEvent",
					detail: event.detail
				};
			case MouseEvent.prototype:
				return {
					...extractExtraData(event, UIEvent.prototype),
					prototype: "MouseEvent",
					screenX: event.screenX,
					screenY: event.screenY,
					clientX: event.clientX,
					clientY: event.clientY,
					ctrlKey: event.ctrlKey,
					shiftKey: event.shiftKey,
					altKey: event.altKey,
					metaKey: event.metaKey,
					button: event.button,
					buttons: event.buttons,
					pageX: event.pageX, // 附加，给鼠标点显示用
					pageY: event.pageY // 附加，给鼠标点显示用
				};
			case PointerEvent.prototype:
				return {
					...extractExtraData(event, MouseEvent.prototype),
					prototype: "PointerEvent",
					pointerId: event.pointerId,
					width: event.width,
					height: event.height,
					pressure: event.pressure,
					tangentialPressure: event.tangentialPressure,
					tiltX: event.tiltX,
					tiltY: event.tiltY,
					twist: event.twist,
					pointerType: event.pointerType,
					isPrimary: event.isPrimary
				};
			case KeyboardEvent.prototype:
				return {
					...extractExtraData(event, UIEvent.prototype),
					prototype: "KeyboardEvent",
					key: event.key,
					code: event.code,
					location: event.location,
					ctrlKey: event.ctrlKey,
					shiftKey: event.shiftKey,
					altKey: event.altKey,
					metaKey: event.metaKey,
					repeat: event.repeat,
					isComposing: event.isComposing,
					charCode: event.charCode, // 已废弃
					keyCode: event.keyCode, // 已废弃
					which: event.which // 已废弃
				};
			case InputEvent.prototype:
				return {
					...extractExtraData(event, UIEvent.prototype),
					prototype: "InputEvent",
					data: event.data,
					inputType: event.inputType,
					isComposing: event.isComposing,
					value: event.target.value
				};
			case TouchEvent.prototype:
				return {
					...extractExtraData(event, UIEvent.prototype),
					prototype: "TouchEvent",
					touches: event.touches,
					targetTouches: event.targetTouches,
					changedTouches: event.changedTouches,
					ctrlKey: event.ctrlKey,
					shiftKey: event.shiftKey,
					altKey: event.altKey,
					metaKey: event.metaKey
				};
			case FocusEvent.prototype:
				return {
					...extractExtraData(event, UIEvent.prototype),
					prototype: "FocusEvent"
				};
			case SubmitEvent.prototype:
				return {
					...extractExtraData(event, UIEvent.prototype),
					prototype: "SubmitEvent"
				};
			case WheelEvent.prototype:
				return {
					...extractExtraData(event, MouseEvent.prototype),
					prototype: "WheelEvent",
					deltaX: event.deltaX,
					deltaY: event.deltaY,
					deltaZ: event.deltaZ,
					deltaMode: event.deltaMode
				};
			case "BaseScrollEvent":
				const isDocument = event.target instanceof Document;
				return {
					...extractExtraData(event, Event.prototype),
					top: isDocument ? window.scrollY : event.target.scrollTop,
					left: isDocument ? window.scrollX : event.target.scrollLeft
				};
			case "BaseInputEvent":
				return {
					...extractExtraData(event, Event.prototype),
					value: event.target.value,
					checked: event.target.checked
				};
			case "BaseSelectEvent":
				const selection = document.getSelection();
				try {
					const range = selection.getRangeAt(0);
					return {
						...extractExtraData(event, Event.prototype),
						type: selection.type,
						startParentTarget: getHighQualityCssSelector(range.startContainer.parentElement),
						startNodeIndex: Array.from(range.startContainer.parentElement.childNodes).indexOf(range.startContainer),
						startOffset: range.startOffset,
						endParentTarget: getHighQualityCssSelector(range.endContainer.parentElement),
						endNodeIndex: Array.from(range.endContainer.parentElement.childNodes).indexOf(range.endContainer),
						endOffset: range.endOffset
					};
				} catch {
					return {
						...extractExtraData(event, Event.prototype),
						type: selection.type
					};
				}
		}
	}

	function emptyEventListener() {}

	function addFakeEventListener(target, type) {
		if (!target["__bb_fake_listeners"][type]) {
			target.addEventListener(type, target["__bb_fake_listeners"][type] = emptyEventListener, {once: true});
		}
	}

	function removeFakeEventListener(target, type) {
		if (target["__bb_fake_listeners"][type]) {
			target.removeEventListener(type, target["__bb_fake_listeners"][type]);
			delete target["__bb_fake_listeners"][type];
		}
	}

	function initNode(node) {
		if (node["__bb_init"] || node.nodeType !== 1) {
			return;
		}
		node["__bb_init"] = true;

		// Object.keys(node["__bb_bubble_listeners"]).forEach(event => {
		// 	removeFakeEventListener(node, event);
		// 	addFakeEventListener(node, event);
		// });

		// 默认点击行为
		if (
			(node.tagName === 'A') ||
			(['INPUT', 'BUTTON'].includes(node.tagName) && ['submit', 'reset'].includes(node.type))
		) {
			addFakeEventListener(node, 'click');
		}
		// 默认输入行为
		if (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) {
			addFakeEventListener(node, 'input');
		}
		// 默认提交行为
		if (node.tagName === 'FORM') {
			addFakeEventListener(node, 'submit');
		}

		// 通用标签
		if (!tagBlacklist.includes(node.tagName)) {
			// 每个元素都可能会scroll
			addFakeEventListener(node, 'scroll');

			// 属性里面定义了事件监听器
			Array.from(node.attributes).forEach(attr => {
				if (attr.name.startsWith('on')) {
					addFakeEventListener(node, attr.name.slice(2));
				}
			});
		}

		// 递归子节点
		Array.from(node.children).forEach(child => {
			initNode(child);
		});
	}

	// 监听DOM元素变化，对新增的元素进行监听初始化
	const domElementObserver = new MutationObserver(function (mutationsList) {
		for (const mutation of mutationsList) {
			// console.log('mutation', mutation.type, mutation.addedNodes);
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach(node => {
					// 检查是否是元素节点
					if (node.nodeType === Node.ELEMENT_NODE) {
						initNode(node);
					}
				});
			}
		}
	});

	domElementObserver.observe(document, {
		childList: true, // 监听子元素的添加或删除
		subtree: true // 监听所有后代元素的变化
	});

	// 监听元素事件属性
	[HTMLElement.prototype].forEach(function (element) {
		Object.keys(element).filter(prop => prop.startsWith('on')).forEach(function (eventName) {
			const originalEvent = Object.getOwnPropertyDescriptor(element, eventName);
			if (!originalEvent) {
				return;
			}

			Object.defineProperty(element, eventName, {
				set: function (value) {
					addFakeEventListener(this, eventName.slice(2));

					originalEvent.set.call(this, value);
				},
				get: function () {
					return originalEvent?.get ? originalEvent.get.call(this) : this?.getAttribute(eventName);
				}
			});
		});
	});

	addFakeEventListener(document, 'keyup');
	addFakeEventListener(document, 'keydown');
	addFakeEventListener(document, 'scroll');
	addFakeEventListener(document, 'selectionchange');
}

// noinspection JSUnusedGlobalSymbols
export default {main};