<template>
	<el-breadcrumb class="breadcrumb">
		<el-breadcrumb-item to="CrxIndexHome">首页</el-breadcrumb-item>
	</el-breadcrumb>
	<el-table :data="tableData" class="table" header-row-class-name="table-header-row" max-height="calc(100vh - 130px)">
		<el-table-column align="center" prop="state" width="70">
			<template #default="scope">
				<el-switch v-model="scope.row.state" class="row-switch" size="small"
						   @change="handleSwitch(scope.$index, scope.row)"/>
			</template>
		</el-table-column>
		<el-table-column label="脚本" prop="name" sortable>
			<template #default="scope">
				<div class="row-info">
					<span class="info-title">{{ scope.row.name }}</span>
					<span class="info-desc">{{ scope.row.description }}</span>
				</div>
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
	<el-button circle class="right-bottom-btn" size="large" type="primary" @click="showCreateScriptDialog"
			   title="新建脚本">
		<g-symbol font-size="2" grade="200">
			add
		</g-symbol>
	</el-button>
	<!-- 新建脚本对话框 -->
	<el-dialog v-model="createScriptDialog.visible" :close-on-click-modal="false" title="新建脚本"
			   @close="closeCreateScriptDialog">
		<el-form ref="createScriptDialogForm" :model="createScriptDialog.form" :rules="createScriptDialog.formRules"
				 label-width="52px" @submit.prevent="confirmCreateScriptDialog">
			<el-form-item label="名称" prop="name">
				<el-input v-model="createScriptDialog.form.name"/>
			</el-form-item>
			<el-form-item label="描述" prop="description" @keydown.ctrl.enter="confirmCreateScriptDialog">
				<el-input v-model="createScriptDialog.form.description" :rows="3" resize="none" type="textarea"/>
			</el-form-item>
		</el-form>
		<template #footer>
			<div>
				<el-button @click="closeCreateScriptDialog">取消</el-button>
				<el-button type="primary" @click="confirmCreateScriptDialog">确定</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
import {onMounted, reactive, ref} from 'vue';
import {storage} from "&/modules/chrome_api";
import {createScript, deleteScript, setScript} from "&/classes/Script.ts";
import GSymbol from "&/components/GSymbol.vue";
import {createGSymbol} from "&/utils/GSymbol.js";
import {useRouter} from "vue-router";

const router = useRouter();

const EditLargeBold = createGSymbol('edit', {fontSize: 1.5}, {weight: 400, size: 20});
const DeleteLargeBold = createGSymbol('delete', {fontSize: 1.5}, {weight: 400, size: 20});

// 列表数据
const tableData = ref([]);

const getScriptList = async (rawScriptList = null) => {
	const scriptList = rawScriptList ?? await storage.getKey('Script.List') ?? [];
	for (let i = 0; i < scriptList?.length; i++) {
		scriptList[i] = await createScript(scriptList[i]);
	}
	return scriptList;
};

chrome.storage.local.onChanged.addListener(async (changes) => {
	if (changes['Script.List']) {
		tableData.value = await getScriptList(changes['Script.List'].newValue);
	}
});

onMounted(async () => {
	tableData.value = await getScriptList();
});

// 新建脚本
const createScriptDialog = reactive({
	visible: false,
	form: {
		name: '',
		description: ''
	},
	formRules: {
		name: [
			{required: true, message: '请输入名称', trigger: 'blur'}
		]
	}
});

const createScriptDialogForm = ref(null);

const showCreateScriptDialog = () => {
	createScriptDialog.form.name = '';
	createScriptDialog.form.description = '';

	createScriptDialogForm.value?.clearValidate();
	createScriptDialog.visible = true;
};

const confirmCreateScriptDialog = () => {
	createScriptDialogForm.value.validate().then(async () => {
		const newScript = await createScript(createScriptDialog.form);
		await setScript(newScript);

		closeCreateScriptDialog();
	}).catch(() => {});
};

const closeCreateScriptDialog = () => {
	createScriptDialog.visible = false;
};

// 列表操作
const handleSwitch = async (index, row) => {
	await setScript(row);
};

const handleEdit = (index, row) => {
	router.push({name: 'CrxEditor', params: {id: row.id}});
};

const handleDelete = async (index, row) => {
	await deleteScript(row.id);
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