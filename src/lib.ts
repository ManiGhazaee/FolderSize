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
