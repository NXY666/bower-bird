<template>
	<div class="container" @dragenter="dragEnter" @dragleave="dragLeave" @dragover="dragOver" @drop="drop"
		 @contextmenu.prevent="openEditBlockDialog">
		<div class="content">
			<div v-for="(layer,index) in blockInst.layerList" :key="index"
				 :class="{
					start: blockInst.isStartBlock,
					end: blockInst.isEndBlock,
					last: blockInst.layerList.length - index === 1
				}" :style="{background: layer.getColor(isDark)}" class="stick"/>
			<div class="detail">
				<placeholder :active="topActive" :class="{end:blockInst.isEndBlock}" class="placeholder"/>
				<div :style="{background: blockInst.getColor(isDark)}" class="block-info" draggable="true"
					 @dragstart="dragStart">
					<div class="block-title text-ellipsis">{{ blockInst.title }}</div>
					<div class="block-description text-ellipsis" v-html="blockInst.description"/>
				</div>
				<placeholder :active="bottomActive" :class="{start:blockInst.isStartBlock}" class="placeholder"/>
				<svg v-if="blockInst.isStartBlock" :style="{fill: blockInst.getColor(isDark)}" class="corner start"
					 height="10px"
					 width="10px" xmlns="http://www.w3.org/2000/svg">
					<path d="M 0,0 L 20,0 L 20,20 L 0,20 z M 10,10 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0"/>
				</svg>
				<svg v-if="blockInst.isEndBlock" :style="{fill: blockInst.getColor(isDark)}" class="corner end"
					 height="10px"
					 width="10px" xmlns="http://www.w3.org/2000/svg">
					<path d="M 0,0 L 20,0 L 20,20 L 0,20 z M 10,10 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0"/>
				</svg>
			</div>
		</div>
		<div v-if="active" class="overlay"/>
	</div>
</template>

<script>

import Placeholder from "&/components/Placeholder.vue";
import {Block} from "&/classes/Block.ts";
import {getBlockByName} from "&/classes/BlockType.ts";

export default {
	name: 'Block',
	emits: ['move-before-block', 'move-after-block', 'edit-block'],
	components: {Placeholder},
	props: {
		index: {
			type: Number,
			default: 0
		},
		blockInst: {
			type: Block
		}
	},
	data() {
		const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
		return {
			mediaQueryList,
			isDark: mediaQueryList.matches,
			dragBlockPos: "none"
		};
	},
	created() {
		this.mediaQueryList.addEventListener('change', this.handleIsDarkChanged);
	},
	unmounted() {
		this.mediaQueryList.removeEventListener('change', this.handleIsDarkChanged);
	},
	computed: {
		active() {
			return this.dragBlockPos !== "none";
		},
		topActive() {
			return this.dragBlockPos === "top";
		},
		bottomActive() {
			return this.dragBlockPos === "bottom";
		}
	},
	methods: {
		handleIsDarkChanged(e) {
			this.isDark = e.matches;
		},

		updateDragBlockPos(direction) {
			this.dragBlockPos = direction;
		},

		dragStart(e) {
			// console.log("dragStart", e);
			e.dataTransfer.setData('text/plain', "你想干什么？");
			e.dataTransfer.setData('bower/block', "");
			e.dataTransfer.setData('text/id', this.blockInst.id);
			e.dataTransfer.setData(`bid/${this.blockInst.bid}`, "");
			e.dataTransfer.effectAllowed = "move";
		},
		dragEnter(e) {
			// console.log("dragEnter", e);
			if (
				// 要是块
				!e.dataTransfer.types.includes('bower/block') ||
				// 不能拖动到自己身上
				e.dataTransfer.types.includes(`bid/${this.blockInst.bid}`) ||
				// 不能拖动到自己的子元素身上
				this.blockInst.layerList.some(layer => e.dataTransfer.types.includes(`bid/${layer.bid}`))
			) {
				return;
			}
			e.preventDefault();

			this.updateDragBlockPos("middle");
		},
		dragOver(e) {
			if (this.dragBlockPos === "none") {
				return;
			}
			e.preventDefault();

			const dropTarget = this.$el; // 获取目标元素
			const rect = dropTarget.getBoundingClientRect(); // 获取div的位置和尺寸

			const divTop = rect.top; // div的顶部Y坐标
			const divHeight = rect.height; // div的高度

			// 判断鼠标位置是否在div的上半部分
			this.updateDragBlockPos(e.clientY < divTop + divHeight / 2 ? "top" : "bottom");
		},
		dragLeave(e) {
			if (this.dragBlockPos === "none") {
				return;
			}
			if (this.$el.contains(e.relatedTarget)) {
				return;
			}
			e.preventDefault();
			// console.log("dragLeave", e);

			setTimeout(() => {
				this.updateDragBlockPos("none");
			}, 60);
		},
		async drop(e) {
			e.preventDefault();
			this.updateDragBlockPos("none");

			let id;
			if (e.dataTransfer.types.includes('text/name')) {
				// 如果是新的块就创建
				const name = e.dataTransfer.getData('text/name');
				const block = new (await getBlockByName(name))();
				await block.build();
				id = block.id;
			} else {
				// 否则就是旧块移动
				id = e.dataTransfer.getData('text/id');
			}

			const dropTarget = this.$el; // 获取目标元素
			const rect = dropTarget.getBoundingClientRect(); // 获取div的位置和尺寸

			const divTop = rect.top; // div的顶部Y坐标
			const divHeight = rect.height; // div的高度

			// 判断鼠标位置是否在div的上半部分
			if (e.clientY < divTop + divHeight / 2) {
				this.$emit('move-before-block', id, this.blockInst.id);
			} else {
				this.$emit('move-after-block', id, this.blockInst.id);
			}
		},

		openEditBlockDialog() {
			this.$emit('edit-block', this.blockInst);
		}
	}
};
</script>

<style lang="scss" scoped>
.container {
  position: relative;
}

.content {
  display: flex;
  gap: 15px;

  .stick {
    width: 10px;
    border-radius: 5px;
    flex: 0 0 auto;

    &.end, &.start {
      z-index: 1;
    }

    &.last:not(.end) {
      margin-top: 20px;
    }

    &.last:not(.start) {
      margin-bottom: 20px;
    }
  }

  .detail {
    margin-left: -25px;
    position: relative;
    flex: 1;
    width: 0;

    .block-info {
      border-radius: 10px;
      box-shadow: 0 5px 10px rgba(0, 0, 0, .04);
      padding: 15px 20px;

      .block-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
        letter-spacing: 0.025em;
      }

      .block-description {
        font-size: 14px;
      }
    }

    .placeholder {
      &.start, &.end {
        margin-left: 25px;
      }
    }

    .corner {
      position: absolute;
      left: 10px;

      &.start {
        bottom: 3px;
      }

      &.end {
        top: 3px;
        transform: rotateX(180deg);
      }
    }
  }

  .overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}
</style>