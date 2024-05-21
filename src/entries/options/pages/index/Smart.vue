<template>
	<el-breadcrumb class="breadcrumb">
		<el-breadcrumb-item to="CrxIndexHome">首页</el-breadcrumb-item>
		<el-breadcrumb-item>AI 函数</el-breadcrumb-item>
	</el-breadcrumb>
	<el-table :data="tableData" class="table" header-row-class-name="table-header-row" max-height="calc(100vh - 130px)">
		<el-table-column align="center" width="70">
			<template #default="scope">
				<g-symbol align-text class="row-icon" font-size="2" grade="200">
					all_inclusive
				</g-symbol>
			</template>
		</el-table-column>
		<el-table-column label="AI 函数" prop="name" sortable>
			<template #default="scope">
				<div class="row-info">
					<span class="info-title">{{ scope.row.name }}</span>
					<span class="info-desc">{{ scope.row.description }}</span>
				</div>
			</template>
		</el-table-column>
		<el-table-column label="生成时间" prop="time" sortable width="180">
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
	<el-button :disabled="!configDefined" circle class="right-bottom-btn" size="large" type="primary"
			   title="新建 AI 函数" @click="showCreateSmartDialog">
		<g-symbol font-size="2" grade="200">
			add
		</g-symbol>
	</el-button>
	<el-button :type="configDefined?'primary':'danger'" circle class="right-bottom-secondary-btn"
			   size="small" @click="showEditSmartConfigDialog" title="编辑 AI 配置">
		<g-symbol fill font-size="2">
			memory
		</g-symbol>
	</el-button>
	<!-- 编辑AI配置 -->
	<el-dialog v-model="editSmartConfigDialog.visible" :close-on-click-modal="false"
			   :show-close="!editSmartConfigDialog.loading" title="编辑 AI 配置"
			   @close="editSmartConfigDialog.visible = false">
		<el-form ref="editSmartConfigDialogForm" v-loading="editSmartConfigDialog.loading"
				 :model="editSmartConfigDialog.form" :rules="editSmartConfigDialog.formRules"
				 label-width="60px" @submit.prevent="confirmEditSmartConfigDialog">
			<el-form-item label="API" prop="api" required>
				<el-input v-model="editSmartConfigDialog.form.api"/>
			</el-form-item>
			<el-form-item label="Token" prop="token" required>
				<el-input v-model="editSmartConfigDialog.form.token"/>
			</el-form-item>
		</el-form>
		<template #footer>
			<div>
				<el-button :disabled="editSmartConfigDialog.loading" @click="editSmartConfigDialog.visible = false">取消
				</el-button>
				<el-button :disabled="editSmartConfigDialog.loading" type="primary"
						   @click="confirmEditSmartConfigDialog">提交
				</el-button>
			</div>
		</template>
	</el-dialog>
	<el-dialog v-model="createSmartDialog.visible" :close-on-click-modal="false"
			   :show-close="!createSmartDialog.loading" title="新建 AI 函数" @close="closeCreateSmartDialog">
		<el-form ref="createSmartDialogForm" v-loading="createSmartDialog.loading" :model="createSmartDialog.form"
				 :rules="createSmartDialog.formRules" label-width="80px" @submit.prevent="confirmCreateSmartDialog">
			<el-form-item label="名称" prop="name" required>
				<el-input v-model="createSmartDialog.form.name" placeholder="统计质数数量"/>
			</el-form-item>
			<el-form-item label="要求" prop="requirement" required>
				<el-input v-model="createSmartDialog.form.requirement" placeholder="统计集合中有几个数字为质数"
						  type="textarea"/>
			</el-form-item>
			<el-form-item label="输入类型" prop="inputType" required>
				<el-select v-model="createSmartDialog.form.inputType" placeholder="数字集合">
					<el-option v-for="item in createSmartDialog.typeOptions" :key="item.value"
							   :label="item.label" :value="item.value"/>
				</el-select>
			</el-form-item>
			<el-form-item label="输入要求" prop="inputRequirement" required>
				<el-input v-model="createSmartDialog.form.inputRequirement" placeholder="包含数字的集合"
						  type="textarea"/>
			</el-form-item>
			<el-form-item label="输出类型" prop="outputType" required>
				<el-select v-model="createSmartDialog.form.outputType" placeholder="数字">
					<el-option v-for="item in createSmartDialog.typeOptions" :key="item.value"
							   :label="item.label" :value="item.value"/>
				</el-select>
			</el-form-item>
			<el-form-item label="输出要求" prop="outputRequirement" required>
				<el-input v-model="createSmartDialog.form.outputRequirement" placeholder="质数个数"
						  type="textarea"/>
			</el-form-item>
		</el-form>
		<template #footer>
			<div>
				<el-button :disabled="createSmartDialog.loading" @click="closeCreateSmartDialog">取消
				</el-button>
				<el-button :disabled="createSmartDialog.loading" type="primary"
						   @click="confirmCreateSmartDialog">提交
				</el-button>
			</div>
		</template>
	</el-dialog>
	<el-dialog v-model="editSmartDialog.visible" :close-on-click-modal="false" title="编辑 AI 函数"
			   @close="closeEditSmartDialog">
		<el-form ref="editSmartDialogForm" :model="editSmartDialog.form"
				 :rules="editSmartDialog.formRules" @submit.prevent="confirmEditSmartDialog">
			<el-form-item label="名称" prop="name">
				<el-input v-model="editSmartDialog.form.name"/>
			</el-form-item>
			<details class="code-previewer">
				<summary class="previewer-title">预览</summary>
				<div class="previewer-code-container">
					<el-scrollbar>
						<highlight :code="editSmartDialog.form.code" class="previewer-code" language="javascript"/>
					</el-scrollbar>
				</div>
				<el-text class="previewer-desc" size="small"
						 type="info">使用 ChatGPT 3.5 生成于 {{ Strings.parseDatetime(editSmartDialog.form.time) }} 。
				</el-text>
			</details>
		</el-form>
		<template #footer>
			<div>
				<el-button @click="closeEditSmartDialog">取消</el-button>
				<el-button type="primary" @click="confirmEditSmartDialog">确定</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
