<template>
	<span :style="{
		color,
		fontStyle,
		fontSize: `${fontSize}em`,
		position: alignText ? 'relative' : '',
		top: alignText ? '0.125em' : '',
		'--font-family': _family,
		'--font-fill': fill ? 1 : 0,
		'--font-wght': weight,
		'--font-grad': grade,
		'--font-opsz': size
	}" class="material-symbols">
		<slot></slot>
	</span>
</template>

<script>
function unsupportedWarning(prop, useValue, allowValues) {
	console.warn("[GSymbol] 可用的", prop, "值为", allowValues, "，填写的", JSON.stringify(useValue), "不受支持。");
}

export default {
	name: "GSymbol",
	props: {
		color: {
			type: String,
			default: ""
		},
		fontStyle: {
			type: String,
			enum: ["normal", "italic", "oblique"],
			default: "normal",
			validator: value => {
				if (["normal", "italic", "oblique", ""].includes(value)) {
					return true;
				}
				unsupportedWarning("fontStyle", value, ["normal", "italic", "oblique", ""]);
			}
		},
		fontSize: {
			type: [String, Number],
			default: "1"
		},
		alignText: {
			type: Boolean,
			default: false
		},
		family: {
			type: String,
			enum: ["outlined", "rounded", "sharp"],
			default: "rounded",
			validator: value => {
				if (["outlined", "rounded", "sharp"].includes(value?.toLowerCase())) {
					return true;
				}
				unsupportedWarning("family", value, ["outlined", "rounded", "sharp"]);
			}
		},
		fill: {
			type: Boolean,
			default: false
		},
		weight: {
			type: [Number, String],
			enum: [100, 200, 300, 400, 500, 600, 700],
			default: 400,
			validator: value => {
				if (typeof value === "string") {
					value = parseInt(value);
				}
				if ([100, 200, 300, 400, 500, 600, 700].includes(value)) {
					return true;
				}
				unsupportedWarning("weight", value, [100, 200, 300, 400, 500, 600, 700]);
			}
		},
		grade: {
			type: [Number, String],
			enum: [-25, 0, 200],
			default: 0,
			validator: value => {
				if (typeof value === "string") {
					value = parseInt(value);
				}
				if ([-25, 0, 200].includes(value)) {
					return true;
				}
				unsupportedWarning("grade", value, [-25, 0, 200]);
			}
		},
		size: {
			type: [Number, String],
			enum: [20, 24, 40, 48],
			default: 24,
			validator: (value) => {
				if (typeof value === "string") {
					value = parseInt(value);
				}
				if ([20, 24, 40, 48].includes(value)) {
					return true;
				}
				unsupportedWarning("size", value, [20, 24, 40, 48]);
			}
		}
	},
	computed: {
		_family() {
			return `material symbols ${this.family}`;
		}
	}
};
</script>

<style scoped>
@import 'https://fonts.googleapis.cn/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
@import 'https://fonts.googleapis.cn/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
@import 'https://fonts.googleapis.cn/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';

@font-face {
	font-family: 'Empty Font';
	src: url('data:font/woff2;charset=utf-8;base64,d09GMgABAAAAAAKoAA4AAAAABswAAAJRAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cGh4GYACCUggEEQgKKIEQC1IAATYCJANYBCAFhBMHgQAb7AURFZyNyL464A3Rp54QoVtfdCJhCGPyRQbwO4HXGlAThRkPfo6H7+c+z33JAqMqMasFWUAHrL/wXWfqCcazitqWEf7HWmlBIf88xpCatbyD2xyktAg0D8lMLh56eic8HK+Lf5/nZpzBbygnsgYuj9YAm0M5iu4Flp0e0oHYiRwINzhv6OLT0x3hJlxCwPtyYg4+b/wmuf+JQC3akYQwIeRIyONXvFFGepbGC/BvxEcSiaQsAxAAcOjG9mseWeRONlisciaVQABgUCBDhl4B9skEeuUWoVKlhNUuulNgkYsuF8W7heKtACDKCUAkJABAAACQ5WXlFbch7Ea8OvUNvacyj/r5wzjNy7oBPHCG0m1EIYFJcAgJlagGVIIEFPO8pqwuP0G+dfVQCT8GOxUABIKTK1980XW/K2uyn3XxcTRETKcSKiUQpBLOxAzEtAAA5DFjCGI/lAcmK3FLQghsAlBvQQC6rRAhVLmOpMJDZMa8Q64q6lCmIVael6uKszKRV2EZAKHZYST15pHZ4zFyzf6jTH90vKdcc+y01TzM1c/dYjJ7gnYBrqdIWbeeF0twfILfg5ph6q0trj+VcPhVIHB6WjztBj0SgrkO6UpPAq7B5GXXuANHpcUAiC5JBBvfTYa8mS/quZYMpbiyMB7WU1IDKz45eXCfBqgve9cXzEeRmMc+Ve1VRSKM7x6WKrkQcYZ4kQPLuICUl6xXRhYKsv6jPhYDJEUmEkukMrlCqVL78QQiiUyh0ugMJovN4fL4AqFILJHK5Iryaf9dZ9IYFAA=') format('woff2');
}

.material-symbols {
	--font-family: '';
	--font-fill: 0;
	--font-wght: 400;
	--font-grad: 0;
	--font-opsz: 48;
}

.material-symbols {
	font-family: var(--font-family), 'Empty Font';
	font-weight: normal;
	line-height: 1;
	display: inline-block;
	user-select: none;
	white-space: nowrap;
	letter-spacing: normal;
	text-transform: none;
	word-wrap: normal;
	font-variation-settings: 'FILL' var(--font-fill), 'wght' var(--font-wght), 'GRAD' var(--font-grad), 'opsz' var(--font-opsz);
	direction: ltr;
	font-feature-settings: 'liga';
	-webkit-font-feature-settings: 'liga';
	-webkit-font-smoothing: antialiased;
}
</style>