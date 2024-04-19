import { open } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { children, convertSize, fileName, Tree } from "./lib";
import { window as taruiWindow } from "@tauri-apps/api";

function App() {
    const [dir, setDir] = useState<string | null>(null);
    const [dirSize, setDirSize] = useState<string | null>(null);
    const [tree, setTree] = useState<Tree | null>(null);

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
            setDir(selected);
            let size: string = await invoke("folder_size", { window: taruiWindow, path: selected });
            setDirSize(size);
        }
    }

    useEffect(() => {
        listen("folder-size", (ev) => {
            let tree = ev.payload as Tree;
            setTree(tree);
        });
        listen("file-size", (ev) => {
            console.log(ev.payload);
        });
    }, []);

    return (
        <div>
            <button onClick={selectDir}>Select</button>
            <div>{dir?.toString()}</div>
            <div>{dirSize?.toString()}</div>
            {tree !== null && (
                <>
                    <div
                        onClick={() => {
                            setTree((prev) => {
                                let clone = { ...prev! };
                                let parent = tree.vals[tree.current].parent;
                                if (parent !== null) {
                                    clone.current = parent;
                                }
                                return clone;
                            });
                        }}
                    >
                        ..
                    </div>
                    {children(tree).map((node) => (
                        <div
                            onClick={() => {
                                setTree((prev) => {
                                    let clone = { ...prev! };
                                    clone.current = node[0];
                                    return clone;
                                });
                            }}
                        >
                            {fileName(node[1].val[0])} - {convertSize(node[1].val[1])} -{" "}
                            {node[1].val[2] ? "FILE" : "FOLDER"}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

export default App;