import {computed, defineComponent, onMounted, reactive, ref} from 'vue';
import {http, storage} from "&/modules/chrome_api";
import GSymbol from "&/components/GSymbol.vue";
import * as Strings from "&/modules/strings.ts";
import {createGSymbol} from "&/utils/GSymbol.js";
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from "prettier/plugins/estree";
import highlight from "&/components/Highlight.js";
import {ElMessageBox} from "element-plus";

defineComponent({
	components: {GSymbol, highlight}
});

const EditLargeBold = createGSymbol('edit', {fontSize: 1.5}, {weight: 400, size: 20});
const DeleteLargeBold = createGSymbol('delete', {fontSize: 1.5}, {weight: 400, size: 20});

const configDefined = computed(() => smartConfig.value.api && smartConfig.value.token);

// AI配置
const smartConfig = ref({
	api: '',
	token: ''
});

const refreshSmartConfig = async () => {
	const config = await storage.getKey('Smart.Config');
	if (config) {
		smartConfig.value = config;
	}
};

chrome.storage.local.onChanged.addListener((changes) => {
	if (changes['Smart.Config']) {
		smartConfig.value = changes['Smart.Config'].newValue;
	}
});

onMounted(() => refreshSmartConfig());

// 编辑AI配置
const editSmartConfigDialog = reactive({
	visible: false,
	form: {
		api: '',
		token: ''
	},
	formRules: {
		api: [{required: true, message: '请输入 API', trigger: 'blur'}],
		token: [{required: true, message: '请输入 Token', trigger: 'blur'}]
	}
});

const editSmartConfigDialogForm = ref(null);

const showEditSmartConfigDialog = () => {
	editSmartConfigDialog.form.api = smartConfig.value.api;
	editSmartConfigDialog.form.token = smartConfig.value.token;
	editSmartConfigDialog.visible = true;
};

