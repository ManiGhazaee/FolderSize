export function convertSize(size: number): string {
    let string = size.toString();
    if (range(0, 4).contains(string.length)) {
        return `${size}B`;
    } else if (range(4, 7).contains(string.length)) {
        return `${(size / iec(1)).toFixed(2)}KB`;
    } else if (range(7, 10).contains(string.length)) {
        return `${(size / iec(2)).toFixed(2)}MB`;
    } else if (range(10, 13).contains(string.length)) {
        return `${(size / iec(3)).toFixed(2)}GB`;
    } else if (range(13, 16).contains(string.length)) {
        return `${(size / iec(4)).toFixed(2)}TB`;
    } else if (range(16, 22).contains(string.length)) {
        return `${(size / iec(4)).toFixed(2)}TB`;
    } else {
        return `0B`;
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
