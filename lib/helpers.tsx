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

function isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127
    );
  }
  
  function isPrivateIPv6(ip: string): boolean {
    return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd');
  }
  
  export function isPublicIP(ip: string): boolean {
    if (ip.includes('.')) {
      return !isPrivateIPv4(ip);
    }
    if (ip.includes(':')) {
      return !isPrivateIPv6(ip);
    }
    return false;
  }
  