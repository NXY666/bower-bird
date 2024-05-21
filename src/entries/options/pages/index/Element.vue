<template>
	<el-breadcrumb class="breadcrumb">
		<el-breadcrumb-item to="CrxIndexHome">首页</el-breadcrumb-item>
		<el-breadcrumb-item>元素</el-breadcrumb-item>
	</el-breadcrumb>
	<el-table :data="tableData" class="table" header-row-class-name="table-header-row" max-height="calc(100vh - 130px)">
		<el-table-column align="center" width="70">
			<template #default="scope">
				<g-symbol align-text class="row-icon" font-size="2" grade="200">
					token
				</g-symbol>
			</template>
		</el-table-column>
		<el-table-column label="元素" prop="name" sortable>
			<template #default="scope">
				<div class="row-info">
					<span class="info-title">{{ scope.row.name }}</span>
					<span class="info-desc">{{ scope.row.description }}</span>
				</div>
			</template>
		</el-table-column>
		<el-table-column label="网站" prop="host" sortable width="180"/>
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
	<!-- 编辑元素对话框 -->
	<el-dialog v-model="editElementDialog.visible" :close-on-click-modal="false" title="编辑元素"
			   @close="closeEditElementDialog">
		<el-form ref="editElementDialogForm" :model="editElementDialog.form" :rules="editElementDialog.formRules"
				 label-width="52px" @submit.prevent="confirmEditElementDialog">
			<el-form-item label="名称" prop="name">
				<el-input v-model="editElementDialog.form.name"/>
			</el-form-item>
			<el-form-item label="描述" prop="description">
				<el-input v-model="editElementDialog.form.description" :rows="3" resize="none" type="textarea"/>
			</el-form-item>
		</el-form>
		<template #footer>
			<div>
				<el-button @click="closeEditElementDialog">取消</el-button>
				<el-button type="primary" @click="confirmEditElementDialog">确定</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
import {defineComponent, onMounted, reactive, ref} from 'vue';
import {storage} from '&/modules/chrome_api';
import GSymbol from '&/components/GSymbol.vue';
import {createGSymbol} from '&/utils/GSymbol.js';

defineComponent({
	components: {GSymbol}
});

const EditLargeBold = createGSymbol('edit', {fontSize: 1.5}, {weight: 400, size: 20});
const DeleteLargeBold = createGSymbol('delete', {fontSize: 1.5}, {weight: 400, size: 20});

// 列表数据
const tableData = ref([]);

const refreshList = async () => {
	tableData.value = await storage.getKey('Element.List') ?? [];
};

const editItem = async item => {
	const elementList = await storage.getKey('Element.List') ?? [];
	let index = elementList.findIndex(i => i.id === item.id);
	if (index !== -1) {
		delete item.id;
		elementList[index] = {
			...elementList[index],
			...item
		};
		await storage.setKey('Element.List', elementList);
	}
};

const deleteItem = async item => {
	const elementList = await storage.getKey('Element.List') ?? [];
	let index = elementList.findIndex(i => i.id === item.id);
	if (index !== -1) {
		elementList.splice(index, 1);
		await storage.setKey('Element.List', elementList);
	}
};

chrome.storage.local.onChanged.addListener((changes) => {
	if (changes['Element.List']) {
		tableData.value = changes['Element.List'].newValue;
	}
});

onMounted(() => refreshList());

// 编辑元素
const editElementDialog = reactive({
	visible: false,
	form: {
		id: '',
		name: '',
		description: ''
	},
	formRules: {
		name: [{required: true, message: '请输入名称', trigger: 'blur'}]
	}
});

const editElementDialogForm = ref(null);

const showEditElementDialog = () => {
	editElementDialogForm.value?.clearValidate();

	editElementDialog.visible = true;
};

const confirmEditElementDialog = () => {
	editElementDialogForm.value.validate().then(() => {
		editItem(editElementDialog.form);

		closeEditElementDialog();
	}).catch(() => {});
};

const closeEditElementDialog = () => {
	editElementDialog.visible = false;
};

// 列表操作
const handleEdit = (index, row) => {
	editElementDialog.form.id = row.id;
	editElementDialog.form.name = row.name;
	editElementDialog.form.description = row.description;

	showEditElementDialog();
};

const handleDelete = (index, row) => {
	deleteItem(row);
};
</script>

<style lang="scss" scoped>
</style>