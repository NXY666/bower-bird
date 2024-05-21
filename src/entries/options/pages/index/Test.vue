<template>
	<div style="display: flex;">
		<div style="padding: 20px; background-color: var(--el-bg-color);">
			<div>
				<el-button>normal</el-button>
				<el-button text>text</el-button>
				<el-button text bg>text bg</el-button>
				<el-button plain>plain</el-button>
				<el-button plain style="margin-right: 12px;" text>plain text</el-button>
				<el-button disabled>normal</el-button>
				<el-button disabled text>text</el-button>
				<el-button disabled plain>plain</el-button>
				<el-button disabled plain style="margin-right: 12px;" text>plain text</el-button>
			</div>
			<div style="margin-top: 10px;">
				<el-button type="primary">normal</el-button>
				<el-button text type="primary">text</el-button>
				<el-button text bg type="primary">text bg</el-button>
				<el-button plain type="primary">plain</el-button>
				<el-button plain style="margin-right: 12px;" text type="primary">plain text</el-button>
				<el-button disabled type="primary">normal</el-button>
				<el-button disabled text type="primary">text</el-button>
				<el-button disabled plain type="primary">plain</el-button>
				<el-button disabled plain style="margin-right: 12px;" text type="primary">plain text</el-button>
				<span style="color: var(--el-color-primary-light-9);">█</span>
				<span style="color: var(--el-color-primary-light-8);">█</span>
				<span style="color: var(--el-color-primary-light-7);">█</span>
				<span style="color: var(--el-color-primary-light-6);">█</span>
				<span style="color: var(--el-color-primary-light-5);">█</span>
				<span style="color: var(--el-color-primary-light-4);">█</span>
				<span style="color: var(--el-color-primary-light-3);">█</span>
				<span style="color: var(--el-color-primary-light-2);">█</span>
				<span style="color: var(--el-color-primary-light-1);">█</span>
				<span style="color: var(--el-color-primary);"> █ </span>
				<span style="color: var(--el-color-primary-dark-1);">█</span>
				<span style="color: var(--el-color-primary-dark-2);">█</span>
				<span style="color: var(--el-color-primary-dark-3);">█</span>
				<span style="color: var(--el-color-primary-dark-4);">█</span>
				<span style="color: var(--el-color-primary-dark-5);">█</span>
				<span style="color: var(--el-color-primary-dark-6);">█</span>
				<span style="color: var(--el-color-primary-dark-7);">█</span>
				<span style="color: var(--el-color-primary-dark-8);">█</span>
				<span style="color: var(--el-color-primary-dark-9);">█</span>
			</div>
			<div style="margin-top: 10px;">
				<el-button type="success">normal</el-button>
				<el-button text type="success">text</el-button>
				<el-button text bg type="success">text bg</el-button>
				<el-button plain type="success">plain</el-button>
				<el-button plain style="margin-right: 12px;" text type="success">plain text</el-button>
				<el-button disabled type="success">normal</el-button>
				<el-button disabled text type="success">text</el-button>
				<el-button disabled plain type="success">plain</el-button>
				<el-button disabled plain style="margin-right: 12px;" text type="success">plain text</el-button>
				<span style="color: var(--el-color-success-light-9);">█</span>
				<span style="color: var(--el-color-success-light-8);">█</span>
				<span style="color: var(--el-color-success-light-7);">█</span>
				<span style="color: var(--el-color-success-light-6);">█</span>
				<span style="color: var(--el-color-success-light-5);">█</span>
				<span style="color: var(--el-color-success-light-4);">█</span>
				<span style="color: var(--el-color-success-light-3);">█</span>
				<span style="color: var(--el-color-success-light-2);">█</span>
				<span style="color: var(--el-color-success-light-1);">█</span>
				<span style="color: var(--el-color-success);"> █ </span>
				<span style="color: var(--el-color-success-dark-1);">█</span>
				<span style="color: var(--el-color-success-dark-2);">█</span>
				<span style="color: var(--el-color-success-dark-3);">█</span>
				<span style="color: var(--el-color-success-dark-4);">█</span>
				<span style="color: var(--el-color-success-dark-5);">█</span>
				<span style="color: var(--el-color-success-dark-6);">█</span>
				<span style="color: var(--el-color-success-dark-7);">█</span>
				<span style="color: var(--el-color-success-dark-8);">█</span>
				<span style="color: var(--el-color-success-dark-9);">█</span>
			</div>
			<div style="margin-top: 10px;">
				<el-button type="warning">normal</el-button>
				<el-button text type="warning">text</el-button>
				<el-button text bg type="warning">text bg</el-button>
				<el-button plain type="warning">plain</el-button>
				<el-button plain style="margin-right: 12px;" text type="warning">plain text</el-button>
				<el-button disabled type="warning">normal</el-button>
				<el-button disabled text type="warning">text</el-button>
				<el-button disabled plain type="warning">plain</el-button>
				<el-button disabled plain style="margin-right: 12px;" text type="warning">plain text</el-button>
				<span style="color: var(--el-color-warning-light-9);">█</span>
				<span style="color: var(--el-color-warning-light-8);">█</span>
				<span style="color: var(--el-color-warning-light-7);">█</span>
				<span style="color: var(--el-color-warning-light-6);">█</span>
				<span style="color: var(--el-color-warning-light-5);">█</span>
				<span style="color: var(--el-color-warning-light-4);">█</span>
				<span style="color: var(--el-color-warning-light-3);">█</span>
				<span style="color: var(--el-color-warning-light-2);">█</span>
				<span style="color: var(--el-color-warning-light-1);">█</span>
				<span style="color: var(--el-color-warning);"> █ </span>
				<span style="color: var(--el-color-warning-dark-1);">█</span>
				<span style="color: var(--el-color-warning-dark-2);">█</span>
				<span style="color: var(--el-color-warning-dark-3);">█</span>
				<span style="color: var(--el-color-warning-dark-4);">█</span>
				<span style="color: var(--el-color-warning-dark-5);">█</span>
				<span style="color: var(--el-color-warning-dark-6);">█</span>
				<span style="color: var(--el-color-warning-dark-7);">█</span>
				<span style="color: var(--el-color-warning-dark-8);">█</span>
				<span style="color: var(--el-color-warning-dark-9);">█</span>
			</div>
			<div style="margin-top: 10px;">
				<el-button type="danger">normal</el-button>
				<el-button text type="danger">text</el-button>
				<el-button text bg type="danger">text bg</el-button>
				<el-button plain type="danger">plain</el-button>
				<el-button plain style="margin-right: 12px;" text type="danger">plain text</el-button>
				<el-button disabled type="danger">normal</el-button>
				<el-button disabled text type="danger">text</el-button>
				<el-button disabled plain type="danger">plain</el-button>
				<el-button disabled plain style="margin-right: 12px;" text type="danger">plain text</el-button>
				<span style="color: var(--el-color-danger-light-9);">█</span>
				<span style="color: var(--el-color-danger-light-8);">█</span>
				<span style="color: var(--el-color-danger-light-7);">█</span>
				<span style="color: var(--el-color-danger-light-6);">█</span>
				<span style="color: var(--el-color-danger-light-5);">█</span>
				<span style="color: var(--el-color-danger-light-4);">█</span>
				<span style="color: var(--el-color-danger-light-3);">█</span>
				<span style="color: var(--el-color-danger-light-2);">█</span>
				<span style="color: var(--el-color-danger-light-1);">█</span>
				<span style="color: var(--el-color-danger);"> █ </span>
				<span style="color: var(--el-color-danger-dark-1);">█</span>
				<span style="color: var(--el-color-danger-dark-2);">█</span>
				<span style="color: var(--el-color-danger-dark-3);">█</span>
				<span style="color: var(--el-color-danger-dark-4);">█</span>
				<span style="color: var(--el-color-danger-dark-5);">█</span>
				<span style="color: var(--el-color-danger-dark-6);">█</span>
				<span style="color: var(--el-color-danger-dark-7);">█</span>
				<span style="color: var(--el-color-danger-dark-8);">█</span>
				<span style="color: var(--el-color-danger-dark-9);">█</span>
			</div>
			<div style="margin-top: 10px;">
				<el-button type="info">normal</el-button>
				<el-button text type="info">text</el-button>
				<el-button text bg type="info">text bg</el-button>
				<el-button plain type="info">plain</el-button>
				<el-button plain style="margin-right: 12px;" text type="info">plain text</el-button>
				<el-button disabled type="info">normal</el-button>
				<el-button disabled text type="info">text</el-button>
				<el-button disabled plain type="info">plain</el-button>
				<el-button disabled plain style="margin-right: 12px;" text type="info">plain text</el-button>
				<span style="color: var(--el-color-info-light-9);">█</span>
				<span style="color: var(--el-color-info-light-8);">█</span>
				<span style="color: var(--el-color-info-light-7);">█</span>
				<span style="color: var(--el-color-info-light-6);">█</span>
				<span style="color: var(--el-color-info-light-5);">█</span>
				<span style="color: var(--el-color-info-light-4);">█</span>
				<span style="color: var(--el-color-info-light-3);">█</span>
				<span style="color: var(--el-color-info-light-2);">█</span>
				<span style="color: var(--el-color-info-light-1);">█</span>
				<span style="color: var(--el-color-info);"> █ </span>
				<span style="color: var(--el-color-info-dark-1);">█</span>
				<span style="color: var(--el-color-info-dark-2);">█</span>
				<span style="color: var(--el-color-info-dark-3);">█</span>
				<span style="color: var(--el-color-info-dark-4);">█</span>
				<span style="color: var(--el-color-info-dark-5);">█</span>
				<span style="color: var(--el-color-info-dark-6);">█</span>
				<span style="color: var(--el-color-info-dark-7);">█</span>
				<span style="color: var(--el-color-info-dark-8);">█</span>
				<span style="color: var(--el-color-info-dark-9);">█</span>
			</div>
			<div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
				<el-switch v-model="switch1" inactive-text="否" active-text="是" inline-prompt size="small"/>
				<el-switch v-model="switch2" inactive-text="否" active-text="是" inline-prompt size="default"/>
				<el-switch v-model="switch3" inactive-text="否" active-text="是" inline-prompt size="large"/>
			</div>
		</div>
	</div>
</template>

<script>

export default {
	name: 'Test',
	data() {
		return {
			switch1: true,
			switch2: true,
			switch3: true
		};
	},
	async created() {
	},
	methods: {
		async c1() {

		}
	}
};
</script>

<style>
</style>