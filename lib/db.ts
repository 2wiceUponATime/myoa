/// <reference lib="deno.unstable" />

type CacheValue = {
    expiresAt: number;
    value: unknown;
    versionstamp?: string;
};

type DbResult = {
    key: Deno.KvKey;
    value: unknown;
    versionstamp?: string;
}

class Database {
    kv: Deno.Kv;
    timeout: number;
    written = false;
    atomic: Deno.AtomicOperation;
    cache: Record<string, CacheValue> = {};

    constructor(kv: Deno.Kv, timeout: number) {
        this.kv = kv;
        this.timeout = timeout;
        this.atomic = kv.atomic();
    }

    #toResult(result: Deno.KvEntryMaybe<unknown>): DbResult {
        if (result.value && result.versionstamp) {
            return result;
        }
        return {
            key: result.key,
            value: null,
        }
    }

    async get(key: string[]): Promise<DbResult> {
        const cached = this.cache[key.toString()];
        if (cached) {
            if (Date.now() < cached.expiresAt) {
                if (cached.value === null || cached.versionstamp === null) {
                    return {
                        key,
                        value: null
                    }
                }
                return {
                    key,
                    value: cached.value,
                    versionstamp: cached.versionstamp,
                };
            }
            delete this.cache[key.toString()];
        }
        const result = await this.kv.get(key);
        this.cache[key.toString()] = {
            expiresAt: Date.now() + this.timeout,
            value: result.value,
            versionstamp: result.versionstamp || undefined,
        };
        return this.#toResult(result);
    }

    async getMany(keys: string[][]) {
        const values: Map<Deno.KvKey, DbResult> = new Map();
        const newKeys: Deno.KvKey[] = [];
        for (const key of keys) {
            const cached = this.cache[key.toString()];
            if (cached) {
                if (Date.now() < cached.expiresAt) {
                    values.set(key, await this.get(key));
                    continue;
                }
                delete this.cache[key.toString()];
            }
            newKeys.push(key);
        }
        const results = await this.kv.getMany(newKeys);
        for (const result of results) {
            values.set(result.key, this.#toResult(result));
            this.cache[result.key.toString()] = {
                expiresAt: Date.now() + this.timeout,
                value: result.value,
                versionstamp: result.versionstamp || undefined,
            }
        }
        return values;
    }

    set(key: string[], value: unknown) {
        this.written = true;
        this.atomic.set(key, value);
        this.cache[key.toString()] = {
            expiresAt: Date.now() + this.timeout,
            value,
        };
    }

    commit() {
        if (this.written) {
            const atomic = this.atomic;
            this.atomic = this.kv.atomic();
            return atomic.commit();
        }
    }
}

export const db = new Database(await Deno.openKv(), 1000 * 60 * 5);

export const start = "bb179099-b85c-4558-8cb9-d658b0d42cce";

if (!(await getScene(start))) {
    createScene(
        "Welcome to Make Your Own Adventure, where the adventure is built by you!",
        {},
        start,
    )
}

export type ID = `${string}-${string}-${string}-${string}-${string}`;

export type Items = Record<ID, number>;

export type Scene = {
    id: ID;
    value: string;
    items: Items;
    options: Option[];
}

export type Option = {
    value: string;
    requiredItems: Items;
    link: Link[];
}

export type Link = {
    weight: number;
    value: ID;
}

export type Item = {
    id: ID,
    name: string,
    description?: string,
}

export type ItemMap = Record<ID, Item>;

export type SceneMap = Record<ID, Scene>;

export async function getScene(id: string): Promise<Scene> {
    return (await db.get(["scenes", id])).value as Scene;
}

export function setScene(id: ID, value: Scene) {
    db.set(["scenes", id], value);
}

export function createScene(
    value: string,
    items: Items = {},
    id: ID = crypto.randomUUID()
) {
    setScene(id, {
        id,
        value,
        items,
        options: [],
    });
    return id;
}

export async function getItem(id: ID): Promise<Item> {
    return (await db.get(["items", id])).value as Item;
}

export async function getItems(ids: ID[]): Promise<ItemMap> {
    const results = await db.getMany(ids.map(id => ["items", id]));
    const map: ItemMap = {};
    for (const [key, result] of results.entries()) {
        map[key[1] as ID] = result.value as Item;
    }
    return map;
}

export function setItem(id: ID, value: Item) {
    db.set(["items", id], value);
}

export function createItem(name: string, description?: string) {
    const id: ID = crypto.randomUUID();
    setItem(id, {
        id,
        name,
        description,
    });
    return id;
}

export async function createOption(id: ID, option: Option) {
    const scene = await getScene(id);
    scene.options.push(option);
    setScene(id, scene);
    return scene;
}
