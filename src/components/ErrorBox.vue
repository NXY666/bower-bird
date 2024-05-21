<template>
	<div :style="{opacity}" class="box" style="transition: all 0.2s ease-in-out;">
		<h1 class="box-header">
			<slot name="title"/>
		</h1>
		<div class="box-content">
			<slot name="content"/>
		</div>
		<div class="box-button-group">
			<slot name="button-group"/>
		</div>
		<div style="position: absolute; top: 15px; right: 15px;">
			<el-button :icon="Close" circle color="#FFFFFF" size="small" text @click="close()"/>
		</div>
	</div>
</template>

<script>
import {Close} from "@element-plus/icons-vue";

export default {
	name: "ErrorBox",
	setup() {
		return {Close};
	},
	data() {
		return {
			opacity: 0,
			closed: false
		};
	},
	mounted() {
		setTimeout(() => {
			this.opacity = 1;
		}, 100);
	},
	methods: {
		close() {
			this.opacity = 0;
			this.closed = true;
			setTimeout(() => {
				window.close();
			}, 200);
		}
	}
};
</script>

<style scoped>
.box {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	width: 350px;
	height: fit-content;
	margin: auto;
	padding: 20px 25px;
	transform: translateY(-50px);
	border-radius: 20px;
	background-color: #FDFDFF;
	box-shadow: 0 1px 6px rgb(32 33 36 / 28%);
}

.box-header {
	font-size: 22px;
	color: #515151;
}

.box-content {
	font-size: 16px;
	line-height: 1.5;
	margin-top: 20px;
	color: #515151;
}

.box-button-group {
	display: flex;
	margin-top: 30px;
}
</style>