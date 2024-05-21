export type AdvancedOptions = {
	mode: RequestMode;
	cache: RequestCache;
	credentials: RequestCredentials;
	redirect: RequestRedirect;
	referrerPolicy: ReferrerPolicy;
}

export type HttpOptions = {
	method?: string;
	url: string;
	param?: {};
	data?: object | FormData | string;
	headers?: {};
	advOpt?: AdvancedOptions;
}

export type RequestOptions = {
	method?: string;
	url: string;
	param?: {};
	data?: {};
	headers?: {};
	advOpt?: AdvancedOptions;
}

/**
 * 发送请求
 * @param options
 */
export function request(options: HttpOptions): Promise<Response> {
	// Post请求选项并入默认选项
	let requestOptions: RequestOptions = {
		method: null,
		url: null,
		param: {},
		data: null,
		headers: {},
		advOpt: {
			mode: "cors",
			cache: "default",
			credentials: "include",
			redirect: "follow",
			referrerPolicy: "no-referrer-when-downgrade"
		}
	};
	requestOptions = mergeOptions(requestOptions, options) as RequestOptions;

	// 格式化参数
	requestOptions.param = formatParams(requestOptions.param);
	let _url = requestOptions.url + (requestOptions.param ? ('?' + requestOptions.param) : '');

	let _data: object | FormData | string = requestOptions.data;
	if (typeof _data == "string" && requestOptions.headers["Content-Type"] !== "application/x-www-form-urlencoded") {
		requestOptions.headers["Content-type"] = "text/plain;charset=utf-8";
		_data = requestOptions.data;
	} else if (requestOptions.data instanceof FormData) {
		_data = requestOptions.data;
	} else if (typeof requestOptions.data == "object") {
		let formData = new FormData();

		if (Object.keys(requestOptions.data).some(key => {
			formData.append(key, requestOptions.data[key]);
			return requestOptions.data.hasOwnProperty(key) && requestOptions.data[key] instanceof File;
		})) {
			_data = formData;
		} else {
			requestOptions.headers["Content-type"] = "application/json;charset=utf-8";
			_data = JSON.stringify(requestOptions.data);
		}
	}

	// 监听状态
	let fetchOptions: RequestInit = {
		method: requestOptions.method, // *GET, POST, PUT, DELETE, etc.
		headers: requestOptions.headers,
		...requestOptions.advOpt
	};
	if (requestOptions.method.toUpperCase() !== "GET" && requestOptions.method.toUpperCase() !== "HEAD") {
		fetchOptions.body = _data as BodyInit;
	}

	return fetch(_url, fetchOptions);
}

export function get(options: HttpOptions) {
	options.method = "GET";
	return request(options);
}

export function post(options: HttpOptions) {
	options.method = "POST";
	return request(options);
}

export function formatParams(data: {}) {
	const arr = [];
	for (let name in data) {
		arr.push(encodeURIComponent(name) + "=" + encodeURIComponent(data[name]));
	}
	return arr.join("&");
}

// 原则：如果有默认值，则使用默认值，否则使用传入的值。
function mergeOptions<T, U>(def: T | T[], act: U | U[]): T & U | (T | U)[] | T | U {
	if (typeof def == "undefined" || def == null) {
		return act;
	} else if (typeof act == "undefined" || act == null) {
		return def;
	}

	if (typeof def !== "object" || typeof act !== "object") {
		return typeof def !== typeof act ? def : act;
	} else if (Array.isArray(def) !== Array.isArray(act)) {
		return def;
	} else if (Array.isArray(def) && Array.isArray(act)) {
		return [...def, ...act];
	}

	let res: any = {};
	for (let k in def) {
		res[k] = mergeOptions(def[k], act[k]);
	}
	for (let k in act) {
		res[k] = mergeOptions(def[k], act[k]);
	}
	return res;
}
