<template>
	<div class="left-shadow"/>
	<div v-if="rootBlock.firstChild" class="block-list">
		<block v-for="(block, index) in rootBlock.flatChildren"
			   :id="block.id" :key="block.id"
			   id="block" :block-inst="block" :index="index"
			   @move-before-block="moveBeforeBlock"
			   @move-after-block="moveAfterBlock"
			   class="list-item" @edit-block="showEditBlockDialog"/>
	</div>
	<el-empty v-else description="请在此放置块" @dragenter="dragEnter" @dragleave="dragLeave" @dragover="dragOver"
			  @drop="drop"/>
	<el-dialog v-model="editBlockDialog.visible" append-to-body class="edit-block-dialog" title="编辑块">
		<div class="dialog-content">
			<el-divider v-show="Object.keys(editBlockDialog.attrsFormType).length" content-position="left">
				可变参数
			</el-divider>
			<el-form v-if="editBlockDialog.blockInst" v-show="Object.keys(editBlockDialog.attrsFormType).length"
					 ref="editBlockDialogAttrsForm" :model="editBlockDialog.attrsForm" label-width="min-width"
					 @submit.prevent="confirmEditBlockDialog">
				<el-form-item v-for="(formType, typeKey) in editBlockDialog.attrsFormType" :label="formType.label"
							  :prop="typeKey" class="form-item"
							  :rules="editBlockDialog.attrsVarAgent[typeKey]?[{required: editBlockDialog.attrsVarAgent[typeKey],message:`请选择${formType.label}`}]:editBlockDialog.attrsFormRules[typeKey]">
					<div class="item-container">
						<el-select v-if="formType.type === 'enum'" v-model="editBlockDialog.attrsForm[typeKey]"
								   :clearable="!formType.limit?.required" class="item-select">
							<el-option v-for="item in formType.options" :key="item.value" :label="item.label"
									   :value="item.value"/>
						</el-select>
						<el-select v-else-if="formType.type === 'variable'" v-model="editBlockDialog.attrsForm[typeKey]"
								   :clearable="!formType.limit?.required" class="item-select">
							<el-option v-for="item in formType.options" :key="item.alias" :label="item.alias"
									   :value="item.alias"/>
						</el-select>
						<el-select v-else-if="editBlockDialog.attrsVarAgent[typeKey]"
								   v-model="editBlockDialog.attrsForm[typeKey]"
								   class="item-select">
							<el-option
									v-for="item in editBlockDialog.exportVars.filter(vars=>!vars.type||!formType.type||vars.type===formType.type)"
									:key="item.alias" :label="item.alias" :value="item.alias"/>
						</el-select>
						<template v-else>
							<el-input v-if="formType.type === 'string'" v-model="editBlockDialog.attrsForm[typeKey]"
									  class="item-input"/>
							<el-input-number v-else-if="formType.type === 'number'"
											 v-model="editBlockDialog.attrsForm[typeKey]"
											 :max="formType.limit?.max" :min="formType.limit?.min"
											 class="item-select"/>
							<el-switch v-else-if="formType.type === 'boolean'"
									   v-model="editBlockDialog.attrsForm[typeKey]" active-text="是" inactive-text="否"
									   class="item-switch" inline-prompt/>
						</template>
						<el-button :disabled="formType.type==='enum'||formType.type==='variable'"
								   :icon="editBlockDialog.attrsVarAgent[typeKey] || formType.type==='variable' ? Link : LinkOff"
								   :type="editBlockDialog.attrsVarAgent[typeKey] || formType.type==='variable' ? 'primary' : 'default'"
								   class="variable-switch" text @click="switchVariableAgent(formType,typeKey)">
							{{ editBlockDialog.attrsVarAgent[typeKey] || formType.type === 'variable' ? '变量' : '常量' }}
						</el-button>
					</div>
				</el-form-item>
			</el-form>
			<el-divider v-show="editBlockDialog.varsForm.length" content-position="left">
				导出变量
			</el-divider>
			<el-form v-if="editBlockDialog.blockInst" v-show="editBlockDialog.varsForm.length"
					 ref="editBlockDialogVarsForm" :model="editBlockDialog.varsForm"
					 @submit.prevent="confirmEditBlockDialog">
				<el-form-item v-for="(value, key) in editBlockDialog.varsForm" :label="value.name"
							  :prop="value.innerVar" :rules="editBlockDialog.varsFormRules">
					<el-input v-model="editBlockDialog.varsForm[key].alias" :formatter="(text) => text.trim()"
							  placeholder="不导出"/>
					<el-text size="small" type="info">{{ value.description }}</el-text>
				</el-form-item>
			</el-form>
		</div>
		<template #footer>
			<div class="dialog-button-group">
				<el-button text type="danger" @click="destroyBlock(editBlockDialog.blockInst)">移除</el-button>
				<el-button class="close-button" @click="closeEditBlockDialog">取消</el-button>
				<el-button type="primary" @click="confirmEditBlockDialog">确定</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script>
