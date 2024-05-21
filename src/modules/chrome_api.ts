import {Messages} from "&/modules/messages";
import * as bgHttp from "&/modules/background/http";
import {HttpOptions} from "&/modules/background/http";
import QueryOptions = chrome.windows.QueryOptions;
import UpdateInfo = chrome.windows.UpdateInfo;
import CreateData = chrome.windows.CreateData;
import CookieSetDetails = chrome.cookies.SetDetails;
import Details = chrome.cookies.Details;
import GetAllDetails = chrome.cookies.GetAllDetails;

interface HttpResponse {
	statusCode: number;
	statusMessage: string;
	body: string;
}

async function parseHttpResponse(response: Response | Error | null) {
	if (response == null) {
		return {
			statusCode: -2,
			statusMessage: null,
			body: null
		};
	} else if (response instanceof Error) {
		return {
			statusCode: -1,
			statusMessage: `${response.name}: ${response.message}`,
			body: response.stack
		};
	} else {
		return {
			statusCode: response.status,
			statusMessage: response.statusText,
			body: await response.text()
		};
	}
}

export const chromeApiRouter = {
	'Fetch.Request': async (data: HttpOptions) => {
		try {
			return await parseHttpResponse(await bgHttp.request(data));
		} catch (e) {
			throw await parseHttpResponse(e);
		}
	},
	'Fetch.Get': async (data: HttpOptions) => {
		try {
			return await parseHttpResponse(await bgHttp.get(data));
		} catch (e) {
			throw await parseHttpResponse(e);
		}
	},
	'Fetch.Post': async (data: HttpOptions) => {
		try {
			return await parseHttpResponse(await bgHttp.post(data));
		} catch (e) {
			throw await parseHttpResponse(e);
		}
	},
	'Cookie.Get': async (data: Details) => {
		return await chrome.cookies.get(data);
	},
	'Cookie.GetAll': async (data: GetAllDetails) => {
		return await chrome.cookies.getAll(data);
	},
	'Cookie.GetAllCookieStores': async () => {
		return await chrome.cookies.getAllCookieStores();
	},
	'Cookie.Remove': async (data: Details) => {
		return await chrome.cookies.remove(data);
	},
	'Cookie.Set': async (data: CookieSetDetails) => {
		return await chrome.cookies.set(data);
	},
	'Storage.Get': async (data?: string | string[] | { [key: string]: any } | null) => {
		return await chrome.storage.local.get(data);
	},
	'Storage.Set': async (data: { [key: string]: any }) => {
		return await chrome.storage.local.set(data);
	},
	"Storage.Remove": async (data: string | string[]) => {
		return await chrome.storage.local.remove(data);
	},
	"Storage.Clear": async () => {
		return await chrome.storage.local.clear();
	},
	'Storage.Session.Get': async (data?: string | string[] | { [key: string]: any } | null) => {
		return await chrome.storage.session.get(data);
	},
	'Storage.Session.Set': async (data: { [key: string]: any }) => {
		return await chrome.storage.session.set(data);
	},
	"Storage.Session.Remove": async (data: string | string[]) => {
		return await chrome.storage.session.remove(data);
	},
	"Storage.Session.Clear": async () => {
		return await chrome.storage.session.clear();
	},
	'Windows.Create': async (data: CreateData) => {
		return await chrome.windows.create(data);
	},
	'Windows.Get': async (data: number) => {
		return await chrome.windows.get(data);
	},
	'Windows.GetAll': async (data: QueryOptions) => {
		return await chrome.windows.getAll(data);
	},
	'Windows.GetCurrent': async (data: QueryOptions) => {
		return await chrome.windows.getCurrent(data);
	},
	'Windows.GetLastFocused': async (data: QueryOptions) => {
		return await chrome.windows.getLastFocused(data);
	},
	'Windows.Remove': async (data: number) => {
		return await chrome.windows.remove(data);
	},
	'Windows.Update': async (data: { windowId: number, updateInfo: UpdateInfo }) => {
		return await chrome.windows.update(data.windowId, data.updateInfo);
	}
};

const isBackground = chrome.runtime.openOptionsPage != null;

function sendMessage(type: string, data = null) {
	return isBackground ? chromeApiRouter[type]?.(data) : Messages.send(type, data);
}

export const http = {
	request: function (options: HttpOptions): Promise<HttpResponse> {
		return sendMessage('Fetch.Request', options);
	},
	get: function (options: HttpOptions): Promise<HttpResponse> {
		return sendMessage('Fetch.Get', options);
	},
	post: function (options: HttpOptions): Promise<HttpResponse> {
		return sendMessage('Fetch.Post', options);
	}
};

