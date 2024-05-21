import {defineConfig} from "wxt";
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import {ElementPlusResolver} from "unplugin-vue-components/resolvers";
import htmlMinifier from 'vite-plugin-html-minifier';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
	srcDir: 'src',
	publicDir: 'public',
	entrypointsDir: 'entries',
	browser: 'chrome',
	manifest: {
		name: "园丁鸟",
		minimum_chrome_version: "120",
		version: "0.0.0.0",
		version_name: "0.0.0",
		description: "描述写的不错。",
		icons: {
			"128": "./icons/icon.png"
		},
		author: "NXYBW",
		host_permissions: [
			"<all_urls>"
		],
		permissions: [
			"contextMenus",
			"storage",
			"tabs",
			"offscreen",
			"scripting",
			"userScripts",
			"activeTab",
			"unlimitedStorage",
			"declarativeNetRequest",
			"declarativeNetRequestFeedback",
		]
	},
	alias: {
		"&": "src",
		"@": "src/entries",
		"@OPT": "src/entries/options",
		"@POP": "src/entries/popup",
		"@OFF": "src/entries/offscreen",
	},
	vite: () => ({
		plugins: [
			vue(),
			AutoImport({
				resolvers: [ElementPlusResolver()]
			}),
			Components({
				resolvers: [ElementPlusResolver()]
			}),
			htmlMinifier()
		],
		build: {
			target: ['chrome120', 'edge120'],
		}
	}),
});