import TemplateBlock from "&/components/Block.vue";
import {Block, RootBlock} from "&/classes/Block.ts";
import * as Strings from "&/modules/strings.ts";
import {toRaw} from "vue";
import {createGSymbol} from "&/utils/GSymbol.js";
import {getBlockByName} from "&/classes/BlockType.ts";

export default {
	name: 'BlockList',
	components: {Block: TemplateBlock},
	setup() {
		return {
			Link: createGSymbol('link', {fontSize: 1.3}, {weight: 500}),
			LinkOff: createGSymbol('link_off', {fontSize: 1.3}, {weight: 500})
		};
	},
	emits: ['change'],
	props: {
		rootBlock: {
			type: RootBlock,
			default: []
		}
	},
	data() {
		return {
			editBlockDialog: {
				visible: false,
				blockInst: null,
				attrsFormType: {},
				attrsForm: {},
				attrsVarAgent: {},
				attrsFormRules: {},
				exportVars: [],
				varsForm: [],
				varsFormRules: [
					{
						validator: (rule, value, callback) => {
							const item = this.editBlockDialog.varsForm.find(item => item.innerVar === rule.field);
							if (!item.alias || Strings.checkVariableName(item.alias)) {
								callback();
							} else {
								callback(new Error());
							}
						}, message: '变量名格式不正确', trigger: 'blur'
					},
					{
						validator: (rule, value, callback) => {
							const item = this.editBlockDialog.varsForm.find(item => item.innerVar === rule.field);
							if (!item.alias || !item.alias.startsWith('_')) {
								callback();
							} else {
								callback(new Error());
							}
						}, message: '变量名不支持以下划线开头', trigger: 'blur'
					}
				]
			}
		};
	},
	methods: {
		moveBeforeBlock(targetBlockId, toBlockId) {
			let targetBlock = Block.findBlockById(targetBlockId), toBlock = Block.findBlockById(toBlockId);
			if (targetBlock && toBlock) {
				// console.log("move", targetBlock, "before", toBlock);
				// target永远不能是结束块，如果是则用结束块的父块代替
				if (targetBlock.bid !== targetBlockId) {
					targetBlock = Block.findBlockById(targetBlock.bid);
				}
				toBlock.addBlockBefore(targetBlock);
			}

			this.$emit('change');
		},
		moveAfterBlock(targetBlockId, toBlockId) {
			let targetBlock = Block.findBlockById(targetBlockId), toBlock = Block.findBlockById(toBlockId);

			if (targetBlock && toBlock) {
				// console.log("move", targetBlock, "after", toBlock);
				// target永远不能是结束块，如果是则用结束块的父块代替
				if (targetBlock.bid !== targetBlockId) {
					targetBlock = Block.findBlockById(targetBlock.bid);
				}
				toBlock.addBlockAfter(targetBlock);
			}

			this.$emit('change');
		},
		dragEnter(e) {
			// console.log("dragEnter", e);
			if (
				// 要是块
				e.dataTransfer.types.includes('bower/block')
			) {
				e.preventDefault();
			}
		},
		dragOver(e) {
			if (
				// 要是块
				!e.dataTransfer.types.includes('bower/block')
			) {
				return;
			}
			e.preventDefault();
		},
		dragLeave(e) {
			e.preventDefault();
		},
		async drop(e) {
			e.preventDefault();
			let id;
			if (e.dataTransfer.types.includes('text/name')) {
				// 如果是新块就创建
				const name = e.dataTransfer.getData('text/name');
				const block = new (await getBlockByName(name))();
				await block.build();
				id = block.id;
			} else {
				// 否则就是旧块移动
				id = e.dataTransfer.getData('text/id');
			}

			const blockInst = Block.findBlockById(id);

			this.rootBlock.pushChild(blockInst);

			this.$emit('change');
		},

		async showEditBlockDialog(blockInst) {
			// EndBlock转为对应的主Block
			if (blockInst.id !== blockInst.bid) {
				blockInst = Block.findBlockById(blockInst.bid);
			}

			// 获取可变参数
			this.editBlockDialog.attrsFormType = await blockInst.constructor.getAttributeTypes();
			this.editBlockDialog.attrsForm = blockInst.getAllAttributes();

			// 初始化变量代理
			blockInst.data.variableAgent = blockInst.data.variableAgent ?? {};
			this.editBlockDialog.attrsVarAgent = Object.assign({}, blockInst.data.variableAgent);

			// 特殊处理
			for (let typeKey in this.editBlockDialog.attrsFormType) {
				const formType = this.editBlockDialog.attrsFormType[typeKey];

				switch (formType.type) {
					case "variable":
						formType.options = blockInst.getRootExportVariables().filter(variable => variable.alias);
						break;
				}

				const formTypeRule = [];
				if (formType.limit) {
					const formLimit = toRaw(formType.limit);
					switch (formType.type) {
						case "enum":
							if (formLimit.required !== undefined) {
								formTypeRule.push({
									required: true,
									message: `请选择${formType.label}`,
									trigger: 'blur'
								});
							}
							break;
						case "string":
							if (formLimit.required !== undefined) {
								formTypeRule.push({
									required: true,
									message: `请输入${formType.label}`,
									trigger: 'blur'
								});
							}
							if (formLimit.patterns !== undefined) {
								for (let i = 0; i < formLimit.patterns.length; i++) {
									let pattern = formLimit.patterns[i];
									formTypeRule.push({
										pattern: pattern.pattern,
										message: `${formType.label}的${pattern.name}不正确`,
										trigger: 'blur'
									});
								}
							}
							if (formLimit.validators !== undefined) {
								for (let i = 0; i < formLimit.validators.length; i++) {
									let validator = formLimit.validators[i];
									formTypeRule.push({
										validator: validator.func,
										trigger: 'blur',
										message: `${formType.label}的${validator.name}不正确`
									});
								}
							}
							if (formLimit.minlength !== undefined) {
								formTypeRule.push({
									type: 'string',
									min: formLimit.minlength,
									message: `${formType.label}的长度不能小于${formLimit.minlength}`,
									trigger: 'blur'
								});
							}
							if (formLimit.maxlength !== undefined) {
								formTypeRule.push({
									type: 'string',
									max: formLimit.maxlength,
									message: `${formType.label}的长度不能大于${formLimit.maxlength}`, trigger: 'blur'
								});
							}
							break;
						case "number":
							if (formLimit.required !== undefined) {
								formTypeRule.push({
									required: true,
									message: `请输入${formType.label}`,
									trigger: 'blur'
								});
							}
							if (formLimit.validators !== undefined) {
								for (let i = 0; i < formLimit.validators.length; i++) {
									let validator = formLimit.validators[i];
									formTypeRule.push({
										validator: validator.func,
										trigger: 'blur',
										message: `${formType.label}的${validator.name}不正确`
									});
								}
							}
							if (formLimit.min !== undefined) {
								formTypeRule.push({
									type: 'number',
									min: formLimit.min,
									message: `${formType.label}不能小于${formLimit.min}`,
									trigger: 'blur'
								});
							}
							if (formLimit.max !== undefined) {
								formTypeRule.push({
									type: 'number',
									max: formLimit.max,
									message: `${formType.label}不能大于${formLimit.max}`,
									trigger: 'blur'
								});
							}
							break;
						case "boolean":
							if (formLimit.required !== undefined) {
								formTypeRule.push({
									required: true,
									message: `请选择${formType.label}`,
									trigger: 'blur'
								});
							}
							if (formLimit.validators !== undefined) {
								for (let i = 0; i < formLimit.validators.length; i++) {
									let validator = formLimit.validators[i];
									formTypeRule.push({
										validator: validator.func,
										message: `${formType.label}的${validator.name}不正确`,
										trigger: 'blur'
									});
								}
							}
							break;
						case "variable":
							if (formLimit.required !== undefined) {
								formTypeRule.push({
									required: true,
									message: `请选择${formType.label}`,
									trigger: 'blur'
								});
							}
							if (formLimit.type !== undefined) {
								formType.options = formType.options.filter(variable => variable.type === formLimit.type);
							}
							if (formLimit.validators !== undefined) {
								for (let i = 0; i < formLimit.validators.length; i++) {
									let validator = formLimit.validators[i];
									formTypeRule.push({
										validator: validator.func,
										message: `${formType.label}的${validator.name}不正确`,
										trigger: 'blur'
									});
								}
							}

							// type去重
							formType.options = formType.options.filter((item, index, self) => self.findIndex(t => t.alias === item.alias) === index);
							break;
					}
				}

				// 重置表单验证
				this.$refs.editBlockDialogAttrsForm?.clearValidate();
				this.$refs.editBlockDialogVarsForm?.clearValidate();

				await this.$nextTick(() => {
					this.editBlockDialog.attrsFormRules[typeKey] = formTypeRule;
				});
			}

			// 获取导出变量
			this.editBlockDialog.exportVars = blockInst.getRootExportVariables().filter((item, index, self) => {
				return self.findIndex(t => t.alias === item.alias && t.type === item.type) === index && item.alias;
			});
			this.editBlockDialog.varsForm = blockInst.getExportVariables();

			this.editBlockDialog.blockInst = blockInst;
			this.editBlockDialog.visible = true;
		},
		switchVariableAgent(formType, typeKey) {
			this.editBlockDialog.attrsVarAgent[typeKey] = !this.editBlockDialog.attrsVarAgent[typeKey];
			if (this.editBlockDialog.attrsVarAgent[typeKey]) {
				this.editBlockDialog.attrsForm[typeKey] = null;
			} else {
				const defaultAttrs = this.editBlockDialog.blockInst.prototype.defaultAttr;
				this.editBlockDialog.attrsForm[typeKey] = defaultAttrs[typeKey].defaultValue;
			}
		},
		closeEditBlockDialog() {
			this.editBlockDialog.visible = false;
		},
		async confirmEditBlockDialog() {
			try {
				// 验证表单
				const attrsForm = this.$refs.editBlockDialogAttrsForm;
				const varsForm = this.$refs.editBlockDialogVarsForm;
				await attrsForm.validate();
				await varsForm.validate();

				// 更新变量
				for (let key in this.editBlockDialog.attrsForm) {
					this.editBlockDialog.blockInst.setAttribute(key, this.editBlockDialog.attrsForm[key]);
				}

				// 更新变量代理
				this.editBlockDialog.blockInst.data.variableAgent = this.editBlockDialog.attrsVarAgent;

				for (let item of this.editBlockDialog.varsForm) {
					if (item.alias && Strings.checkVariableName(item.alias)) {
						this.editBlockDialog.blockInst.setVariableAlias(item.name, item.alias);
					} else {
						this.editBlockDialog.blockInst.delVariableAlias(item.name);
					}
				}

				this.$emit('change');

				this.closeEditBlockDialog();
			} catch {}
		},

		destroyBlock(blockInst) {
			blockInst.destroy();

			this.$emit('change');

			this.closeEditBlockDialog();
		}
	}
};
</script>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap');

.left-shadow {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.04);

  @media (prefers-color-scheme: dark) {
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.4);
    border-left: 1px solid var(--el-border-color-lighter);
  }
}

.block-list {
  font-family: 'Noto Sans SC', sans-serif;
  min-width: 600px;
  padding: 20px;

  .list-item {
    margin: -13px 0;
  }
}

.edit-block-dialog {
  .dialog-content {
    display: flex;
    flex-direction: column;
    gap: 24px;

    form {
      .form-item {
        .item-container {
          display: flex;
          align-items: center;
          width: 100%;
          gap: 10px;

          .item-select, .item-input, .item-switch {
            width: 100%;
          }

          .variable-switch {
            width: 4em;
            margin-right: -4px;
          }
        }
      }
    }
  }

  .dialog-button-group {
    display: flex;

    .close-button {
      margin-left: auto;
    }
  }
}
</style>