export const cookies = chrome.cookies ?? {
	get: function (details: chrome.cookies.Details) {
		return sendMessage('Cookie.Get', details);
	},
	getAll: function (details: chrome.cookies.Details) {
		return sendMessage('Cookie.GetAll', details);
	},
	getAllCookieStores: function () {
		return sendMessage('Cookie.GetAllCookieStores');
	},
	remove: function (details: chrome.cookies.Details) {
		return sendMessage('Cookie.Remove', details);
	},
	set: function (details: chrome.cookies.Details) {
		return sendMessage('Cookie.Set', details);
	}
} as {
	get: typeof chrome.cookies.get;
	getAll: typeof chrome.cookies.getAll;
	getAllCookieStores: typeof chrome.cookies.getAllCookieStores;
	remove: typeof chrome.cookies.remove;
	set: typeof chrome.cookies.set;
};

export const storage = {
	get: function (keys?: ((items: { [p: string]: any }) => void) |
		string | string[] |
		{ [p: string]: any }
	) {
		return sendMessage('Storage.Get', keys);
	},
	getKey: async function (key) {
		return (await storage.get(key))[key];
	},
	set: function (items: { [p: string]: any }) {
		return sendMessage('Storage.Set', items);
	},
	setKey: function (key, value) {
		return storage.set({[key]: value});
	},
	remove: function (keys: string | string[]) {
		return sendMessage('Storage.Remove', keys);
	},
	removeKey: function (key) {
		return storage.remove(key);
	},
	clear: function () {
		return sendMessage('Storage.Clear');
	}
} as {
	getKey: (key: string) => Promise<any>;
	setKey: (key: string, value: any) => Promise<void>;
	removeKey: (key: string) => Promise<void>;
	get: typeof chrome.storage.local.get;
	set: typeof chrome.storage.local.set;
	remove: typeof chrome.storage.local.remove;
	clear: typeof chrome.storage.local.clear;
};

export const tempStorage = {
	get: function (keys?: ((items: { [p: string]: any }) => void) |
		string | string[] |
		{ [p: string]: any }
	) {
		return sendMessage('Storage.Session.Get', keys);
	},
	getKey: async function (key) {
		return (await tempStorage.get(key))[key];
	},
	set: function (items: { [p: string]: any }) {
		return sendMessage('Storage.Session.Set', items);
	},
	setKey: function (key, value) {
		return tempStorage.set({[key]: value});
	},
	remove: function (keys: string | string[]) {
		return sendMessage('Storage.Session.Remove', keys);
	},
	removeKey: function (key) {
		return tempStorage.remove(key);
	},
	clear: function () {
		return sendMessage('Storage.Session.Clear');
	}
} as {
	getKey: (key: string) => Promise<any>;
	setKey: (key: string, value: any) => Promise<void>;
	removeKey: (key: string) => Promise<void>;
	get: typeof chrome.storage.session.get;
	set: typeof chrome.storage.session.set;
	remove: typeof chrome.storage.session.remove;
	clear: typeof chrome.storage.session.clear;
};

export const windows = {
	create: function (createData: ((window?: chrome.windows.Window) => void) | chrome.windows.CreateData) {
		return sendMessage('Windows.Create', createData);
	},
	get: function (windowId: number, queryOptions: chrome.windows.QueryOptions) {
		return sendMessage('Windows.Get', {windowId, queryOptions});
	},
	getAll: function (queryOptions: chrome.windows.QueryOptions) {
		return sendMessage('Windows.GetAll', queryOptions);
	},
	getCurrent: function (queryOptions: chrome.windows.QueryOptions) {
		return sendMessage('Windows.GetCurrent', queryOptions);
	},
	getLastFocused: function (queryOptions: chrome.windows.QueryOptions) {
		return sendMessage('Windows.GetLastFocused', queryOptions);
	},
	remove: function (windowId: number) {
		return sendMessage('Windows.Remove', windowId);
	},
	update: function (windowId: number, updateInfo: chrome.windows.UpdateInfo) {
		return sendMessage('Windows.Update', {windowId, updateInfo});
	}
} as {
	create: typeof chrome.windows.create;
	get: typeof chrome.windows.get;
	getAll: typeof chrome.windows.getAll;
	getCurrent: typeof chrome.windows.getCurrent;
	getLastFocused: typeof chrome.windows.getLastFocused;
	remove: typeof chrome.windows.remove;
	update: typeof chrome.windows.update;
};