<template>
	<section class="wrapper">
		<aside class="side-bar">
			<div class="logo-container">
				<router-link to="/" @dragstart.prevent>
					<img alt="logo" class="logo" src="/icons/icon-white.png" @dragstart.prevent>
				</router-link>
			</div>
			<div class="navigation-container">
				<el-scrollbar>
					<ul>
						<li v-for="item in menu" :key="item" :class="{active:item.active}" class="navigation-item"
							@click="showMenu(item)">
							<g-symbol :fill="item.active" :font-size="2" class="item-icon">
								{{ item.meta.icon }}
							</g-symbol>
							<p class="item-title">{{ item.meta.title }}</p>
						</li>
					</ul>
				</el-scrollbar>
			</div>
		</aside>
		<main>
			<svg class="corner" height="10px" width="10px" xmlns="http://www.w3.org/2000/svg">
				<path d="M 0,0 L 20,0 L 20,20 L 0,20 z M 10,10 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0"/>
			</svg>
			<tags/>
			<router-view v-slot="{ Component }">
				<transition mode="out-in" name="el-fade-in-linear">
					<div id="main-content" class="main-content" :key="$route.fullPath">
						<component :is="Component"/>
					</div>
				</transition>
			</router-view>
		</main>
	</section>
</template>

<script>
import Tags from "@OPT/layouts/index/Tags.vue";
import GSymbol from "&/components/GSymbol.vue";
import NProgress from "nprogress";

NProgress.configure({parent: '#main-content'});

export default {
	name: 'CrxIndex',
	components: {GSymbol, Tags},
	data() {
		return {
			settingDialog: false,
			menu: [],
			nextMenu: [],
			pmenu: {},
			active: ''
		};
	},
	created() {
		this.menu = [{
			"name": "CrxIndexHome",
			"meta": {"title": "首页", "icon": "home"}
		}, {
			// 宏
			"name": "CrxIndexMacro",
			"meta": {"title": "宏", "icon": "radio_button_checked"}
		}, {
			// AI 函数
			"name": "CrxIndexSmart",
			"meta": {"title": "AI 函数", "icon": "robot_2"}
		}, {
			// 元素
			"name": "CrxIndexElement",
			"meta": {"title": "元素", "icon": "stacks"}
		}, {
			// 日志
			"name": "CrxIndexLog",
			"meta": {"title": "日志", "icon": "contract"}
		}, {
			// 数据
			"name": "CrxIndexExport",
			"meta": {"title": "数据", "icon": "data_table"}
		}];
		if (import.meta.env.MODE === 'development') {
			this.menu.push({
				// 测试页
				"name": "CrxIndexTest",
				"meta": {"title": "测试", "icon": "bug_report"}
			});
		}
		this.showThis();
	},
	watch: {
		$route() {
			this.showThis();
		}
	},
	methods: {
		// 路由监听高亮
		showThis() {
			// 获取当前路由的name值
			const name = this.$route.name;
			// 将当前的name值赋值给active
			this.menu.forEach(item => {
				item.active = item.name === name;
			});
		},
		// 点击显示
		showMenu(route) {
			this.$router.push({name: route.name});
		},
		// 退出最大化
		exitMaximize() {
			document.getElementById('app').classList.remove('main-maximize');
		}
	}
};
</script>

<style lang="scss" scoped>
.wrapper {
  display: flex;
  overflow: auto;
  flex: 1;

  .side-bar {
    display: flex;
    flex-flow: column;
    flex-shrink: 0;
    width: 75px;
    background: var(--base-color-primary-dark-9);

    .logo-container {
      height: 45px;

      .logo {
        z-index: 1033;
        height: 30px;
        vertical-align: bottom;
        filter: drop-shadow(0 0 6px var(--base-color-primary));
        transition: filter .2s, transform .1s;

        &:hover {
          filter: drop-shadow(0 0 12px var(--base-color-primary));
        }

        &:active {
          transform: scale(0.9);
        }
      }

      a {
        display: flex;
        align-items: center;
        justify-content: center;
        outline: none;
        width: 100%;
        height: 100%;
      }
    }

    .navigation-container {
      overflow: auto;
      overflow-x: hidden;
      flex: 1;
      height: 100%;

      .navigation-item {
        display: flex;
        align-items: center;
        flex-direction: column;
        justify-content: center;
        height: 70px;
        cursor: pointer;
        transition: all .1s;
        text-align: center;
        color: white;
        --ic-active-color: white;
        --ic-bg-active-color: var(--base-color-primary);

        @media (prefers-color-scheme: dark) {
          --ic-active-color: var(--base-color-primary-dark-9);
          --ic-bg-active-color: var(--base-color-night-primary);
        }

        .item-icon {
          height: 32px;
          width: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 100px;
          transition: all .2s;
        }

        .item-title {
          margin-top: 5px;
        }

        &:hover .item-icon {
          background-color: rgba(255, 255, 255, 0.1);
          --font-grad: 200 !important;
          --font-size: 48 !important;
        }

        &:active .item-icon {
          background-color: rgba(255, 255, 255, 0.2);
          --font-grad: 200 !important;
        }

        &.active .item-icon {
          color: var(--ic-active-color);
          background: var(--ic-bg-active-color);
        }

        &.active {
          cursor: default;
        }
      }
    }
  }

  /* 右侧内容 */
  main {
    flex: 1;
    display: flex;
    flex-flow: column;
    width: calc(100% - 75px);
    position: relative;

    .corner {
      position: absolute;
      top: 45px;
      left: 0;
      z-index: 1032;
      fill: var(--base-color-primary-dark-9);
      pointer-events: none;
    }

    :deep(.main-content) {
      overflow: auto;
      background-color: var(--el-color-info-light-9);
      flex: 1;

      .breadcrumb {
        margin: 20px 30px;
      }

      .el-table {
        margin: 20px 30px 30px;
        border-radius: 10px;
        width: calc(100% - 60px) !important;

        div.el-table__inner-wrapper:before {
          background-color: var(--el-bg-color);
        }

        tr.el-table__row:hover > td.el-table__cell {
          background-color: transparent;
        }

        .el-table--enable-row-transition .el-table__body td.el-table__cell {
          transition: none;
        }

        .el-table__empty-block {
          background-color: var(--el-table-tr-bg-color);
        }

        .table-header-row {
          height: 50px;
        }

        .row-switch {
          margin-left: 12px;
        }

        //noinspection CssInvalidPropertyValue
        .row-icon {
          background: linear-gradient(to right, var(--el-color-primary-light-2), var(--el-color-primary-dark-2));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent; /* 使文字颜色透明显示背景 */
          margin-left: 12px;
          width: -webkit-fill-available;
        }

        .row-info {
          display: flex;
          flex-direction: column;
          height: 50px;
          justify-content: center;

          .info-title {
            color: var(--el-color-primary);
            font-weight: bold;
            font-size: 15px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .info-desc {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
        }

        .row-btn-group {
          padding: 3px 0;

          .row-btn {
            line-height: 2;
          }
        }
      }
    }
  }
}
</style>