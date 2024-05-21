<template>
	<el-breadcrumb class="breadcrumb">
		<el-breadcrumb-item to="CrxIndexHome">首页</el-breadcrumb-item>
		<el-breadcrumb-item>日志</el-breadcrumb-item>
	</el-breadcrumb>
	<el-table :data="tableData" class="table" header-row-class-name="table-header-row" max-height="calc(100vh - 130px)">
		<el-table-column align="center" width="70">
			<template #default="scope">
				<g-symbol :style="{backgroundImage:logColor(scope.row.type)}" align-text class="row-icon"
						  font-size="2" grade="200">
					{{ logIcon(scope.row.type) }}
				</g-symbol>
			</template>
		</el-table-column>
		<el-table-column label="日志" prop="message"/>
		<el-table-column label="时间" prop="time" sortable width="200">
			<template #default="scope">
				{{ Strings.parseDatetime(scope.row.time) }}
			</template>
		</el-table-column>
	</el-table>
	<!-- 右下角+按钮 -->
	<el-button circle class="right-bottom-btn" size="large" type="danger" @click="clearLog" title="清空日志">
		<g-symbol fill font-size="2">delete_forever</g-symbol>
	</el-button>
</template>

<script setup>
import {defineComponent, onMounted, ref} from 'vue';
import {storage} from '&/modules/chrome_api';
import GSymbol from '&/components/GSymbol.vue';
import * as Strings from "&/modules/strings.ts";

defineComponent({
	components: {GSymbol}
});

// 数据列表
const tableData = ref([]);

const logIcon = type => {
	switch (type) {
		case 'error':
		case 'warn':
			return 'warning';
		case 'info':
		case 'log':
			return 'info';
	}
};

const logColor = type => {
	switch (type) {
		case 'error':
			return 'linear-gradient(to right, var(--el-color-error-light-2), var(--el-color-error-dark-2))';
		case 'warn':
			return 'linear-gradient(to right, var(--el-color-warning-light-2), var(--el-color-warning-dark-2))';
		case 'info':
			return 'linear-gradient(to right, var(--el-color-success-light-2), var(--el-color-success-dark-2))';
		case 'log':
			return 'linear-gradient(to right, var(--el-color-info-light-2), var(--el-color-info-dark-2))';
	}
};

const refreshList = async () => {
	tableData.value = await storage.getKey('Log.List') ?? [];
};

chrome.storage.local.onChanged.addListener((changes) => {
	if (changes['Log.List']) {
		tableData.value = changes['Log.List'].newValue;
	}
});

onMounted(() => refreshList());

// 右下角操作
const clearLog = () => {
	storage.removeKey('Log.List');
};
</script>

<style lang="scss" scoped>
.right-bottom-btn {
  position: fixed;
  right: 30px;
  bottom: 30px;
  width: 50px;
  z-index: 2000;
  height: 50px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s;

  &:active {
    transform: scale(0.95);
  }
}

@media (prefers-color-scheme: light) {
  .right-bottom-btn {
    border: none;
  }
}
</style>