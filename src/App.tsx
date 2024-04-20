import { open } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { convertSize, fileName } from "./lib";
import { window as taruiWindow } from "@tauri-apps/api";

type Entries = { root: string; entries: [number, string, boolean][] };

function App() {
    const [dir, setDir] = useState<string | null>(null);
    const [dirSize, setDirSize] = useState<number | null>(null);
    const [entires, setEntries] = useState<Entries | null>(null);

    async function selectDir() {
        let selected = (await open({
            directory: true,
            multiple: false,
            defaultPath: "/",
        })) as string | null;

        if (selected === dir) {
            return;
        }
        if (selected !== null) {
            folderSize(selected);
        }
    }

    async function folderSize(path: string) {
        setDir(path);
        let size: number = await invoke("folder_size", { window: taruiWindow, path });
        setDirSize(size);
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
    }, []);

    return (
        <div>
            <button onClick={selectDir}>Select</button>
            <div>{dir?.toString()}</div>
            <div>{dirSize !== null && convertSize(dirSize)}</div>
            {entires !== null && (
                <>
                    <div
                        onClick={() => {
                            if (entires.root === "") {
                                return;
                            }
                            folderSize(entires.root);
                        }}
                    >
                        ..
                    </div>
                    {entires.entries.map((node) => (
                        <div
                            onClick={() => {
                                if (node[2]) {
                                    return;
                                }
                                folderSize(node[1]);
                            }}
                        >
                            {node[2] ? "FILE" : "FOLDER"} - {convertSize(node[0])} - {fileName(node[1])}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

export default App;
