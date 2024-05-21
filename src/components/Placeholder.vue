<template>
	<div style="padding: 5px 0;">
		<div :style="{opacity: active ? 1 : 0}"
			 style="height: 3px; background-color: var(--el-color-primary); border-radius: 100px;"
		/>
	</div>
</template>

<script>

export default {
	name: 'Placeholder',
	props: {
		active: {
			type: Boolean,
			default: false
		}
	},
	methods: {}
};
</script>

<style>
</style>