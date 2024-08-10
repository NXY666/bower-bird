<template>
	<div class="tags-container">
		<el-scrollbar>
			<ul ref="tags" class="tags-item-list">
				<li v-for="tag in tagList" v-bind:key="tag" :class="{active:isActive(tag)}" class="tags-item"
					@click="handleClick($event, tag)" @mousedown="handleMouseDown($event, tag)">
					<span class="tags-item__title">{{ tag.meta.title }}</span>
					<el-icon v-if="!tag.meta.affix" class="tags-item__close-btn"
							 @click.prevent.stop="closeSelectedTag(tag)">
						<g-symbol weight="600">
							close
						</g-symbol>
					</el-icon>
				</li>
			</ul>
		</el-scrollbar>
	</div>
</template>

<script>
import Sortable from 'sortablejs';
import GSymbol from "&/components/GSymbol.vue";
import {router} from "@OPT/modules/router";

export default {
	name: "tags",
	components: {GSymbol},
	data() {
		return {
			tagList: []
		};
	},
	props: {},
	watch: {
		$route(e) {
			this.addViewTags(e);
			// 判断标签容器是否出现滚动条
			this.$nextTick(() => {
				const tags = this.$refs.tags;
				if (tags && tags.scrollWidth > tags.clientWidth) {
					// 确保当前标签在可视范围内
					let targetTag = tags.querySelector(".active");
					targetTag.scrollIntoView();
				}
			});
		}
	},
	created() {
		const menu = router.getRoutes();
		const dashboardRoute = this.treeFind(menu, node => node.name === "CrxIndexHome");
		if (dashboardRoute) {
			dashboardRoute.fullPath = dashboardRoute.path;
			this.addViewTags(dashboardRoute);
			this.addViewTags(this.$route);
		}
	},
	mounted() {
		this.tagDrop();
	},
	methods: {
		// 查找树
		treeFind(tree, func) {
			for (const data of tree) {
				if (func(data)) {
					return data;
				}
				if (data.children) {
					const res = this.treeFind(data.children, func);
					if (res) {
						return res;
					}
				}
			}
			return null;
		},
		// 标签拖拽排序
		tagDrop() {
			const target = this.$refs.tags;
			Sortable.create(target, {
				draggable: 'li',
				animation: 100
			});
		},
		// 增加tag
		addViewTags(route) {
			if (!this.tagList.find(item => item.fullPath === route.fullPath)) {
				this.tagList.push(route);
			}
		},
		// 高亮tag
		isActive(route) {
			return route.fullPath === this.$route.fullPath;
		},
		// 关闭tag
		closeSelectedTag(tag, autoPushLatestView = true) {
			const nowTagIndex = this.tagList.findIndex(item => item === tag);
			this.tagList.splice(nowTagIndex, 1);
			if (autoPushLatestView && this.isActive(tag)) {
				const leftView = this.tagList[nowTagIndex - 1];
				if (leftView) {
					this.$router.push(leftView);
				} else {
					this.$router.push('/');
				}
			}
		},
		handleClick(e, tag) {
			this.toTag(tag);
		},
		// 中键关闭
		handleMouseDown(e, tag) {
			if (!!(e.buttons & 4) && !tag.meta.affix) {
				this.closeSelectedTag(tag);
			}
		},
		toTag(tag) {
			this.$router.push(tag);
		}
	}
};
</script>

<style scoped>
.tags-container {
	padding: 6px 5px;
	background: var(--base-color-primary-dark-9);

	@media (prefers-color-scheme: dark) {
		background: var(--base-color-night-primary-dark-9);
	}
}

.tags-container .tags-item-list {
	display: flex;
	align-items: center;
	height: 33px;
}

.tags-container .tags-item {
	position: relative;
	display: flex;
	float: left;
	align-items: center;
	flex-shrink: 0;
	height: 80%;
	margin-left: 5px;
	padding: 5px 10px;
	transition: background-color .1s;
	text-decoration: none;
	color: var(--el-color-info);
	border-radius: 5px;
}

.tags-container .tags-item:hover {
	background: rgba(255, 255, 255, 0.1);
}

.tags-container .tags-item:active {
	background: rgba(255, 255, 255, 0.2);
}

.tags-container .tags-item.active {
	color: white;
	background: var(--base-color-primary);
}

@media (prefers-color-scheme: dark) {
	.tags-container .tags-item.active {
		color: var(--base-color-primary-dark-9);
		background: var(--base-color-night-primary);
	}
}

.tags-container .tags-item.sortable-ghost {
	opacity: 0;
}

.tags-container .tags-item .tags-item__close-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	margin-left: 10px;
	border-radius: 100%;
}

.tags-container .tags-item .tags-item__close-btn:hover {
	color: #FFF;
	background: rgba(0, 0, 0, .2);
}
</style>
