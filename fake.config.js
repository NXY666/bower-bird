// 因 idea 看不懂 wxt 的 alias ，所以需要一个假的配置文件来哄 idea 。
import path from 'path';

const resolve = (dir) => path.join(process.cwd(), dir);

export default {
	resolve: {
		alias: {
			'&': resolve('src'),
			'@': resolve('src/entries'),
			'@OPT': resolve('src/entries/options'),
			'@POP': resolve('src/entries/popup'),
			'@OFF': resolve('src/entries/offscreen')
		}
	}
};