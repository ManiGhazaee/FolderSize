import { Dispatch, SetStateAction } from "react";
import { convertPath, None, Option } from "../lib";
import { Folder, FolderCache } from "../App";

const Path = ({
    path,
    folderSize,
    setFolder,
    setCache,
}: {
    path: string | null;
    folderSize: (path: string) => Promise<void>;
    setFolder: Dispatch<SetStateAction<Option<Folder>>>;
    setCache: Dispatch<SetStateAction<FolderCache>>;
}) => {
    let c = convertPath(path);
    return (
        <div className="absolute left-[14px] top-[20px] text-[22px] font-bold max-w-[calc(100vw-40px)] overflow-hidden">
            {c.map((s) =>
                s[0] ? (
                    <span className="text-zinc-500 mx-[4px]">{s[1]}</span>
                ) : (
                    <span
                        className="text-white hover:underline cursor-pointer"
                        id={s[2]}
                        onClick={() => {
                            folderSize(s[2]);
                            setFolder(None);
                            setCache((prev) => {
                                prev.items.length = 0;
                                return prev;
                            });
                        }}
                    >
                        {s[1]}
                    </span>
                )
            )}
        </div>
    );
};

export default Path;
