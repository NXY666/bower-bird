<template>
	<error-box>
		<template #title>啊哦！</template>
		<template #content>网络状态不佳，请重试。</template>
		<template #button-group>
			<el-button color="#515151" round style="margin-left: auto;" @click="retry()">重试</el-button>
		</template>
	</error-box>
</template>

<script>
import ErrorBox from "&/components/ErrorBox.vue";

export default {
	name: "ConnectionFailed",
	components: {ErrorBox},
	methods: {
		retry() {
			this.$router.replace({name: "CrxWelcome"});
		}
	}
};
</script>