<template>
	<el-breadcrumb class="breadcrumb">
		<el-breadcrumb-item to="CrxIndexHome">首页</el-breadcrumb-item>
		<el-breadcrumb-item>宏</el-breadcrumb-item>
	</el-breadcrumb>
	<el-table :data="tableData" class="table" header-row-class-name="table-header-row" max-height="calc(100vh - 130px)">
		<el-table-column align="center" width="70">
			<template #default="scope">
				<g-symbol align-text class="row-icon" font-size="2" grade="200">
					code
				</g-symbol>
			</template>
		</el-table-column>
		<el-table-column label="宏" prop="name" sortable>
			<template #default="scope">
				<div class="row-info">
					<span class="info-title">{{ scope.row.name }}</span>
					<span class="info-desc">{{ scope.row.description }}</span>
				</div>
			</template>
		</el-table-column>
		<el-table-column label="步数" prop="stepCount" sortable width="80"/>
		<el-table-column label="录制时间" prop="time" sortable width="180">
			<template #default="scope">
				{{ Strings.parseDatetime(scope.row.time) }}
			</template>
		</el-table-column>
		<el-table-column label="操作" width="200">
			<template #default="scope">
				<div class="row-btn-group">
					<el-button :icon="EditLargeBold" class="row-btn" plain round text type="primary"
							   @click="handleEdit(scope.$index, scope.row)">编辑
					</el-button>
					<el-button :icon="DeleteLargeBold" class="row-btn" plain round text type="danger"
							   @click="handleDelete(scope.$index, scope.row)">删除
					</el-button>
				</div>
			</template>
		</el-table-column>
	</el-table>
	<!-- 右下角+按钮 -->
	<el-button circle class="right-bottom-btn" size="large" type="primary" @click="createMacro" title="录制宏">
		<g-symbol font-size="2" grade="200">
			add
		</g-symbol>
	</el-button>
	<!-- 编辑宏对话框 -->
	<el-dialog v-model="editMacroDialog.visible" :close-on-click-modal="false" title="编辑宏"
			   @close="closeEditMacroDialog">
		<el-form ref="editMacroDialogForm" :model="editMacroDialog.form" :rules="editMacroDialog.formRules"
				 label-width="52px" @submit.prevent="confirmEditMacroDialog">
			<el-form-item label="名称" prop="name">
				<el-input v-model="editMacroDialog.form.name"/>
			</el-form-item>
			<el-form-item label="描述" prop="description">
				<el-input v-model="editMacroDialog.form.description" :rows="3" resize="none" type="textarea"/>
			</el-form-item>
		</el-form>
		<template #footer>
			<div>
				<el-button @click="closeEditMacroDialog">取消</el-button>
				<el-button type="primary" @click="confirmEditMacroDialog">确定</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
import {defineComponent, onMounted, reactive, ref} from 'vue';
import {storage} from "&/modules/chrome_api";
import GSymbol from "&/components/GSymbol.vue";
import {createGSymbol} from "&/utils/GSymbol.js";
import * as Strings from "&/modules/strings";
import {Messages} from "&/modules/messages.ts";

defineComponent({
	components: {GSymbol}
});

const EditLargeBold = createGSymbol('edit', {fontSize: 1.5}, {weight: 400, size: 20});
const DeleteLargeBold = createGSymbol('delete', {fontSize: 1.5}, {weight: 400, size: 20});

// 数据列表
const tableData = ref([]);

const refreshList = async () => {
	tableData.value = await storage.getKey('Macro.List') ?? [];
};

const editItem = async item => {
	const macroList = await storage.getKey('Macro.List') ?? [];
	let index = macroList.findIndex(i => i.id === item.id);
	if (index !== -1) {
		delete item.id;
		macroList[index] = {
			...macroList[index],
			...item
		};
		await storage.setKey('Macro.List', macroList);
	}
};

const deleteItem = async item => {
	const macroList = await storage.getKey('Macro.List') ?? [];
	let index = macroList.findIndex(i => i.id === item.id);
	if (index !== -1) {
		macroList.splice(index, 1);
		await storage.removeKey(`Macro.${item.id}`);
		await storage.setKey('Macro.List', macroList);
	}
};

chrome.storage.local.onChanged.addListener((changes) => {
	if (changes['Macro.List']) {
		tableData.value = changes['Macro.List'].newValue;
	}
});

onMounted(() => refreshList());

// 编辑宏
const editMacroDialog = reactive({
	visible: false,
	form: {
		id: '',
		name: '',
		description: ''
	},
	formRules: {
		name: [
			{required: true, message: '请输入名称', trigger: 'blur'}
		]
	}
});

const editMacroDialogForm = ref(null);

const showEditMacroDialog = () => {
	editMacroDialog.visible = true;
};

const confirmEditMacroDialog = () => {
	editMacroDialogForm.value.validate().then(() => {
		editItem(editMacroDialog.form);

		closeEditMacroDialog();
	}).catch(() => {});
};

const closeEditMacroDialog = () => {
	editMacroDialog.visible = false;
};

// 列表操作
const handleEdit = (index, row) => {
	editMacroDialog.form.id = row.id;
	editMacroDialog.form.name = row.name;
	editMacroDialog.form.description = row.description;

	editMacroDialogForm.value?.clearValidate();
	showEditMacroDialog();
};

const handleDelete = (index, row) => {
	deleteItem(row);
};

// 右下角操作
const createMacro = async () => {
	// 通知background.js打开录制窗口
	try {
		await Messages.send('Macro.InitRecord');
		await Messages.send('Macro.ReadyRecord');
	} catch (e) {
		alert(e);
	}
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