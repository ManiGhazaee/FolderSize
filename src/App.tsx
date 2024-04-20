import { open } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { convertSize, fileName } from "./lib";
import { window as tauriWindow } from "@tauri-apps/api";

type Entries = { parent: string; entries: [number, string, boolean][] };

function App() {
    const [dir, setDir] = useState<string | null>(null);
    const [dirSize, setDirSize] = useState<number | null>(null);
    const [entires, setEntries] = useState<Entries | null>(null);
    const [fileDrop, setFileDrop] = useState<string | null>(null);
    const [readyToSelect, setReadyToSelect] = useState(true);

    async function selectDir() {
        if (!readyToSelect) {
            return;
        }
        let selected = (await open({
            directory: true,
            multiple: false,
            defaultPath: "/",
        })) as string | null;

        if (selected === dir) {
            return;
        }
        if (selected !== null) {
            setEntries(null);
            folderSize(selected);
        }
    }

    async function folderSize(path: string) {
        setReadyToSelect(false);
        setDir(path);
        let size: number = await invoke("folder_size", { window: tauriWindow, path });
        setDirSize(size);
        setReadyToSelect(true);
    }

    useEffect(() => {
        listen("entries", (ev) => {
            let e = ev.payload as Entries;
            e.entries.sort((a, b) => b[0] - a[0]);
            setEntries(e);
        });
        listen("sum-size", (ev) => {
            setDirSize(ev.payload as number);
        });
        listen("tauri://file-drop-hover", (ev) => {
            if (ev.payload != null) {
                setFileDrop((ev.payload as string[])[0]);
            }
        });
        listen("tauri://file-drop-cancelled", () => {
            setFileDrop(null);
        });
        listen("tauri://file-drop", (ev) => {
            folderSize((ev.payload as string[])[0]);
            setFileDrop(null);
        });
    }, []);

    return (
        <div className="h-[100vh] overflow-hidden">
            {entires !== null && (
                <button
                    className="absolute top-[32px] -translate-y-1/2 right-[10px] bg-zinc-950 px-[16px] py-[6px] border rounded-xl border-zinc-900 text-zinc-100 hover:text-white hover:bg-zinc-900 hover:border-zinc-800 active:bg-zinc-200 active:border-zinc-300 active:text-black duration-100"
                    onClick={selectDir}
                >
                    S
                </button>
            )}
            <div className="absolute left-[14px] top-[20px] text-[22px] font-bold max-w-[calc(100vw-40px)] overflow-hidden">
                {dir?.toString()}
            </div>
            <div className="relative h-[calc(100vh-70px)] w-[calc(100vw-20px)] p-[10px] rounded-2xl left-1/2 -translate-x-1/2 top-[60px] bg-zinc-900 overflow-hidden">
                {entires === null && readyToSelect && (
                    <button
                        className="relative top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-zinc-950 px-[20px] py-[8px] border rounded-xl border-zinc-900 text-zinc-100 hover:text-white hover:bg-zinc-900 hover:border-zinc-800 active:bg-zinc-200 active:border-zinc-300 active:text-black duration-100"
                        onClick={selectDir}
                    >
                        Select a folder
                    </button>
                )}
                {entires === null && !readyToSelect && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-zinc-100">
                        Scanning...
                    </div>
                )}
                <div className="absolute font-bold left-1/2 -translate-x-1/2">
                    {dirSize !== null && convertSize(dirSize)}
                </div>
                {entires !== null && (
                    <div className="relative top-[38px] overflow-y-scroll overflow-x-hidden h-[calc(100%-38px)] rounded-xl">
                        <div
                            className="sticky top-0 w-full z-[100] bg-black font-bold px-[20px] py-[2px] hover:bg-zinc-800 rounded-t-xl"
                            onClick={() => {
                                if (entires.parent === "") {
                                    return;
                                }
                                folderSize(entires.parent);
                            }}
                        >
                            ..
                        </div>
                        {entires.entries.map((node, index) => {
                            let conv = convertSize(node[0]);
                            return (
                                <div
                                    className={`${index % 2 === 1 ? "bg-black" : "bg-transparent"} ${
                                        index === entires.entries.length - 1 ? "rounded-b-xl" : ""
                                    } px-[20px] py-[2px] hover:bg-zinc-800 text-zinc-50 flex flex-row`}
                                    onClick={() => {
                                        if (node[2]) {
                                            return;
                                        }
                                        folderSize(node[1]);
                                    }}
                                >
                                    <span className="flex-grow">{fileName(node[1])}</span>
                                    <span className="relative mr-[4px]">{conv[0]}</span>
                                    <span className="relative font-bold">{conv[1]}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div>{fileDrop !== null && fileDrop}</div>
            </div>
        </div>
    );
}

export default App;
