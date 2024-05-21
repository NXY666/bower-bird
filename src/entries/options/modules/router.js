import {createRouter, createWebHashHistory} from "vue-router";
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

export const router = createRouter({
	history: createWebHashHistory(),
	routes: [
		{
			name: "Crx",
			path: "/",
			component: () => import("@OPT/Options.vue"),
			children: [
				{
					name: "CrxIndex",
					path: "/",
					component: () => import('@OPT/pages/Index.vue'),
					meta: {
						title: "欢迎使用"
					},
					redirect: {name: "CrxIndexHome"},
					children: [
						{
							name: "CrxIndexHome",
							path: "/home",
							component: () => import("@OPT/pages/index/Home.vue"),
							meta: {
								title: "首页",
								affix: true
							}
						},
						{
							name: "CrxIndexMacro",
							path: "/macro",
							component: () => import("@OPT/pages/index/Macro.vue"),
							meta: {
								title: "宏"
							}
						},
						{
							name: "CrxIndexSmart",
							path: "/smart",
							component: () => import("@OPT/pages/index/Smart.vue"),
							meta: {
								title: "AI 函数"
							}
						},
						{
							name: "CrxIndexElement",
							path: "/element",
							component: () => import("@OPT/pages/index/Element.vue"),
							meta: {
								title: "元素"
							}
						},
						{
							name: "CrxIndexLog",
							path: "/log",
							component: () => import("@OPT/pages/index/Log.vue"),
							meta: {
								title: "日志"
							}
						},
						{
							name: "CrxIndexExport",
							path: "/export",
							component: () => import("@OPT/pages/index/Export.vue"),
							meta: {
								title: "数据"
							}
						},
						{
							name: "CrxIndexTest",
							path: "/test",
							component: () => import("@OPT/pages/index/Test.vue"),
							meta: {
								title: "测试"
							}
						},
						{
							name: "CrxEditor",
							path: "/editor/:id",
							component: () => import("@OPT/pages/Editor.vue"),
							meta: {
								title: "编辑器"
							}
						}
					]
				}
			]
		},
		{
			name: "Error",
			path: "/error",
			meta: {
				title: "错误"
			},
			component: () => import("@OPT/pages/Error.vue"),
			children: [
				{
					name: "ErrorConnectionFailed",
					path: "/-1",
					component: () => import("@OPT/pages/error/ConnectionFailed.vue"),
					meta: {
						title: "网络异常"
					}
				}
			]
		},
		{
			name: "NotFoundRedirect",
			path: "/:pathMatch(.*)*",
			redirect: "/"
		}
	]
});

router.beforeEach(function (to, from, next) {
	NProgress.start();
	next();
});

// noinspection JSUnusedLocalSymbols
router.afterEach(function (to, from) {
	// noinspection JSUnresolvedVariable
	if (to.meta.title) {
		document.title = to.meta.title + " - 园丁鸟窝";
	}
	NProgress.done();
});