import {storage, tempStorage} from "&/modules/chrome_api.ts";
import * as Strings from "&/modules/strings.ts";
import {Messages} from "&/modules/messages.ts";

// hash如果不是close，就不关闭页面
if (window.location.hash !== '#close') {
	window.location.hash = '#close';
} else {
	window.close();
}

document.addEventListener('DOMContentLoaded', async function () {
	const query = new URLSearchParams(window.location.search);
	const data = JSON.parse(query.get("data"));

	const base64Screenshot = await tempStorage.getKey('Capture.ElementScreenshot');
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	const image = new Image();
	image.src = base64Screenshot;
	image.onload = function () {
		// 如果宽高小于350*240，就以rect中心为中心截取350*240；否则按比例缩放，截取350n*240n的图片，使其刚好能放下rect
		const baseWidth = 350, baseHeight = 200;
		const baseRatio = baseWidth / baseHeight;
		const imageWidth = image.width, imageHeight = image.height;

		let {element: elementRect, window: windowRect} = data.rect;

		// 获取缩放比例
		const scale = imageWidth / windowRect.width;

		// 调整rect，使其不超出图片边界
		elementRect = new DOMRect(
			Math.max(elementRect.left, 0),
			Math.max(elementRect.top, 0),
			Math.min(elementRect.right, windowRect.right) - Math.max(elementRect.left, 0),
			Math.min(elementRect.bottom, windowRect.bottom) - Math.max(elementRect.top, 0)
		);

		const centerX = (elementRect.left + elementRect.right) / 2;
		const centerY = (elementRect.top + elementRect.bottom) / 2;

		let realX, realY, realWidth, realHeight;

		if (elementRect.width < baseWidth && elementRect.height < baseHeight) {
			realX = centerX - baseWidth / 2;
			realY = centerY - baseHeight / 2;
			realWidth = baseWidth;
			realHeight = baseHeight;
		} else {
			let rectWidth, rectHeight;

			const elementRatio = elementRect.width / elementRect.height;
			if (elementRatio > baseRatio) {
				rectWidth = Math.min(elementRect.width * 1.2, windowRect.width);
				rectHeight = rectWidth / baseRatio;
			} else {
				rectHeight = Math.min(elementRect.height * 1.2, windowRect.height);
				rectWidth = rectHeight * baseRatio;
			}

			realX = centerX - rectWidth / 2;
			realY = centerY - rectHeight / 2;
			realWidth = rectWidth;
			realHeight = rectHeight;
		}

		// // 调整截取区域，使其不超出图片边界
		// realX = Math.max(realX, 0);
		// realY = Math.max(realY, 0);
		// if (realX + realWidth > windowRect.width) {
		// 	realX = windowRect.width - realWidth;
		// }
		// if (realY + realHeight > windowRect.height) {
		// 	realY = windowRect.height - realHeight;
		// }

		// 等比例缩放
		realX *= scale;
		realY *= scale;
		realWidth *= scale;
		realHeight *= scale;

		// 画截取的图片
		canvas.width = realWidth;
		canvas.height = realHeight;
		ctx.drawImage(image, realX, realY, realWidth, realHeight, 0, 0, realWidth, realHeight);

		const screenshot = canvas.toDataURL('image/png');
		const screenshotElement = document.getElementById('element-screenshot');
		screenshotElement.src = screenshot;
	};

	const elementForm = document.getElementById('element-form');
	const elementName = document.getElementById('element-name');
	const elementDescription = document.getElementById('element-description');

	elementName.value = ((data) => {
		let tagName;
		switch (data.tagName) {
			case 'H1':
			case 'H2':
			case 'H3':
			case 'H4':
			case 'H5':
			case 'H6':
			case 'CITE':
			case 'LEGEND':
			case 'FIGCAPTION':
			case 'CAPTION':
			case 'HGROUP':
			case 'SUMMARY':
			case 'LABEL':
			case 'FIGURE':
				tagName = "标题";
				break;
			case 'P':
				tagName = "段落";
				break;
			case 'ABBR':
			case 'ADDRESS':
			case 'B':
			case 'BLOCKQUOTE':
			case 'DEL':
			case 'EM':
			case 'INS':
			case 'KBD':
			case 'MARK':
			case 'PRE':
			case 'RP':
			case 'RT':
			case 'RUBY':
			case 'S':
			case 'SMALL':
			case 'STRONG':
			case 'SUB':
			case 'SUP':
			case 'TIME':
			case 'U':
			case 'VAR':
			case 'NOSCRIPT':
				tagName = "文本";
				break;
			case 'CODE':
				tagName = "代码";
				break;
			case 'METER':
				tagName = "仪表";
				break;
			case 'PROGRESS':
				tagName = "进度条";
				break;
			case 'Q':
				tagName = "引用";
				break;
			case 'SAMP':
				tagName = "示例";
				break;
			case 'FORM':
				tagName = "表单";
				break;
			case 'INPUT':
			case 'TEXTAREA':
				tagName = "输入框";
				break;
			case 'BUTTON':
				tagName = "按钮";
				break;
			case 'SELECT':
				tagName = "下拉列表";
				break;
			case 'FIELDSET':
				tagName = "集合";
				break;
			case 'OUTPUT':
				tagName = "输出";
				break;
			case 'IFRAME':
				tagName = "框架";
				break;
			case 'IMG':
			case 'SVG':
				tagName = "图片";
				break;
			case 'AREA':
				tagName = "图片区域";
				break;
			case 'CANVAS':
				tagName = "画布";
				break;
			case 'AUDIO':
				tagName = "音频";
				break;
			case 'VIDEO':
				tagName = "视频";
				break;
			case 'A':
				tagName = "链接";
				break;
			case 'NAV':
				tagName = "导航";
				break;
			case 'MENU':
			case 'UL':
			case 'OL':
				tagName = "列表";
				break;
			case 'LI':
				tagName = "列表项";
				break;
			case 'DL':
				tagName = "描述列表";
				break;
			case 'DT':
				tagName = "术语";
				break;
			case 'DD':
				tagName = "描述";
				break;
			case 'TABLE':
				tagName = "表格";
				break;
			case 'TH':
				tagName = "表头";
				break;
			case 'TR':
				tagName = "表格行";
				break;
			case 'TD':
				tagName = "表格单元";
				break;
			case 'THEAD':
				tagName = "表格头部";
				break;
			case 'TBODY':
				tagName = "表格主体";
				break;
			case 'TFOOT':
				tagName = "表格脚注";
				break;
			case 'HEADER':
				tagName = "页眉";
				break;
			case 'FOOTER':
				tagName = "页脚";
				break;
			case 'MAIN':
				tagName = "主体区域";
				break;
			case 'SECTION':
				tagName = "区域";
				break;
			case 'SEARCH':
				tagName = "搜索区域";
				break;
			case 'ARTICLE':
				tagName = "文章区域";
				break;
			case 'ASIDE':
				tagName = "侧边栏";
				break;
			case 'DETAILS':
				tagName = "详情";
				break;
			case 'DIALOG':
				tagName = "对话框";
				break;
			default:
				tagName = "元素";
				break;
		}
		return `来自 ${data.host} 的 ${tagName}`;
	})(data);
	elementDescription.value = data.textContent;

	const captureCancelButton = document.getElementById('capture-cancel');

	elementForm.addEventListener('reset', async function () {
		await Messages.send('Element.CaptureStart', null, data.pageTarget);

		location.reload();
	});
	captureCancelButton.addEventListener('click', function () {
		location.reload();
	});
	elementForm.addEventListener('submit', async function () {
		const name = elementName.value;
		const description = elementDescription.value;

		const elementList = await storage.getKey('Element.List') ?? [];
		elementList.push({
			id: Strings.uniqueId(),
			name: name,
			description: description,
			selector: data.selector,
			host: data.host
		});
		await storage.setKey('Element.List', elementList);

		location.reload();
	});
});

window.addEventListener('pagehide', async function () {
	await tempStorage.removeKey('Capture.ElementScreenshot');
});