export function injectScript(file) {
	const blockDialogsScriptEl = document.createElement('script');
	blockDialogsScriptEl.src = chrome.runtime.getURL(file);
	document.head.appendChild(blockDialogsScriptEl);
}

export function injectStyle(file) {
	const messageStyleEl = document.createElement('link');
	messageStyleEl.rel = 'stylesheet';
	messageStyleEl.href = chrome.runtime.getURL(file);
	document.head.appendChild(messageStyleEl);
}