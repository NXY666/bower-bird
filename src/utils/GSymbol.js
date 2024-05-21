import * as Vue from "vue"; // 实际未使用，但是如果不加IDEA会因为不认识Vue.Vode而误报Warning。
import GSymbol from "&/components/GSymbol.vue";

/**
 * @param {string} code 图标代码
 * @param {string} color CSS图标颜色
 * @param {string} fontStyle CSS字体样式
 * @param {number} fontSize CSS字体大小
 * @param {boolean} alignText 文本对齐
 * @param {string} family 字体家族
 * @param {boolean} fill 填充
 * @param {number} weight 粗细
 * @param {number} grade 等级
 * @param {number} size 大小
 * @return {Vue.Component} 图标组件
 */
export function createGSymbol(
	code,
	{color = undefined, fontStyle = undefined, fontSize = undefined, alignText = undefined} = {},
	{family = undefined, fill = undefined, weight = undefined, grade = undefined, size = undefined} = {}
) {
	return Vue.createVNode(GSymbol, {
		color: color ?? GSymbol.props.color.default,
		fontStyle: fontStyle ?? GSymbol.props.fontStyle.default,
		fontSize: fontSize ?? GSymbol.props.fontSize.default,
		alignText: alignText ?? GSymbol.props.alignText.default,
		family: family ?? GSymbol.props.family.default,
		fill: fill ?? GSymbol.props.fill.default,
		weight: weight ?? GSymbol.props.weight.default,
		grade: grade ?? GSymbol.props.grade.default,
		size: size ?? GSymbol.props.size.default
	}, {
		default: () => code
	});
}