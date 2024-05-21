<template>
	<div class="page-container">
		<aside class="side-bar">
			<el-scrollbar>
				<div class="script-info">
					<h1 class="script-title text-ellipsis">{{ script.name }}</h1>
					<span v-if="script.description" class="script-description">{{ script.description }}</span>
					<el-button @click="showEditScriptInfoDialog">编辑</el-button>
					<el-dialog v-model="editScriptInfoDialog.visible" :close-on-click-modal="false" title="编辑脚本"
							   @close="closeEditScriptInfoDialog">
						<el-form ref="editScriptInfoDialogForm" :model="editScriptInfoDialog.form" label-width="60px"
								 :rules="editScriptInfoDialog.formRules"
								 @submit.prevent="confirmEditScriptInfoDialog">
							<el-form-item label="名称" prop="name">
								<el-input v-model="editScriptInfoDialog.form.name"/>
							</el-form-item>
							<el-form-item label="描述" prop="description">
								<el-input type="textarea" v-model="editScriptInfoDialog.form.description"/>
							</el-form-item>
						</el-form>
						<template #footer>
							<div>
								<el-button @click="closeEditScriptInfoDialog">取消</el-button>
								<el-button type="primary" @click="confirmEditScriptInfoDialog">确定</el-button>
							</div>
						</template>
					</el-dialog>
				</div>
				<el-collapse v-model="collapseMenu">
					<el-collapse-item class="block-menu" name="blockMenu">
						<template #title>
							<div class="block-menu-title">
								<g-symbol font-size="1.2" weight="500">category</g-symbol>
								<span>指令块</span>
							</div>
						</template>
						<el-tree :allow-drag="allowDrag" :allow-drop="allowDrop" :data="blockMenu" accordion
								 class="block-menu-tree" draggable @node-drag-start="dragStart">
							<template #default="{ node, data }">
								<span :style="{ fontWeight: node.data.value ? 'normal' : 'bold' }">{{ data.label }}</span>
							</template>
						</el-tree>
					</el-collapse-item>
				</el-collapse>
			</el-scrollbar>
		</aside>
		<el-scrollbar class="content">
			<BlockList :root-block="root" @change="handleBlockListChange"/>
		</el-scrollbar>
	</div>
</template>

<script>
import BlockList from "&/components/BlockList.vue";
import {blockGroups, registerRootBlock, RootBlock} from "&/classes/Block.ts";
import {storage} from "&/modules/chrome_api";
import GSymbol from "&/components/GSymbol.vue";
import {getScript, setScript} from "&/classes/Script.ts";

async function initRoute(to) {
	const scriptList = await storage.getKey(`Script.List`) ?? [];
	const scriptName = scriptList?.find(item => item.id === to.params.id)?.name;
	if (scriptName) {
		to.meta.title = "编辑器 - " + scriptName;
	}
}

const blockModule = await import("&/classes/Block.ts");

export default {
	name: 'Editor',
	components: {GSymbol, BlockList},
	data() {
		const blockMenu = [];
		for (let group of blockGroups) {
			blockMenu.push({
				label: group.label,
				children: Object.keys(blockModule)
				.map((key) => blockModule[key])
				.filter((block) => block.groupName === group.name)
				.map((block) => ({
					label: block.defaultTitle,
					value: block.name
				}))
				.sort((a, b) => a.label.localeCompare(b.label))
			});
		}
		return {
			collapseMenu: ["blockMenu"],
			blockMenu,
			editScriptInfoDialog: {
				visible: false,
				form: {
					name: null,
					description: null
				},
				formRules: {
					name: [
						{required: true, message: '请输入脚本名称', trigger: 'blur'}
					]
				}
			},
			script: {},
			scriptDetail: null,
			blockDetail: null,
			root: new RootBlock()
		};
	},
	watch: {
		root: {
			handler(newVal) {
				this.scriptDetail.blockRoot = newVal;
				this.script.setScriptDetail(this.scriptDetail);
			},
			deep: true
		}
	},
	async beforeRouteEnter(route) {
		await initRoute(route);
	},
	async beforeRouteUpdate(to) {
		await initRoute(to);
	},
	created() {
		this.initScript();
	},
	updated() {
		this.initScript();
	},
	methods: {
		async initScript() {
			const script = await getScript(this.$route.params.id);
			if (!script) {
				await this.$router.push({name: "NotFoundRedirect"});
				return;
			}
			this.script = script;

			this.scriptDetail = await this.script.getScriptDetail();

			let blockRoot = this.scriptDetail.blockRoot;

			blockRoot = await registerRootBlock(blockRoot);

			this.root = blockRoot;
		},
		showEditScriptInfoDialog() {
			this.editScriptInfoDialog.form.name = this.script.name;
			this.editScriptInfoDialog.form.description = this.script.description;
			this.editScriptInfoDialog.visible = true;
		},
		async confirmEditScriptInfoDialog() {
			this.$refs.editScriptInfoDialogForm.validate().then(async () => {
				this.script.name = this.editScriptInfoDialog.form.name;
				this.script.description = this.editScriptInfoDialog.form.description;
				await setScript(this.script);
				this.editScriptInfoDialog.visible = false;
			}).catch(() => {});
		},
		async closeEditScriptInfoDialog() {
			this.editScriptInfoDialog.visible = false;
		},
		async handleBlockListChange() {
			await this.script.generateJs(this.root);
		},
		allowDrag(node) {
			return node.data.value;
		},
		allowDrop() {
			return false;
		},
		dragStart(n, e) {
			e.dataTransfer.setData('text/plain', "你想干什么？");
			e.dataTransfer.setData('text/name', n.data.value);
			e.dataTransfer.setData('bower/block', "");
			e.dataTransfer.effectAllowed = "copy";
		}
	}
};
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  height: 100%;

  .side-bar {
    width: 300px;
    background-color: var(--el-bg-color);

    .script-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 15px;

      .script-title {
        font-size: 1.7em;
        position: relative;
        padding-left: 15px;

        &:before {
          content: ' ';
          width: 5px;
          height: 100%;
          background-color: var(--el-color-primary);
          position: absolute;
          left: 0;
          border-radius: 3px;
        }
      }

      .script-description {
        overflow-wrap: anywhere;
      }
    }
  }

  .block-menu {
    .block-menu-title {
      margin-left: 10px;
      font-size: 120%;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .block-menu-tree {
      margin: 0 15px;
      border-radius: 4px;
      border: 1px solid var(--el-border-color);
      overflow: hidden;
    }

    :deep(.block-menu-tree) > .el-tree-node > .el-tree-node__content {
      height: 30px;
    }
  }

  //noinspection CssInvalidPropertyValue
  .content {
    flex: 1;
    width: -webkit-fill-available;
  }
}
</style>