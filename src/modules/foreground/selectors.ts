import {getCssSelector} from "css-selector-generator";
import {CssSelectorGeneratorOptionsInput} from "css-selector-generator/src/types";

/**
 * 获取元素的 CSS 选择器
 * @param element 元素
 * @param options 选择器生成器的选项
 * @returns CSS 选择器
 */
export function getOptionCssSelector(element: Element, options: CssSelectorGeneratorOptionsInput): string[] {
	// 元素是Document对象时，返回body
	if (element instanceof Document) {
		return ["body"];
	}

	// 元素未知时，返回unknown
	if (!element || !element.getRootNode) {
		console.warn('[Selectors.getOptionCssSelector]', 'Unknown element:', element);
		return ["unknown"];
	}

	// 元素的根节点是Document对象时，直接返回元素的选择器
	if (element.getRootNode() instanceof Document) {
		return [getCssSelector(element, options)];
	}

	const path = [];

	let currentElement = element;
	while (currentElement) {
		const selector = getCssSelector(currentElement, options);
		path.unshift(selector); // 将当前元素的选择器添加到路径数组的开头

		const rootNode = currentElement.getRootNode();
		if (rootNode instanceof ShadowRoot) {
			currentElement = rootNode.host;
		} else {
			break;
		}
	}

	return path;
}

/**
 * 获取元素的高质量 CSS 选择器
 * @param element 元素
 * @returns CSS 选择器
 */
export function getHighQualityCssSelector(element: Element) {
	const highQualityCssSelectorOptions = {
		combineBetweenSelectors: true,
		combineWithinSelector: true,
		includeTag: true,
		selectors: ["id", "tag", "class", "nthchild", "nthoftype"],
		root: element.getRootNode() ?? document
	} as CssSelectorGeneratorOptionsInput;
	return getOptionCssSelector(element, highQualityCssSelectorOptions);
}

/**
 * 获取元素的回退 CSS 选择器
 * @param element 元素
 * @returns CSS 选择器
 */
export function getFallbackCssSelector(element: Element) {
	const fallbackCssSelectorOptions = {
		combineBetweenSelectors: true,
		combineWithinSelector: true,
		includeTag: true,
		selectors: [],
		blacklist: ["*"],
		root: element.getRootNode() ?? document
	} as CssSelectorGeneratorOptionsInput;
	return getOptionCssSelector(element, fallbackCssSelectorOptions);
}

/**
 * 获取选择器指向的元素
 * @param root 根元素
 * @param selectors 选择器
 * @returns 元素
 */
export function deepQuerySelector(root: Element | Document, selectors: string[] = null): Element {
	return selectors?.reduce((prev, curr) => prev?.['shadowRoot']?.querySelector(curr) ?? prev?.querySelector(curr), root);
}
