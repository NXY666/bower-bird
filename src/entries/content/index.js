import './style.css';
import {DebounceFunction, setRetry} from "&/modules/functions.ts";
import {DocumentMessages, IframeDataPack, IframeMessage, Messages, TabMessageServer} from "&/modules/messages.ts";
import {deepQuerySelector, getHighQualityCssSelector} from "&/modules/foreground/selectors.ts";

async function main() {
	const isIframe = window !== window.top;

	const html = document.documentElement;

	class RecordLockMask {
		_parentNode;

		_maskContainer;

		_isShow = false;

		constructor(parentNode) {
			this._parentNode = parentNode;
			this.createMask();
		}

		createMask() {
			const mask = document.createElement('div');
			mask.setAttribute('bb-ignore', '');

			const shadow = mask.attachShadow({mode: 'open'});

			shadow.innerHTML = `
			<style>
				#record-mask {
					font-size: min(24px, 5vw);
					line-height: 2;
					position: fixed;
					z-index: 2147483647;
					top: 0;
					left: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100%;
					user-select: none;
					text-align: center;
					color: white;
					background-color: rgba(0,0,0,.8);
				}
			</style>
			<div id="record-mask">请返回宏录制窗口<br>此页面将保持锁定，直到录制结束</div>`;

			this._maskContainer = mask;
		}

		show() {
			if (!this._isShow) {
				this._parentNode.appendChild(this._maskContainer);
				this._isShow = true;
			}
		}

		hide() {
			if (this._isShow) {
				this._parentNode.removeChild(this._maskContainer);
				this._isShow = false;
			}
		}
	}

	// 宏录制锁定页面遮罩
	const recordLockMask = new RecordLockMask(html);

	// 监听来自其它context的消息
	const messageRouter = Messages.recv('tab', {
		'Macro.RecordReady': () => recordLockMask.show(),
		'Macro.RecordStopped': () => {
			if (html.hasAttribute('bb-pagespy')) {
				window.location.reload();
			} else {
				recordLockMask.hide();
			}
		}
	});

	// 监听来自iframe的消息
	const iframeMessage = new IframeMessage({});

	if (html.hasAttribute('bb-pagespy')) {
		// 如果不是宏录制窗口，却加载了page_spy.js，则锁定页面
		if (!await Messages.send('Macro.IsRecordWindow')) {
			recordLockMask.show();
			return;
		}

		/**
		 * 录制专区
		 */
		{
			class RecordFloat {
				_parentNode;

				_isMoving = false;

				_shiftX = 0;

				_shiftY = 0;

				_floatingWindowEl;

				_timerDisplayEl;

				_recordButtonEl;

				constructor(parentNode) {
					this._parentNode = parentNode;
					this.createFloatingWindow();
				}

				_isRecording = false;

				get isRecording() {
					return this._isRecording;
				}

				createFloatingWindow() {
					const floatingWindow = document.createElement('div');
					floatingWindow.setAttribute('bb-ignore', '');

					this._parentNode.appendChild(floatingWindow);

					const shadow = floatingWindow.attachShadow({mode: 'open'});
					shadow.innerHTML = `
<style>
	.material-symbols-sharp {
	  font-family: 'Material Symbols Sharp', 'Empty Font', sans-serif;
	  font-size: 24px;
	  font-weight: normal;
	  font-style: normal;
	  line-height: 1;
	  display: inline-block;
	  white-space: nowrap;
	  letter-spacing: normal;
	  text-transform: none;
	  word-wrap: normal;
	  direction: ltr;
	  -webkit-font-feature-settings: 'liga';
	  -webkit-font-smoothing: antialiased;
	}
	
    #floating-window {
		font-family: sans-serif;
		position: fixed;
		z-index: 2147483647;
		top: 50px;
		left: 50px;
		display: flex;
		align-items: center;
		width: 80px;
		height: 25px;
		padding: 5px 5px 5px 15px;
		cursor: move;
		user-select: none;
		text-align: center;
		border-radius: 2147483647px;
		background-color: white;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	#timerDisplay {
		font-size: 18px;
		pointer-events: none;
		color: hwb(210 49% 49%);
	}

	#recordButton {
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 25px;
		height: 25px;
		margin-left: auto;
		padding: 0;
		cursor: pointer;
		color: white;
		border: none;
		border-radius: 2147483647px;
		background-color: hwb(220 25% 0%);
	}

	#recordButton.recording {
		background-color: hwb(0 30% 5%);
	}
</style>
<div id="floating-window">
    <div id="timerDisplay">00:00</div>
    <button class="material-symbols-sharp" id="recordButton" type="button">fiber_manual_record</button>
</div>`;

					this._floatingWindowEl = shadow.getElementById('floating-window');
					this._timerDisplayEl = shadow.getElementById('timerDisplay');
					this._recordButtonEl = shadow.getElementById('recordButton');

					// 同步设置事件监听器
					this._floatingWindowEl.addEventListener('mousedown', this.onMouseDown.bind(this));
					document.addEventListener('mousemove', this.onMouseMove.bind(this));
					document.addEventListener('mouseup', this.onMouseUp.bind(this));
					this._floatingWindowEl.addEventListener('dragstart', (event) => event.preventDefault());
					this._floatingWindowEl.addEventListener('contextmenu', (event) => event.preventDefault());

					this._timerDisplayEl.addEventListener('dragstart', (event) => event.preventDefault());

					this._recordButtonEl.addEventListener('click', this.onRecordButtonClick.bind(this));
					this._recordButtonEl.addEventListener('mousedown', (event) => event.stopPropagation());

					// 监听悬浮窗是否显示不全
					const observer = new IntersectionObserver((entries) => {
						if (entries[0].intersectionRatio !== 1) {
							// 移到可见区域
							this.moveAt(document.documentElement.clientWidth - this._floatingWindowEl.offsetWidth, document.documentElement.clientHeight - this._floatingWindowEl.offsetHeight, true);
						}
					});
					observer.observe(this._floatingWindowEl);
				}

				onMouseDown(event) {
					this._isMoving = true;
					this._shiftX = event.clientX - this._floatingWindowEl.getBoundingClientRect().left;
					this._shiftY = event.clientY - this._floatingWindowEl.getBoundingClientRect().top;
				}

				onMouseMove(event) {
					if ((event.buttons & 1) === 0) {
						this.onMouseUp();
						return;
					}
					if (this._isMoving) {
						this.moveAt(event.pageX, event.pageY, true);
					}
				}

				onMouseUp() {
					if (!this._isMoving) {
						return;
					}
					this._isMoving = false;
					this._shiftX = 0;
					this._shiftY = 0;
				}

				moveAt(pageX, pageY, forceMove = false) {
					if (pageX - this._shiftX < 0) {
						pageX = this._shiftX;
					}
					if (pageY - this._shiftY < 0) {
						pageY = this._shiftY;
					}
					if (pageX - this._shiftX + this._floatingWindowEl.offsetWidth > document.documentElement.clientWidth) {
						pageX = document.documentElement.clientWidth - this._floatingWindowEl.offsetWidth + this._shiftX;
					}
					if (pageY - this._shiftY + this._floatingWindowEl.offsetHeight > document.documentElement.clientHeight) {
						pageY = document.documentElement.clientHeight - this._floatingWindowEl.offsetHeight + this._shiftY;
					}

					if (forceMove || !this._isMoving) {
						this._floatingWindowEl.style.left = pageX - this._shiftX + 'px';
						this._floatingWindowEl.style.top = pageY - this._shiftY + 'px';
						this.onMove(pageX - this._shiftX, pageY - this._shiftY);
					}
				}

				openTimer(startTime) {
					if (this.timerInterval) {
						clearInterval(this.timerInterval);
					}
					this.startTime = startTime;
					this.timerInterval = setInterval(() => {
						const elapsedTime = Date.now() - this.startTime;
						const seconds = Math.floor((elapsedTime / 1000) % 60);
						const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
						this._timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
					}, 100);
				}

				startRecord(startTime) {
					this._isRecording = true;
					this.openTimer(startTime);
					this._recordButtonEl.classList.add('recording');
					this._recordButtonEl.textContent = 'stop';
				}

				stopRecord() {
					this._isRecording = false;
					clearInterval(this.timerInterval);
					this._timerDisplayEl.textContent = '00:00';
					this._recordButtonEl.classList.remove('recording');
					this._recordButtonEl.textContent = 'fiber_manual_record';
				}

				onRecordButtonClick() {
					if (this._isRecording) {
						this.onStop();
					} else {
						this.onStart();
					}
				}

				/**
				 * 当点击开始录制时触发
				 */
				onStart = () => {};

				/**
				 * 当点击停止录制时触发
				 */
				onStop = () => {};

				/**
				 * 当悬浮窗移动时触发
				 * @param {number} _ left
				 * @param {number} __ top
				 */
				onMove = (_, __) => {};
			}

			if (isIframe) {
				// 监听来自page_spy.js的消息
				DocumentMessages.recv('record', function (data) {
					return iframeMessage.send(new IframeDataPack({
						type: 'record', data
					}));
				});
			} else {
				// 获取悬浮窗position
				const position = await Messages.send('Macro.GetRecordFloatPosition');

				const setRecordFloatPosition = new DebounceFunction(async (left, top) => {
					await Messages.send('Macro.SetRecordFloatPosition', {left, top})
					.catch(reason => console.debug("[SetRecordFloatPosition]", "Failed to set position:", reason));
				}, 100);

				// 制造一个悬浮窗
				const recFloat = new RecordFloat(html);
				recFloat.moveAt(position.left, position.top);
				recFloat.onStart = () => Messages.send('Macro.StartRecord').catch(pack => alert(pack));
				recFloat.onStop = () => Messages.send('Macro.StopRecord').catch(pack => alert(pack));
				recFloat.onMove = (left, top) => setRecordFloatPosition.debounce(left, top);

				const recTabMsgSvr = new TabMessageServer('Record', {
					'start_record': (data) => {
						recFloat.startRecord(data);
					}
				});
				window.addEventListener('pagehide', async function () {
					recTabMsgSvr.disconnect();
				});

				iframeMessage.setRouter('record', async (dataPack) => {
					const recordData = {
						...dataPack.data,
						path: dataPack.path
					};
					await recTabMsgSvr?.send('record', recordData);
				});

				// 监听来自page_spy.js的消息
				DocumentMessages.recv('record', function (data) {
					return recTabMsgSvr.send('record', data);
				});
			}
		}
	} else {
		/**
		 * 执行专区
		 * */
		{
			class MouseDot {
				_parentNode;

				_dot;

				_lastOperationTime = 0;

				constructor(parentNode) {
					this._parentNode = parentNode;
					this.createDot();

					setInterval(() => {
						if (Date.now() - this._lastOperationTime > 200) {
							this.mouseSleep();
						}
					}, 100);
				}

				createDot() {
					const dot = document.createElement('div');
					dot.setAttribute('bb-ignore', '');

					this._parentNode.appendChild(dot);

					const shadow = dot.attachShadow({mode: 'open'});
					shadow.innerHTML = `
				<style>
    #mouse-dot {
        position: fixed;
        z-index: 2147483647;
        top: -30px;
        left: -30px;
        width: 30px;
        height: 30px;
        transition: opacity .2s ease, transform .2s ease;
        pointer-events: none;
        border-radius: 50%;
        background-color: rgba(255, 221, 0);
    }
    </style>
    <div id="mouse-dot"></div>`;

					this._dot = shadow.getElementById('mouse-dot');
				}

				mouseMove(left, top) {
					this._lastOperationTime = Date.now();
					this._dot.style.left = (left - 15) + 'px';
					this._dot.style.top = (top - 15) + 'px';
				}

				mouseDown() {
					this._dot.style.transform = 'scale(0.75)';
					this._dot.style.opacity = '0.25';
				}

				mouseUp() {
					this._dot.style.transform = '';
					this._dot.style.opacity = '0.5';
				}

				mouseSleep() {
					this._dot.style.opacity = '0';
				}
			}

			// 用于在宏执行时展示鼠标位置的小点
			const dot = new MouseDot(html);

			function controlDot(eventData) {
				if (
					eventData.type === 'mousemove' || eventData.type === 'mouseup' || eventData.type === 'mousedown' ||
					eventData.type === 'mouseenter' || eventData.type === 'mouseleave' || eventData.type === 'mouseover' || eventData.type === 'mouseout' ||
					eventData.type === 'click' || eventData.type === 'dblclick' || eventData.type === 'auxclick' || eventData.type === 'contextmenu'
				) {
					dot.mouseMove(eventData.extraData.pageX, eventData.extraData.pageY);
					if (eventData.extraData.buttons === 0) {
						dot.mouseUp();
					} else {
						dot.mouseDown();
					}
				}
			}

			// 无关紧要的事件
			const insignificantEvents = [
				"mouseenter", "mouseleave", "mouseover", "mouseout", "mousemove",
				"pointerenter", "pointerleave", "pointerover", "pointerout", "pointermove",
				"touchstart", "touchend", "touchmove",
				'focus', 'blur',
				'selectionchange'
			];

			function executeEvent(eventData) {
				// 控制鼠标点
				controlDot(eventData);

				// 判断是否是无关紧要的事件
				const isEventInsignificant = insignificantEvents.includes(eventData.type);

				// 执行事件
				return setRetry(async () => {
					let element = deepQuerySelector(document, eventData.selector.primary) ?? deepQuerySelector(document, eventData.selector.fallback);
					// console.log('event type:', eventData.type, 'selector:', eventData.selector, 'element:', element, 'extraData:', eventData.extraData);
					if (!element) {
						console.error('[ExecuteEvent]', 'No elements found for selector:', eventData.selector);
						throw new Error('No elements found for selector');
					}

					switch (eventData.type) {
						case 'input': {
							if (typeof element.value != "undefined") {
								element.value = eventData.extraData.value;
							}
							if (typeof element.checked != "undefined") {
								element.checked = eventData.extraData.checked;
							}
							element.dispatchEvent(new window[eventData.extraData.prototype](eventData.type, {
								view: window,
								bubbles: true,
								...eventData.extraData
							}));
							break;
						}
						case 'scroll': {
							if (element === document.body) {
								element = window;
							}
							element.scrollTo({
								top: eventData.extraData.top,
								left: eventData.extraData.left,
								behavior: 'auto'
							});
							break;
						}
						case 'selectionchange': {
							if (eventData.extraData.type === 'None') {
								document.getSelection().removeAllRanges();
								break;
							}
							const startParentTarget = deepQuerySelector(document, eventData.extraData.startParentTarget);
							const startNode = startParentTarget.childNodes[eventData.extraData.startNodeIndex];
							const endParentTarget = deepQuerySelector(document, eventData.extraData.endParentTarget);
							const endNode = endParentTarget.childNodes[eventData.extraData.endNodeIndex];
							const range = document.createRange();
							range.setStart(startNode, eventData.extraData.startOffset);
							range.setEnd(endNode, eventData.extraData.endOffset);
							document.getSelection().removeAllRanges();
							document.getSelection().addRange(range);
							break;
						}
						default:
							element.dispatchEvent(new window[eventData.extraData.prototype](eventData.type, {
								view: window,
								bubbles: true,
								...eventData.extraData
							}));
					}
				}, {retryCount: isEventInsignificant ? 0 : 10, retryDelay: 500})
				.then(() => true)
				.catch(reason => {
					console.error('[ExecuteEvent]', 'Event execution failed:', reason);
					return isEventInsignificant;
				});
			}

			if (isIframe) {
				iframeMessage.setRouter('execute', async (dataPack) => {
					return await executeEvent(dataPack.data);
				});
			} else {
				const execTabMsgSvr = new TabMessageServer('Execute', {
					'execute': async (data, server) => {
						if (!data.path) {
							return server.send('execute_result', await executeEvent(data));
						}

						const path = data.path;
						delete data.path;

						return server.send('execute_result', await iframeMessage.send(new IframeDataPack({
							type: 'execute',
							data, path,
							vector: -2147483647
						})));
					}
				});

				window.addEventListener('pagehide', async function () {
					execTabMsgSvr?.disconnect();
				});
			}
		}

		/**
		 * 捕捉元素专区
		 */
		{
			let pageTarget = null;

			function getElementTextContent(element) {
				if (element.nodeType === Node.TEXT_NODE) {
					return element.textContent;
				}
				return Array.from(element.childNodes).map(getElementTextContent).join(' ');
			}

			function generateData(target, receiver = null) {
				return {
					selector: getHighQualityCssSelector(target),
					textContent: getElementTextContent(target),
					tagName: target.tagName,
					host: location.hostname,
					rect: {
						element: target.getBoundingClientRect(),
						window: new DOMRect(0, 0, window.innerWidth, window.innerHeight)
					},
					pageTarget: receiver
				};
			}

			// inspector
			const elementCaptureInspector = new (await import('&/modules/foreground/inspector.js')).default();
			let isInspectorActive = false;
			const elementCaptureListener = async function (ev) {
				ev.preventDefault();
				ev.stopPropagation();
				ev.stopImmediatePropagation();

				if ([HTMLIFrameElement, HTMLHtmlElement, HTMLBodyElement].includes(ev.target.constructor)) {
					return;
				}

				if (isIframe) {
					await iframeMessage.send(new IframeDataPack({
						type: 'capture',
						data: generateData(ev.target, pageTarget)
					}));
				} else {
					Messages.send('Element.Capture', generateData(ev.target, pageTarget)).catch(pack => alert(pack));
				}
			};

			messageRouter.setRouter('Element.CaptureStart', async (data, target, receiver) => {
				if (isInspectorActive) {
					return;
				}

				pageTarget = receiver;

				await elementCaptureInspector.activate();
				isInspectorActive = true;

				document.addEventListener('click', elementCaptureListener, {capture: true});
			});
			messageRouter.setRouter('Element.CaptureFinish', async () => {
				if (!isInspectorActive) {
					return;
				}

				elementCaptureInspector.deactivate();
				isInspectorActive = false;

				document.removeEventListener('click', elementCaptureListener, {capture: true});
			});
			if (!isIframe) {
				iframeMessage.setRouter('capture', async (dataPack) => {
					await Messages.send('Element.Capture', {
						path: dataPack.path,
						...dataPack.data
					});
				});
			}
		}

		/**
		 * 用户脚本专区
		 */
		{
			DocumentMessages.recv('background_message', async data => {
				const {type, data: sendData} = data;
				return await Messages.send(type, sendData);
			});
			messageRouter.setRouter('Script.Execute', async (data) => {
				return await DocumentMessages.send('execute_script', data);
			});
			messageRouter.setRouter('Script.Focus', async (data) => {
				return await DocumentMessages.send('script_focus', data);
			});
			messageRouter.setRouter('Macro.ExecuteFinish', async (data) => {
				return await DocumentMessages.send('macro_execute_finish', data);
			});
		}

		/**
		 * 外部SDK专区
		 */
		{
			const pageTarget = `tab:${await Messages.send('Tab.This')}`;

			// 导出脚本
			messageRouter.setRouter('Script.Export', (data) => {
				DocumentMessages.send(`export_script_${data.id}`, data.result).catch(() => {});
			});
			messageRouter.setRouter('Script.ExportCancel', (data) => {
				DocumentMessages.send(`export_script_${data.id}`, '没有脚本被导出').catch(() => {});
			});
			DocumentMessages.recv('check_bowerbird', async function () {
				console.log('[check_bowerbird]', 'BowerBird is ready');
				return true;
			});
			DocumentMessages.recv('export_script_request', async function (id) {
				await Messages.send('Script.StartExport', {
					id,
					origin: location.origin,
					pageTarget,
					windowWidth: window.outerWidth,
					windowHeight: window.outerHeight
				});
			});

			// 导入脚本
			DocumentMessages.recv('import_script_request', async function ({id, resources}) {
				await Messages.send('Script.StartImport', {
					id,
					resources,
					origin: location.origin,
					pageTarget,
					windowWidth: window.outerWidth,
					windowHeight: window.outerHeight
				});
			});
		}
	}
}

// noinspection JSUnusedGlobalSymbols
export default {
	matches: ['<all_urls>'],
	run_at: 'document_start',
	allFrames: true,
	main
};
