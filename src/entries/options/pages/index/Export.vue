<template>
	<el-breadcrumb class="breadcrumb">
		<el-breadcrumb-item to="CrxIndexHome">首页</el-breadcrumb-item>
		<el-breadcrumb-item>数据</el-breadcrumb-item>
	</el-breadcrumb>
	<el-table :data="tableData" class="table" header-row-class-name="table-header-row" max-height="calc(100vh - 130px)"
			  @filter-change="handleFilterChange">
		<el-table-column align="center" width="70">
			<template #default="scope">
				<g-symbol align-text class="row-icon" font-size="2" grade="200">
					description
				</g-symbol>
			</template>
		</el-table-column>
		<el-table-column :filter-method="filterMethod" :filters="tableNameFilters" column-key="name" label="名称"
						 prop="name" sortable width="150px">
			<template #default="scope">
				<div class="row-info">
					<div class="info-title">{{ scope.row.name }}</div>
				</div>
			</template>
		</el-table-column>
		<el-table-column label="数据" prop="data">
			<template #default="scope">
				<el-tag v-for="item in handleRowData(scope.row.data)" type="info" style="margin-right: 15px"
						disable-transitions>
					{{ item.key }}: {{ item.value }}
				</el-tag>
			</template>
		</el-table-column>
		<el-table-column label="时间" prop="time" sortable width="200">
			<template #default="scope">
				{{ Strings.parseDatetime(scope.row.time) }}
			</template>
		</el-table-column>
	</el-table>
	<!-- 右下角+按钮 -->
	<el-button circle class="right-bottom-btn" size="large" type="primary" @click="exportData" title="导出数据">
		<g-symbol fill font-size="1.9">output</g-symbol>
	</el-button>
	<el-button circle class="right-bottom-secondary-btn" size="small" type="danger" @click="clearData" title="清空数据">
		<g-symbol fill font-size="2">delete_forever</g-symbol>
	</el-button>
</template>

<script setup>
import {defineComponent, onMounted, ref} from 'vue';
import {storage} from '&/modules/chrome_api';
import GSymbol from '&/components/GSymbol.vue';
import * as Strings from "&/modules/strings.ts";
import * as XLSX from "xlsx";

defineComponent({
	components: {GSymbol}
});

// 数据列表
const tableData = ref([]);
const tableNameFilters = ref([]);
const activeFilter = ref([]);

const refreshList = async (list = null) => {
	tableData.value = list ?? await storage.getKey('Data.List') ?? [];
	tableNameFilters.value = tableData.value.map(item => {
		return {text: item.name, value: item.name};
	}).filter((item, index, self) => {
		return self.findIndex(t => t.value === item.value) === index;
	});
};

const filterMethod = (value, row) => row.name === value;

const handleFilterChange = filters => {
	activeFilter.value = filters;
};

const handleRowData = data => {
	const res = [];
	switch (typeof data) {
		case 'object':
			Object.keys(data).forEach(key => {
				res.push({type: "success", key: key, value: data[key]});
			});
			break;
		case 'string':
			res.push({type: "info", key: "文本", value: data});
			break;
		case 'boolean':
			res.push({type: "danger", key: "是非", value: data});
			break;
		case 'number':
			res.push({type: "warning", key: "数字", value: data});
			break;
		default:
			return '';
	}
	return res;
};

chrome.storage.local.onChanged.addListener(changes => {
	if (changes['Data.List']) {
		refreshList(changes['Data.List'].newValue);
	}
});

onMounted(() => refreshList());

// 右下角操作
const exportData = () => {
	const columns = [];
	const data = tableData.value.filter(item => {
		return activeFilter.value.name?.length ? Array.from(activeFilter.value.name).includes(item.name) : true;
	}).map(item => {
		const row = [];
		const rowObj = {};
		const data = item.data;
		switch (typeof data) {
			case 'object':
				Object.keys(data).forEach(key => {
					if (!columns.includes(key)) {
						columns.push(key);
					}
					rowObj[key] = data[key];
				});
				break;
			case 'string':
				if (!columns.includes('文本')) {
					columns.push('文本');
				}
				row.push({
					'文本': data
				});
				break;
			case "boolean":
				if (!columns.includes('是非')) {
					columns.push('是非');
				}
				row.push({
					'是非': data
				});
				break;
			case "number":
				if (!columns.includes('数字')) {
					columns.push('数字');
				}
				row.push({
					'数字': data
				});
				break;
			default:
				row.push(data.toString());
		}
		columns.forEach(column => {
			row.push(rowObj[column] ?? '');
		});
		return row;
	});
	data.unshift(columns);

	// 用xslx库导出数据
	const ws = XLSX.utils.aoa_to_sheet(data);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
	XLSX.writeFile(wb, `数据导出-${Strings.parseDatetime(Date.now()).replaceAll(/[-: ]/g, "_")}.xlsx`);
};

const clearData = () => {
	storage.removeKey('Data.List');
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

.right-bottom-secondary-btn {
  position: fixed;
  right: 35px;
  bottom: 100px;
  width: 40px;
  z-index: 2000;
  height: 40px;
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

  .right-bottom-secondary-btn {
    border: none;
  }
}
</style>