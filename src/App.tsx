import { open } from "@tauri-apps/api/dialog";
import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useRef, useState } from "react";
import { convertFile, convertMatch, fileName, isNone, isSome } from "./lib";
import { window as tauriWindow } from "@tauri-apps/api";
import FolderIcon from "@mui/icons-material/Folder";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Path from "./components/Path";
import { BarLoader } from "react-spinners";
import Size from "./components/Size";
import { Option, None } from "./lib";

type Path = string;
type Size = number;
type IsFile = boolean;
type ContextMenu = { x: number; y: number; show: boolean; path: Path };
export type Folder = { size: Size; root: Path; parent: Path; entries: [Size, Path, IsFile][] };
export type FolderCache = { items: [Size, Path, Folder][] };
export type Details = {
    path: Path;
    created: string;
    accessed: string;
    modified: string;
    premissions: boolean;
    file_size: number;
};

enum State {
    Search,
    None,
}

const icons = {
    back: <ReplyRoundedIcon />,
    select: <DriveFolderUploadIcon style={{ fontSize: "20px", marginTop: "-3px" }} />,
    search: <SearchRounded style={{ fontSize: "20px", marginTop: "-3px" }} />,
    folder: <FolderIcon style={{ fontSize: "22px", marginTop: "-3px" }} />,
};
const MAXLOAD = 200 as const;

