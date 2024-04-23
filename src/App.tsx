import { open } from "@tauri-apps/api/dialog";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useRef, useState } from "react";
import { convertFile, fileName } from "./lib";
import { window as tauriWindow } from "@tauri-apps/api";
import FolderIcon from "@mui/icons-material/Folder";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import Path from "./components/Path";
import { BarLoader } from "react-spinners";
import Size from "./components/Size";

type Path = string;
type Size = number;
type IsFile = boolean;
type Folder = { size: Size; root: Path; parent: Path; entries: [Size, Path, IsFile][] };
type ContextMenu = { x: number; y: number; show: boolean; path: Path; isFile: IsFile };

const icons = { back: <ReplyRoundedIcon />, select: <DriveFolderUploadIcon />, folder: <FolderIcon /> };
const cache: [Size, Path, Folder][] = [];
const defaultMaxLoad = 200;

function App() {
    const [dir, setDir] = useState<Path | null>(null);
    const [dirSize, setDirSize] = useState<Size | null>(null);
    const [folder, setFolder] = useState<Folder | null>(null);
    const [readyToSelect, setReadyToSelect] = useState(true);
    const [maxLoad, setMaxLoad] = useState<number>(defaultMaxLoad);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenu>({ x: 0, y: 0, show: false, path: "", isFile: false });

    async function selectDir() {
        if (!readyToSelect) {
            return;
        }
        let selected = (await open({
            directory: true,
            multiple: false,
            defaultPath: "/",
        })) as Path | null;

        if (selected === dir) {
            return;
        }
        if (selected !== null) {
            setFolder(null);
            folderSize(selected);
        }
    }

    async function folderSize(path: Path) {
        if (!readyToSelect) {
            return;
        }
        setReadyToSelect(false);
        setMaxLoad(defaultMaxLoad);
        setDir(path);
        let cacheIndex = cache.findIndex((e) => e[1] === path);
        if (cacheIndex !== -1) {
            let e = cache[cacheIndex];
            setDirSize(e[0]);
            setFolder(e[2]);
            setReadyToSelect(true);
            return;
        }
        let size: Size = await invoke("folder_size", { window: tauriWindow, path });
        setDirSize(size);
        setReadyToSelect(true);
    }

    async function reveal(path: Path, isFile: IsFile) {
        if (path !== "") {
            await invoke("reveal", { path, isFile });
        }
    }

    useEffect(() => {
        listen("folder", (ev) => {
            let e = ev.payload as Folder;
            if (cache.length === 5) {
                cache.shift();
            }
            cache.push([e.size, e.root, e]);
            setFolder(e);
        });
        listen("size", (ev) => {
            setDirSize(ev.payload as Size);
        });
        listen("tauri://file-drop", (ev) => {
            folderSize((ev.payload as Path[])[0]);
        });
    }, []);

    return (
        <div className="h-[100vh] overflow-hidden">
            {folder !== null && (
                <button
                    className="absolute top-[32px] -translate-y-1/2 right-[10px] bg-zinc-950 px-[6px] py-[6px] border rounded-xl border-zinc-900 text-zinc-100 hover:text-white hover:bg-zinc-900 hover:border-zinc-800 active:bg-zinc-200 active:border-zinc-300 active:text-black duration-100"
                    onClick={selectDir}
                >
                    {icons.select}
                </button>
            )}
            <Path path={dir} folderSize={folderSize} />
            <div className="relative h-[calc(100vh-70px)] w-[calc(100vw-20px)] p-[10px] rounded-2xl left-1/2 -translate-x-1/2 top-[60px] bg-zinc-900 overflow-hidden">
                {folder === null && readyToSelect && (
                    <>
                        <div className="absolute top-[calc(50%-60px)] text-[22px] font-bold left-1/2 -translate-x-1/2">
                            Select or drop a folder
                        </div>
                        <button
                            className="relative top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-zinc-50 px-[6px] py-[6px] border rounded-xl border-zinc-50 text-zinc-900 hover:text-black hover:bg-zinc-300 hover:border-white active:bg-zinc-800 active:border-zinc-600 active:text-white duration-100"
                            onClick={selectDir}
                        >
                            {icons.select}
                        </button>
                    </>
                )}
                <div
                    className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-zinc-100"
                    style={{ visibility: folder === null && !readyToSelect ? "visible" : "hidden" }}
                >
                    <BarLoader color="white" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                    <Size size={dirSize} />
                </div>
                {folder !== null && (
                    <div className="relative top-[38px] overflow-y-scroll overflow-x-hidden h-[calc(100%-38px)] rounded-xl">
                        <div
                            className="sticky top-0 w-full z-[100] bg-black font-bold px-[20px] py-[2px] hover:bg-zinc-800 rounded-t-xl"
                            onClick={() => {
                                if (folder.parent === "") {
                                    return;
                                }
                                folderSize(folder.parent);
                            }}
                        >
                            <span className="w-[34px] mr-[9px]">{icons.back}</span>
                            ..
                        </div>
                        {folder.entries.map((node, index) => {
                            if (index > maxLoad) return null;
                            let file = node[2] ? convertFile(fileName(node[1])) : fileName(node[1]);
                            return (
                                <div
                                    className={`${index % 2 === 1 ? "bg-black" : "bg-transparent"} ${
                                        index === folder.entries.length - 1 ? "rounded-b-xl" : ""
                                    } px-[20px] py-[2px] hover:bg-zinc-800 text-zinc-50 flex flex-row`}
                                    onClick={() => {
                                        if (node[2]) {
                                            return;
                                        }
                                        folderSize(node[1]);
                                    }}
                                    onContextMenu={(ev) => {
                                        ev.preventDefault();
                                        let x = ev.clientX;
                                        let y = ev.clientY;
                                        if (contextMenuRef.current) {
                                            if (y + contextMenuRef.current.clientHeight > window.innerHeight) {
                                                y = window.innerHeight - contextMenuRef.current.clientHeight;
                                            }
                                            if (x + contextMenuRef.current.clientWidth > window.innerWidth) {
                                                x = window.innerWidth - contextMenuRef.current.clientWidth;
                                            }
                                        }
                                        setContextMenu(() => ({ show: true, x, y, path: node[1], isFile: node[2] }));
                                    }}
                                >
                                    <span className="w-[34px]">{!node[2] && icons.folder}</span>
                                    <span className="flex-grow">
                                        {node[2] ? (
                                            <>
                                                <span>{file[0]}</span>
                                                <span className="text-zinc-500">{file[1]}</span>
                                            </>
                                        ) : (
                                            <span>{file}</span>
                                        )}
                                    </span>
                                    <Size size={node[0]} />
                                </div>
                            );
                        })}
                        {folder.entries.length > maxLoad ? (
                            <div
                                className={`bg-zinc-100 text-black font-bold rounded-b-xl px-[20px] py-[2px] hover:bg-zinc-300 flex flex-row`}
                                onClick={() => {
                                    setMaxLoad((prev) => (prev += 100));
                                }}
                            >
                                Load more
                            </div>
                        ) : (
                            <></>
                        )}
                    </div>
                )}
            </div>
            <div
                ref={contextMenuRef}
                className="absolute z-[120]"
                style={{
                    top: contextMenu.y,
                    left: contextMenu.x,
                    visibility: contextMenu.show ? "visible" : "hidden",
                    transition: "opacity 300ms",
                    opacity: contextMenu.show ? 1 : 0,
                }}
            >
                <div className="flex flex-col rounded-lg p-[4px]  border border-zinc-900 bg-zinc-950 text-[14px]">
                    <div
                        className="bg-zinc-950 rounded-md px-[16px] py-[2px] text-zinc-100 hover:bg-zinc-900  hover:text-white"
                        onClick={() => {
                            setContextMenu((prev) => ({ ...prev, show: false }));
                            reveal(contextMenu.path, contextMenu.isFile);
                        }}
                    >
                        Reveal in file explorer
                    </div>
                </div>
            </div>
            <div
                className="absolute top-0 left-0 w-screen h-screen z-[110]"
                style={{ visibility: contextMenu.show ? "visible" : "hidden" }}
                onClick={() => {
                    setContextMenu((prev) => ({ ...prev, show: false }));
                }}
            ></div>
        </div>
    );
}

export default App;
