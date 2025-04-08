import { createOption, getScene, Scene } from "@/db.ts";

export let defaultScene = await getScene(1);

export default class Session {
    static sessions: Record<string, Session> = {};

    scene: Scene = defaultScene;
    items: Record<number, number> = {};
    activity: number = Date.now();
    ready: Promise<unknown>;

    constructor() {
        this.ready = getScene(1).then(scene => {
            this.scene = scene;
            defaultScene = scene;
        })
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
    }
}