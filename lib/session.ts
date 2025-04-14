import { createOption, getItems, getScene, ID, ItemMap, Items, Option, Scene, start } from "./db.ts";
import { unimplemented } from "$std/assert/unimplemented.ts";

const SESSION_TIMEOUT = 1000 * 60 * 20;

function until(time: number): Promise<void> {
    return new Promise(resolve => { setTimeout(resolve, time - Date.now()) });
}

let startScene = await getScene(start);

export default class Session {
    static sessions: Record<ID, Session> = {};

    id: ID = crypto.randomUUID();
    scene: Scene = startScene;
    ready: Promise<void>;
    items: Items = {};
    activity: number = Date.now();

    constructor() {
        Session.sessions[this.id] = this;
        this.ready = this.#init();
        until(this.activity + SESSION_TIMEOUT).then(async () => {
            let end = this.activity + SESSION_TIMEOUT;
            while (Date.now() < end - 1000) {
                await until(end);
                end = this.activity + SESSION_TIMEOUT;
            }
            this.end();
        });
    }

    async #init() {
        startScene = await getScene(start);
        this.scene = startScene;
    }

    addItem(id: ID, count: number = 1) {
        let amount = this.items[id] || 0;
        amount += count;
        if (amount <= 0) {
            delete this.items[id];
        } else {
            this.items[id] = amount;
        }
    }

    getItems(): Promise<ItemMap> {
        return getItems(Object.keys(this.items) as unknown[] as ID[]);
    }

    has(items: Items) {
        for (const index in items) {
            const item = index as ID;
            if (this.items[item] < items[item]) {
                return false;
            }
        }
        return true;
    }

    end() {
        delete Session.sessions[this.id]
    }

    async choose(optionNumber: number) {
        if (this.scene.options.length <= 1 && this.scene.id != start) {
            throw new Error("Cannot choose from 1 or 0 options");
        }
        this.activity = Date.now();
        const option = this.scene.options[optionNumber];
        const totalWeight = option.link.reduce((acc, link) => acc + link.weight, 0);
        if (totalWeight === 0 || option.link.length === 0) {
            throw new Error("No valid links to choose from");
        }

        const threshold = Math.random() * totalWeight;

        let cumulative = 0;
        let newScene: Scene | null = null;
        for (const link of option.link) {
            cumulative += link.weight;
            if (cumulative >= threshold) {
                newScene = await getScene(link.value);
                break;
            }
        }
        if (!newScene) {
            unimplemented();
        }
        for (const index in newScene.items) {
            const item = index as ID;
            this.addItem(item, newScene.items[item]);
        }
        this.scene = newScene;
        return this.scene;
    }

    async createOption(option: Option) {
        this.activity = Date.now();
        if (this.scene.options.length >= 4) {
            throw new Error("Too many options");
        }
        this.scene = await createOption(this.scene.id, option);
        this.end();
        return this.scene;
    }
}