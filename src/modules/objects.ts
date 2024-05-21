/**
 * 合并对象
 *
 * 使用新对象的属性覆盖基础对象的属性，且只合并存在于基础对象的属性。
 * @param baseObject 基础对象
 * @param newObject 新对象
 * @returns 合并后的对象
 */
export function mergeObject<T>(baseObject: T, newObject: object): T {
	if (!newObject) {
		return baseObject;
	}
	Object.keys(baseObject).forEach(function (key) {
		if (newObject[key] === undefined) {
			return;
		}
		if (typeof baseObject[key] != "object" || Array.isArray(baseObject[key])) {
			baseObject[key] = newObject[key];
		} else {
			baseObject[key] = mergeObject(baseObject[key], newObject[key]);
		}
	});
	return baseObject;
}

/**
 * 复杂对象转换为简单对象
 * @param {Object} complexObject 复杂对象
 * @returns {Array} 转换后的对象
 */
export function simplifyObject(complexObject: object): any[] {
	let value = complexObject;
	let store = [value], objectMap = {};
	let processStack = [value];
	while (processStack.length > 0) {
		const activeObject = processStack.pop();
		const storeIndex = store.indexOf(activeObject);
		if (Array.isArray(activeObject)) {
			const newArr = [];
			for (let item of activeObject) {
				const itemStoreIndex = store.indexOf(item);
				if (itemStoreIndex !== -1) {
					newArr.push(itemStoreIndex);
				} else {
					newArr.push(store.push(item) - 1);
					if (typeof item === 'object' && item !== null) {
						processStack.push(item);
					}
				}
			}
			objectMap[storeIndex] = newArr;
		} else {
			let newObj = {};
			for (let key in activeObject) {
				const itemStoreIndex = store.indexOf(activeObject[key]);
				if (itemStoreIndex !== -1) {
					newObj[key] = itemStoreIndex;
				} else {
					newObj[key] = store.push(activeObject[key]) - 1;
					if (typeof activeObject[key] === 'object' && activeObject[key] !== null) {
						processStack.push(activeObject[key]);
					}
				}
			}
			objectMap[storeIndex] = newObj;
		}
	}
	Object.keys(objectMap).forEach(key => {
		store[key] = objectMap[key];
	});
	return store;
}

/**
 * 简单对象转换为复杂对象
 * @param simpleObject 简单对象
 * @returns 转换后的对象
 */
export function complicateObject(simpleObject: any[]): object {
	if (!simpleObject) {
		return null;
	}
	let store = simpleObject;
	let objectMap = {};
	for (let i = 0; i < store.length; i++) {
		if (typeof store[i] === 'object' && store[i] !== null) {
			if (Array.isArray(store[i])) {
				objectMap[i] = [];
			} else {
				objectMap[i] = {};
			}
		}
	}
	Object.keys(objectMap).forEach(key => {
		const oldObj = store[key];
		const newObj = objectMap[key];
		if (Array.isArray(oldObj)) {
			for (let oldItem of oldObj) {
				newObj.push(typeof store[oldItem] === 'object' && store[oldItem] !== null ? objectMap[oldItem] : store[oldItem]);
			}
		} else {
			for (let oldKey in oldObj) {
				const oldItem = oldObj[oldKey];
				newObj[oldKey] = (typeof store[oldItem] === 'object' && store[oldItem] !== null) ? objectMap[oldItem] : store[oldItem];
			}
		}
	});
	Object.keys(objectMap).forEach(key => {
		store[key] = objectMap[key];
	});
	return store[0];
}

/**
 * 反序列化复杂对象JSON
 * @param {string} json JSON字符串
 * @return {any}
 */
export function parseComplexObject(json: string): object {
	return complicateObject(JSON.parse(json));
}

/**
 * 序列化复杂对象JSON
 * @param {any} object 复杂对象
 * @return {string}
 */
export function stringifyComplexObject(object: object): string {
	return JSON.stringify(simplifyObject(object));
}

/**
 * 将对象内的函数转换为函数结果
 * @param object 对象
 * @param recursive 是否递归转换，默认为true
 * @return 转换后的对象
 */
export async function resultifyObject(object: object, {recursive = true} = {recursive: true}): Promise<any> {
	let result = {};
	for (let key in object) {
		if (typeof object[key] === "function") {
			result[key] = await object[key]();
		} else if (typeof object[key] === "object" && object[key] !== null && recursive) {
			result[key] = await resultifyObject(object[key]);
		} else {
			result[key] = object[key];
		}
	}
	return result;
}

/**
 * 深拷贝对象
 * @param object 对象
 * @return 拷贝后的对象
 */
export function deepCopyObject(object: any | any[]): any | any[] | undefined {
	return typeof object === "undefined" ? object : JSON.parse(JSON.stringify(object));
}