function App() {
    const [dir, setDir] = useState<Option<Path>>(None);
    const [dirSize, setDirSize] = useState<Option<Size>>(None);
    const [folder, setFolder] = useState<Option<Folder>>(None);
    const [readyToSelect, setReadyToSelect] = useState(true);
    const [maxLoad, setMaxLoad] = useState<number>(MAXLOAD);
    const [searchMaxLoad, setSearchMaxLoad] = useState<number>(MAXLOAD);
    const contextMenuRef = useRef<HTMLDivElement>(None);
    const [contextMenu, setContextMenu] = useState<ContextMenu>({ x: 0, y: 0, show: false, path: "" });
    const [cache, setCache] = useState<FolderCache>({ items: [] });
    const [state, setState] = useState<State>(State.None);
    const [searchPat, setSearchPat] = useState<string>("");
    const [searchMatches, setSearchMatches] = useState<Option<Folder>>(None);
    const [details, setDetails] = useState<Option<Details>>(None);

    async function selectDir() {
        if (!readyToSelect) {
            return;
        }
        let selected = (await open({
            directory: true,
            multiple: false,
            defaultPath: "/",
        })) as Option<Path>;

        if (selected === dir) {
            return;
        }
        if (isSome(selected)) {
            setFolder(None);
            folderSize(selected);
        }
    }

    async function search(pat: string) {
        emit("cancel-search");
        if (pat === "") {
            setSearchMatches(None);
            return;
        }
        let res: Folder = await invoke("search", { window: tauriWindow, pat, path: isSome(dir) ? dir : "" });
        setSearchMatches(res);
        console.log(res);
    }

    async function folderSize(path: Path) {
        if (!readyToSelect) {
            return;
        }
        setReadyToSelect(false);
        setMaxLoad(MAXLOAD);
        setDir(path);

        let cacheIndex = cache.items.findIndex((e) => e[1] === path);
        if (cacheIndex !== -1) {
            let e = cache.items[cacheIndex];
            setDirSize(e[0]);
            setFolder(e[2]);
            setReadyToSelect(true);
            return;
        }
        let size: Size = await invoke("folder_size", { window: tauriWindow, path });
        setDirSize(size);
        setReadyToSelect(true);
    }

    async function reveal(path: Path) {
        if (path !== "") {
            await invoke("reveal", { path });
        }
    }
    async function getDetails(path: Path) {
        let res: Details = await invoke("details", { path });
        setDetails({ ...res, path });
    }

    function pathOnClick(path: Path) {
        setState(State.None);
        setFolder(None);
        setCache((prev) => {
            prev.items.length = 0;
            return prev;
        });
        folderSize(path);
    }

    useEffect(() => {
        listen("folder", (ev) => {
            let e = ev.payload as Folder;
            if (cache.items.length === 5) {
                setCache((prev) => {
                    prev.items.shift();
                    return prev;
                });
            }
            setCache((prev) => {
                prev.items.push([e.size, e.root, e]);
                return prev;
            });
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
            <div style={{ visibility: state === State.Search ? "visible" : "hidden" }}></div>
            {isSome(folder) && (
                <button
                    className="absolute top-[20px] -translate-y-1/2 right-[10px] bg-zinc-950 px-[6px] py-[4px] border rounded-xl border-zinc-900 text-zinc-100 hover:text-white hover:bg-zinc-900 hover:border-zinc-800 active:bg-zinc-200 active:border-zinc-300 active:text-black duration-100"
                    onClick={selectDir}
                >
                    {icons.select}
                </button>
            )}
            {isSome(folder) && (
                <button
                    className={`absolute top-[20px] -translate-y-1/2 right-[53px]  px-[6px] py-[4px] border rounded-xl ${
                        state === State.Search
                            ? "!border-zinc-100 !bg-zinc-100 !text-black"
                            : "bg-zinc-950 border-zinc-900 text-zinc-100"
                    }  hover:text-white hover:bg-zinc-900 hover:border-zinc-800 active:bg-zinc-200 active:border-zinc-300 active:text-black duration-100`}
                    onClick={() => {
                        setState(state === State.Search ? State.None : State.Search);
                        document.getElementById("search-input")?.focus();
                    }}
                >
                    {icons.search}
                </button>
            )}
            <Path path={dir} onClick={pathOnClick} />
            <div className="relative h-[calc(100vh-55px)] w-[calc(100vw-20px)] p-[10px] rounded-2xl left-1/2 -translate-x-1/2 top-[45px] bg-zinc-900 overflow-hidden">
                {isNone(folder) && readyToSelect && (
                    <>
                        <div className="absolute top-[calc(50%-60px)] text-[22px] font-bold left-1/2 -translate-x-1/2">
                            Select or drop a folder
                        </div>
                        <button
                            className="relative top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-zinc-50 px-[6px] py-[4px] border rounded-xl border-zinc-50 text-zinc-900 hover:text-black hover:bg-zinc-300 hover:border-white active:bg-zinc-800 active:border-zinc-600 active:text-white duration-100"
                            onClick={selectDir}
                        >
                            {icons.select}
                        </button>
                    </>
                )}
                <div
                    className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-zinc-100"
                    style={{ visibility: isNone(folder) && !readyToSelect ? "visible" : "hidden" }}
                >
                    <BarLoader color="white" />
                </div>
                <div
                    className="absolute left-1/2 -translate-x-1/2 text-[14px]"
                    style={{
                        visibility: state !== State.Search ? "hidden" : "visible",
                        width: state !== State.Search ? "0%" : "50%",
                        opacity: state !== State.Search ? 0 : 1,
                        transition: "all 200ms",
                    }}
                >
                    <input
                        id="search-input"
                        spellCheck="false"
                        className="w-full border border-zinc-800 rounded-lg bg-zinc-950 outline-none text-center font-light placeholder:text-zinc-500"
                        placeholder="Type to search"
                        type="text"
                        value={searchPat}
                        onChange={(ev) => {
                            setSearchPat(ev.target.value);
                            search(ev.target.value);
                        }}
                    />
                </div>
                <div
                    className="absolute left-1/2 -translate-x-1/2 text-[14px]"
                    style={{
                        visibility: state !== State.None ? "hidden" : "visible",
                        opacity: state !== State.None ? 0 : 1,
                        transition: "opacity 200ms",
                    }}
                >
                    <Size size={dirSize} />
                </div>
                {isSome(searchMatches) && (
                    <div
                        className="relative top-[34px] overflow-y-scroll overflow-x-hidden  rounded-xl"
                        style={{
                            visibility: state !== State.Search ? "hidden" : "visible",
                            opacity: state !== State.Search ? 0 : 1,
                            height: state !== State.Search ? "0" : "calc(100% - 35px)",
                            transition: "opacity 200ms",
                        }}
                    >
                        {searchMatches.entries.map((node, index) => {
                            if (index > searchMaxLoad) return None;
                            let file = convertMatch(fileName(node[1]), searchPat);
                            return (
                                <div
                                    className={`${index % 2 === 1 ? "bg-black" : "bg-transparent"} ${
                                        index === searchMatches.entries.length - 1 ? "rounded-b-xl" : ""
                                    } px-[20px] py-[2px] text-[14px] hover:bg-zinc-800 text-zinc-50 flex flex-row`}
                                    onClick={() => {
                                        if (node[2]) {
                                            return;
                                        }
                                        setState(State.None);
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
                                        setContextMenu(() => ({ show: true, x, y, path: node[1] }));
                                    }}
                                >
                                    <span className="w-[34px]">{!node[2] && icons.folder}</span>
                                    <span className="flex-grow">
                                        {
                                            <>
                                                {file.map((e) =>
                                                    e[0] ? (
                                                        <span className="bg-zinc-100 text-black rounded-sm">
                                                            {e[1]}
                                                        </span>
                                                    ) : (
                                                        <span className="">{e[1]}</span>
                                                    )
                                                )}
                                            </>
                                        }
                                    </span>
                                    <Size size={node[0]} />
                                </div>
                            );
                        })}
                        {searchMatches.entries.length > searchMaxLoad ? (
                            <div
                                className={`bg-zinc-100 text-black font-bold rounded-b-xl px-[20px] py-[2px] hover:bg-zinc-300 flex flex-row`}
                                onClick={() => {
                                    setSearchMaxLoad((prev) => (prev += 100));
                                }}
                            >
                                Show more
                            </div>
                        ) : (
                            <></>
                        )}
                    </div>
                )}
                {isSome(folder) && (
                    <div
                        className="relative top-[34px] overflow-y-scroll overflow-x-hidden h-[calc(100%-35px)] rounded-xl"
                        style={{
                            visibility: state !== State.None ? "hidden" : "visible",
                            opacity: state !== State.None ? 0 : 1,
                            transition: "opacity 200ms",
                        }}
                    >
                        <div
                            className={`${
                                folder.parent === "" ? "" : "active:bg-zinc-100 active:text-black"
                            } sticky top-0 w-full z-[100] bg-black font-bold px-[20px] py-[2px] hover:bg-zinc-800 rounded-t-xl `}
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
                            if (index > maxLoad) return None;
                            let file = node[2] ? convertFile(fileName(node[1])) : fileName(node[1]);
                            return (
                                <div
                                    className={`${index % 2 === 1 ? "bg-black" : "bg-transparent"} ${
                                        index === folder.entries.length - 1 ? "rounded-b-xl" : ""
                                    } ${
                                        node[2] ? "" : "active:bg-zinc-100 active:text-black duration-100"
                                    }  px-[20px] py-[2px] text-[14px] hover:bg-zinc-800 text-zinc-50 flex flex-row`}
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
                                Show more
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
                <div className="flex flex-col rounded-lg p-[4px]  border border-zinc-900 bg-zinc-950 text-[12px]">
                    <div
                        className="bg-zinc-950 rounded-md px-[16px] py-[2px] text-zinc-100 hover:bg-zinc-900  hover:text-white"
                        onClick={() => {
                            setContextMenu((prev) => ({ ...prev, show: false }));
                            navigator.clipboard.writeText(contextMenu.path);
                        }}
                    >
                        Copy path
                    </div>
                    <div
                        className="bg-zinc-950 rounded-md px-[16px] py-[2px] text-zinc-100 hover:bg-zinc-900  hover:text-white"
                        onClick={() => {
                            setContextMenu((prev) => ({ ...prev, show: false }));
                            reveal(contextMenu.path);
                        }}
                    >
                        Reveal in file explorer
                    </div>
                    <div
                        className="bg-zinc-950 rounded-md px-[16px] py-[2px] text-zinc-100 hover:bg-zinc-900  hover:text-white"
                        onClick={() => {
                            setContextMenu((prev) => ({ ...prev, show: false }));
                            getDetails(contextMenu.path);
                        }}
                    >
                        Details
                    </div>
                </div>
            </div>
            <div
                className="absolute z-[120] text-[14px] text-zinc-100 px-[26px] py-[22px] top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden "
                style={{
                    visibility: isSome(details) ? "visible" : "hidden",
                    transition: "150ms",
                    opacity: isSome(details) ? 1 : 0,
                    width: isSome(details) ? "400px" : 0,
                    height: "400px",
                }}
            >
                <div
                    style={{
                        transition: isSome(details) ? "all 100ms 120ms" : "all 0ms 0ms",
                        opacity: isSome(details) ? 1 : 0,
                    }}
                >
                    <div className="font-bold text-[18px] break-words mb-[30px] max-h-[72px] overflow-y-auto">{fileName(details?.path ?? "")}</div>
                    <div className="flex flex-col">
                        <div className="flex-grow text-zinc-500">Path:</div>
                        <div className="break-words max-h-[50px] overflow-y-auto">{details?.path}</div>
                    </div>
                    <div className="flex flex-row">
                        <div className="flex-grow text-zinc-500">Size:</div>
                        <Size size={details?.file_size ?? 0} />
                    </div>
                    <div className="flex flex-row">
                        <div className="flex-grow text-zinc-500">Bytes:</div>
                        <div>{details?.file_size}</div>
                    </div>

                    <div className="flex flex-row">
                        <div className="flex-grow text-zinc-500">Created:</div>
                        <div>{details?.created}</div>
                    </div>
                    <div className="flex flex-row">
                        <div className="flex-grow text-zinc-500">Last accessed:</div>
                        <div>{details?.accessed}</div>
                    </div>
                    <div className="flex flex-row">
                        <div className="flex-grow text-zinc-500">Last modified:</div>
                        <div>{details?.modified}</div>
                    </div>
                    <div className="flex flex-row">
                        <div className="flex-grow text-zinc-500">Readonly:</div>
                        <div>{details?.premissions ? "True" : "False"}</div>
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
            <div
                className="absolute top-0 left-0 w-screen h-screen z-[110]"
                style={{ visibility: isSome(details) ? "visible" : "hidden" }}
                onClick={() => {
                    setDetails(None);
                }}
            ></div>
        </div>
    );
}

export default App;