const confirmEditSmartConfigDialog = async () => {
	editSmartConfigDialogForm.value.validate().then(() => {
		storage.setKey('Smart.Config', editSmartConfigDialog.form);
		closeEditSmartConfigDialog();
	}).catch(() => {});
};

const closeEditSmartConfigDialog = () => {
	editSmartConfigDialog.visible = false;
};

// 列表数据
const tableData = ref([]);

const refreshList = async () => {
	tableData.value = await storage.getKey('Smart.List') ?? [];
};

const editItem = async item => {
	const smartList = await storage.getKey('Smart.List') ?? [];
	let index = smartList.findIndex(i => i.id === item.id);
	if (index !== -1) {
		delete item.id;
		smartList[index] = {
			...smartList[index],
			...item
		};
		await storage.setKey('Smart.List', smartList);
	}
};

const deleteItem = async item => {
	const smartList = await storage.getKey('Smart.List') ?? [];
	let index = smartList.findIndex(i => i.id === item.id);
	if (index !== -1) {
		smartList.splice(index, 1);
		await storage.setKey('Smart.List', smartList);
	}
};

chrome.storage.local.onChanged.addListener((changes) => {
	if (changes['Smart.List']) {
		tableData.value = changes['Smart.List'].newValue;
	}
});

onMounted(() => refreshList());

// 编辑AI函数
const editSmartDialog = reactive({
	visible: false,
	form: {
		id: '',
		name: '',
		code: '',
		time: ''
	},
	formRules: {
		name: [{required: true, message: '请输入名称', trigger: 'blur'}]
	}
});

const editSmartDialogForm = ref(null);

const showEditSmartDialog = () => {
	editSmartDialog.visible = true;
};

const confirmEditSmartDialog = () => {
	// 校验
	editSmartDialogForm.value.validate().then(() => {
		editItem({
			id: editSmartDialog.form.id,
			name: editSmartDialog.form.name
		});

		closeEditSmartDialog();
	}).catch(() => {});
};

const closeEditSmartDialog = () => {
	editSmartDialog.visible = false;
};

// 新建AI函数
const createSmartDialog = reactive({
	loading: false,
	visible: false,
	typeOptions: [
		{label: '无', value: 'void'},
		{label: '是非', value: 'boolean'},
		{label: '是非集合', value: 'boolean[]'},
		{label: '数字', value: 'number'},
		{label: '数字集合', value: 'number[]'},
		{label: '文本', value: 'string'},
		{label: '文本集合', value: 'string[]'},
		{label: '元素', value: 'Element'},
		{label: '元素集合', value: 'Element[]'},
		{label: '数据', value: '{[key: string]: any}'}
	],
	form: {
		name: '',
		requirement: '',
		inputType: '',
		inputRequirement: '',
		outputType: '',
		outputRequirement: ''
	},
	formRules: {
		name: [{required: true, message: '请输入函数名称', trigger: 'blur'}],
		requirement: [{required: true, message: '请输入函数要求', trigger: 'blur'}],
		inputType: [{required: true, message: '请选择输入类型', trigger: 'change'}],
		inputRequirement: [{required: true, message: '请输入输入要求', trigger: 'blur'}],
		outputType: [{required: true, message: '请选择输出类型', trigger: 'change'}],
		outputRequirement: [{required: true, message: '请输入输出要求', trigger: 'blur'}]
	}
});

const createSmartDialogForm = ref(null);

const showCreateSmartDialog = () => {
	createSmartDialog.form.name = '';
	createSmartDialog.form.requirement = '';
	createSmartDialog.form.inputType = 'void';
	createSmartDialog.form.inputRequirement = '';
	createSmartDialog.form.outputType = 'void';
	createSmartDialog.form.outputRequirement = '';

	createSmartDialogForm.value?.clearValidate();
	createSmartDialog.visible = true;
};

