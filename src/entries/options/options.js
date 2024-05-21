import {createApp} from "vue";
import Options from "./Options.vue";
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'element-plus/theme-chalk/el-message.css';
import 'element-plus/theme-chalk/el-message-box.css';
import 'element-plus/theme-chalk/el-badge.css';
import "element-plus/dist/index.css";
import 'element-plus/theme-chalk/base.css';
import {router} from "./modules/router.js";
import errorHandler from "&/utils/ErrorHandler.js";
import 'highlight.js/styles/github.css';
import javascript from 'highlight.js/lib/languages/javascript';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import hljs from "highlight.js";

const app = createApp(Options);

// Vue Router
app.use(router);

// errorHandler
app.use({
	install(app) {
		app.config.errorHandler = errorHandler;
	}
});

// highlight.js
hljs.registerLanguage('javascript', javascript);
app.use(hljsVuePlugin);

app.mount("body");