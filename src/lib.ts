import { Dispatch, SetStateAction } from "react";
import { Folder, PieCache } from "./App";

export type Option<T> = T | None;
export type None = null;
export var None: None = null;

export function isSome<T>(option: Option<T>): option is T {
    return option !== null;
}

export function isNone<T>(option: Option<T>): option is None {
    return option === null;
}

export function unwrap<T>(option: Option<T>): T {
    if (option !== null) {
        return option as T;
    } else {
        throw new Error("unwrap on null value");
    }
}

export function unwrapOr<T>(option: Option<T>, value: T): T {
    if (option !== null) {
        return option as T;
    } else {
        return value as T;
    }
}

export function asOption<T>(option: T): Option<Exclude<T, null | undefined>> {
    if (option === null || option === undefined) {
        return None;
    } else {
        return option as Exclude<T, null | undefined>;
    }
}

export function convertSize(size: number): [string, string] {
    let string = size.toString();
    if (range(0, 4).contains(string.length)) {
        return [`${size}`, `B`];
    } else if (range(4, 7).contains(string.length)) {
        return [`${(size / iec(1)).toFixed(2)}`, `KB`];
    } else if (range(7, 10).contains(string.length)) {
        return [`${(size / iec(2)).toFixed(2)}`, `MB`];
    } else if (range(10, 13).contains(string.length)) {
        return [`${(size / iec(3)).toFixed(2)}`, `GB`];
    } else if (range(13, 16).contains(string.length)) {
        return [`${(size / iec(4)).toFixed(2)}`, `TB`];
    } else if (range(16, 22).contains(string.length)) {
        return [`${(size / iec(4)).toFixed(2)}`, `TB`];
    } else {
        return [`0`, `B`];
    }
}

export function fileName(absPath: string): string {
    return absPath.replace(/^.*[\\/]/, "");
}

function iec(pow: number): number {
    return Math.pow(1024, pow);
}

class Range {
    start: number;
    end: number;
    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
    contains(number: number): boolean {
        return this.start <= number && this.end > number;
    }
}

function range(start: number, end: number): Range {
    return new Range(start, end);
}

export function convertFile(fileName: string): [string, string] {
    let x = fileName.split(".");
    if (x.length === 1) {
        return [fileName, ""];
    } else {
        return [x.slice(0, x.length - 1).join(""), "." + x[x.length - 1]];
    }
}

export function convertPath(path: string | null): [boolean, string, string][] {
    if (path === null) {
        return [];
    }
    let res = [];
    let temp = 0;
    for (let i = 0; i < path.length; i++) {
        if (path[i] === "/" || path[i] === "\\") {
            res.push([false, path.slice(temp, i), path.slice(0, i + 1)]);
            res.push([true, path[i]]);
            temp = i + 1;
        }
    }
    res.push([false, path.slice(temp, path.length), path.slice(0, path.length)]);
    return res as [boolean, string, string][];
}

export function convertMatch(string: string, pat: string): [boolean, string][] {
    let res = [];
    let temp = 0;
    for (let i = 0; i <= string.length - pat.length; i++) {
        if (string.slice(i, i + pat.length) === pat) {
            res.push([false, string.slice(temp, i)]);
            res.push([true, pat]);
            i += pat.length;
            temp = i;
        }
    }
    res.push([false, string.slice(temp, string.length)]);
    console.log(res);
    return res as [boolean, string][];
}

export function pieData(
    folder: Folder,
    cache: PieCache,
    setCache: Dispatch<SetStateAction<PieCache>>
): { id: string; value: number; label: string; color: string }[] {
    if (cache.has(folder.root)) {
        return cache.get(folder.root)!;
    }
    let other = folder.entries.slice(10);
    let res = folder.entries.slice(0, 10).map((node) => ({
        id: node[1],
        value: node[0],
        label: fileName(node[1]),
        color: node[2] ? "rgb(39, 39, 42)" : "rgb(113, 113, 122)",
    }));
    if (other && other.length !== 0) {
        let size = other.reduce((prev, curr) => prev + curr[0], 0);
        res.push({ id: "Other", value: size, label: "Other", color: "rgb(212, 212, 216)" });
    }
    setCache((prev) => {
        prev.set(folder.root, res);
        return prev;
    });
    return res;
}

function preventDefault(ev: KeyboardEvent) {
    const ctrlKey = ev.ctrlKey;
    const altKey = ev.altKey;
    const shiftKey = ev.shiftKey;

    switch (ev.key) {
        case "B":
        case "d":
        case "f":
        case "g":
        case "h":
        case "j":
        case "k":
        case "l":
        case "L":
        case "m":
        case "M":
        case "n":
        case "N":
        case "o":
        case "O":
        case "p":
        case "P":
        case "r":
        case "R":
        case "S":
        case "t":
        case "T":
        case "u":
        case "U":
        case "v":
        case "w":
        case "W":
        case "y":
        case "0":
            if (ctrlKey) {
                ev.preventDefault();
            }
            break;
        case "e":
        case "I":
            if (ctrlKey || altKey) {
                ev.preventDefault();
            }
            break;
        case "Enter":
            if ((ctrlKey && shiftKey) || (altKey && shiftKey)) {
                ev.preventDefault();
            }
            break;
        case "Tab":
            if (shiftKey) {
                ev.preventDefault();
            }
            break;
        default:
            break;
    }
}

document.addEventListener("keydown", (ev) => preventDefault(ev));
document.addEventListener("contextmenu", (ev) => ev.preventDefault());
