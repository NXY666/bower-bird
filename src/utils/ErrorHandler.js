import {ElNotification} from "element-plus";

export default (error, vm) => {
	// 过滤HTTP请求错误
	if (error.status || error.status === 0) {
		return false;
	}

	console.error('[Global]', 'Unhandled error:', error);

	vm.$nextTick(() => {
		ElNotification({
			title: '未捕获的错误',
			message: error,
			type: 'error'
		});
	});
}
