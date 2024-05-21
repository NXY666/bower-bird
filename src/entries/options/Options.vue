<template>
	<el-config-provider :locale="locale">
		<router-view/>
	</el-config-provider>
</template>

<script>
import {zhCn} from "element-plus/es/locale/index";
import {useDark} from "@vueuse/core";

export default {
	name: 'Options',
	setup() {
		return {
			locale: zhCn,
			isDark: useDark({
				onChanged: isDark => {
					if (isDark) {
						document.documentElement.classList.add("dark");
					} else {
						document.documentElement.classList.remove("dark");
					}
				}
			})
		};
	},
	data() {
		return {};
	},
	methods: {},
	async created() {
	},
	mounted() {
	},
	beforeUnmount() {
	}
};
</script>

<style scoped>
</style>

<style lang="scss">
@import '@OPT/options';
</style>
