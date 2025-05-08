import { Item } from "@/lib/db.ts";
import { JSX } from "preact";

export function getId(id: string) {
    if (!document) {
        throw new Error("getId can only be called on the client");
    }
    const elem = document.getElementById(id);
    if (!elem) {
        throw new Error(`No element of id ${id}`);
    }
    return elem;
}

export function getItemText(item: Item, count = 1) {
    let text = item.name;
    if (count > 1) {
        text += ` (${count})`;
    }
    if (item.description) {
        text += ` - ${item.description}`;
    }
    return text;
}

export function Button(props: {
    children?: unknown | unknown[];
} & JSX.HTMLAttributes<HTMLButtonElement>) {
    let children: unknown[] = [];
    if (props.children) {
        children = props.children instanceof Array
            ? props.children
            : [props.children];
        delete props.children;
    }
    return (
        <button type="button" {...props}>
            {...children}
        </button>
    );
}