const parseSmartType = (rawType) => {
	switch (rawType) {
		case 'void':
		case 'boolean':
		case 'number':
		case 'string':
		case 'Element':
			return rawType;
		case 'boolean[]':
		case 'number[]':
		case 'string[]':
		case 'Element[]':
			return 'list';
		case '{[key: string]: any}':
			return 'data';
		default:
			throw new Error('Unknown type: ' + rawType);
	}

};
const confirmCreateSmartDialog = () => {
	// 校验
	createSmartDialogForm.value.validate().then(async () => {
		createSmartDialog.loading = true;

		let prompt = `请生成一个匿名函数，能做到：${createSmartDialog.form.requirement}。参数有：${createSmartDialog.form.inputType}类型的“${createSmartDialog.form.inputRequirement}”。返回值为${createSmartDialog.form.outputType}类型的“${createSmartDialog.form.outputRequirement}”。`;
		http.post({
			url: smartConfig.value.api,
			headers: {
				'Authorization': 'Bearer ' + smartConfig.value.token
			},
			data: {
				'model': 'gpt-3.5-turbo',
				'messages': [
					{
						'role': 'system',
						'content': '我是一个面向非技术用户的匿名函数生成器，生成的函数适用于Chrome120的VanillaJS环境，无需考虑旧版本和跨浏览器兼容性。函数内的代码被允许使用所有WebAPI，但是被禁止调用任何非WebAPI的库，不能使用注释和箭头函数。输出代码将尽可能保持一行且只包含匿名函数体。如果我做不到所述条件将返回非技术用户看得懂的错误信息。'
					},
					{
						'role': 'user',
						'content': prompt
					}
				],
				'temperature': 0
			}
		}).then(async (response) => {
			const body = JSON.parse(response.body);
			const code = body.choices[0].message.content.match(/```(?:javascript|js)?\n?\(?(function ?[^(]*\([\s\S]+}(?:\(\))?\)?)\n?```/)?.[1];
			if (!code) {
				await ElMessageBox.alert(body.choices[0].message.content, '生成失败', {
					confirmButtonText: '确定',
					type: 'error'
				});
				createSmartDialog.loading = false;
				return;
			}
			const smartList = await storage.getKey("Smart.List") ?? [];
			smartList.push({
				id: Strings.uniqueId(),
				name: createSmartDialog.form.name, code,
				inputType: parseSmartType(createSmartDialog.form.inputType),
				outputType: parseSmartType(createSmartDialog.form.outputType),
				time: new Date().getTime()
			});
			await storage.setKey("Smart.List", smartList);
			tableData.value = smartList;
			createSmartDialog.loading = false;
			closeCreateSmartDialog();
		}).catch(async (e) => {
			await ElMessageBox.alert(e, '生成失败', {
				confirmButtonText: '确定',
				type: 'error'
			});
			createSmartDialog.loading = false;
		});
	}).catch(() => {});
};

const closeCreateSmartDialog = () => {
	createSmartDialog.visible = false;
};

// 列表操作
const handleEdit = async (index, row) => {
	editSmartDialog.form.id = row.id;
	editSmartDialog.form.name = row.name;
	editSmartDialog.form.code = await prettier.format(`(${row.code})`, {
		parser: "babel",
		plugins: [parserBabel, parserEstree]
	});
	// editSmartDialog.form.code = row.code;
	editSmartDialog.form.time = row.time;

	editSmartDialogForm.value?.clearValidate();
	showEditSmartDialog();
};

const handleDelete = (index) => {
	deleteItem(tableData.value[index]);
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

  &:disabled {
    background-color: var(--el-color-primary-light-2);
  }

  &:active:not(:disabled) {
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

.code-previewer {
  margin-top: 10px;

  .previewer-title {
    padding-bottom: 10px;
  }

  .previewer-code-container {
    width: 100%;
    background-color: #F6F8FA;
    border-radius: 4px;

    @media (prefers-color-scheme: dark) {
      filter: invert(100%) hue-rotate(180deg);
    }

    .previewer-code {
      width: max-content;
    }
  }

  .previewer-desc {
    line-height: 2;
  }
}
</style>