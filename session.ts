import { createOption, getScene, Scene } from "@/db.ts";

const SESSION_TIMEOUT = 1000 * 60 * 20;

function until(time: number): Promise<void> {
    return new Promise(resolve => { setTimeout(resolve, time - Date.now()) });
}

export let defaultScene = await getScene(1);

export default class Session {
    static sessions: Record<string, Session> = {};

    id: string = crypto.randomUUID();
    scene: Scene = defaultScene;
    items: Record<number, number> = {};
    activity: number = Date.now();
    ready: Promise<unknown>;

    constructor() {
        this.ready = getScene(1).then(scene => {
            this.scene = scene;
            defaultScene = scene;
        });
        until(this.activity + SESSION_TIMEOUT).then(async () => {
            while (Date.now() < this.activity - 1000) {
                await until(this.activity + SESSION_TIMEOUT);
            }
            this.end();
        });
    }

    addItem(id: number, count: number = 1) {
        let amount = this.items[id] || 0;
        amount += count;
        if (amount <= 0) {
            delete this.items[id];
        } else {
            this.items[id] = amount;
        }
    }

    async choose(optionNumber: number) {
        this.activity = Date.now();
        const option = this.scene.options[optionNumber];
        const scene = option.link;
        if (option.required_item) {
            this.addItem(option.required_item.id, -1);
        }
        this.scene = await getScene(scene);
        for (const item of this.scene.items) {
            this.addItem(item.id);
        }
    }

    async createOption(option: string, scene: string, required_item?: number) {
        if (
            (required_item && !(required_item in this.items)) ||
            this.scene.options.length >= 4
        ) {
            throw new Error();
        }
        this.activity = Date.now();
        await createOption(this.scene.id, option, scene, required_item);
        this.scene = defaultScene;
        this.items = {};
        this.end();
    }

    end() {
        delete Session.sessions[this.id];
    }
}