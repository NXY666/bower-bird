/**
 * 执行函数，并在失败时重试
 * @param callback 要执行的函数
 * @param retryCount 重试次数
 * @param retryDelay 重试间隔
 * @param callThis 函数的this指向
 */
export function setRetry(
	callback: () => any,
	{
		retryCount = 100,
		retryDelay = 50,
		this: callThis = undefined
	} = {
		retryCount: 100,
		retryDelay: 50,
		this: undefined
	}
): Promise<any> {
	return new Promise(async (resolve, reject) => {
		let count = 0;
		const attempt = async () => {
			try {
				const result = await callback.call(callThis);
				resolve(result);
			} catch (e) {
				if (count < retryCount) {
					count++;
					setTimeout(attempt, retryDelay);
				} else {
					reject(e);
				}
			}
		};
		await attempt();
	});
}

/**
 * 防抖函数
 */
export class DebounceFunction<T extends any[]> {
	private timer: NodeJS.Timeout | null = null;
	private readonly callback: (...args: T) => any;
	private readonly delay: number;

	constructor(callback: (...args: T) => any, delay: number) {
		this.callback = callback;
		this.delay = delay;
	}

	/**
	 * 执行函数
	 *
	 * @param args 参数
	 */
	public debounce(...args: T) {
		clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.callback(...args);
		}, this.delay);
	}
}