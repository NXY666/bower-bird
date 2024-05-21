import {Block} from "&/classes/Block";
let generatedBlockTypeMap: null | { [key: string]: typeof Block } = null;

export async function getBlockTypeMap(): Promise<{ [key: string]: typeof Block }> {
	if (generatedBlockTypeMap) {
		return generatedBlockTypeMap;
	}

	const module = await import('./Block');

	const blockTypes = {};

	// 筛选出里面的类中的原型链里面包含Block的类
	for (const key in module) {
		try {
			if (module[key] === module.Block || module[key].prototype instanceof module.Block) {
				blockTypes[key] = module[key];
			}
		} catch {
		}
	}

	generatedBlockTypeMap = blockTypes;

	return blockTypes;
}

export async function getBlockByType(type: string) {
	const blockTypes = await getBlockTypeMap();
	return blockTypes[type] ?? null;
}

let generatedBlockNameMap: null | { [key: string]: typeof Block } = null;

export async function getBlockNameMap(): Promise<{ [key: string]: typeof Block }> {
	if (generatedBlockNameMap) {
		return generatedBlockNameMap;
	}

	const blockTypes = await getBlockTypeMap();

	const blockNames = {};
	for (const key in blockTypes) {
		const block = blockTypes[key];
		blockNames[block.name] = block;
	}

	generatedBlockNameMap = blockNames;

	return blockNames;
}

export async function getBlockByName(name: string) {
	const blockNames = await getBlockNameMap();
	return blockNames[name] ?? null;
}

let generatedBlockMap: null | Map<typeof Block, { type: string, name: string }> = null;

export async function getBlockMetaMap(): Promise<Map<typeof Block, { type: string, name: string }>> {
	if (generatedBlockMap) {
		return generatedBlockMap;
	}

	const blockTypes = await getBlockTypeMap();

	const blockMap = new Map();
	for (const key in blockTypes) {
		const block = blockTypes[key];
		blockMap.set(block, {type: key, name: block.name});
	}

	generatedBlockMap = blockMap;

	return blockMap;
}

export async function getMetaByBlock(block: typeof Block) {
	const blockMap = await getBlockMetaMap();
	return blockMap.get(block) ?? null;
}
