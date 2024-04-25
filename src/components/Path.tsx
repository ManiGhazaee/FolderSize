import { convertPath } from "../lib";

const Path = ({ path, onClick }: { path: string | null; onClick: (path: string) => void }) => {
    let c = convertPath(path);
    return (
        <div className="absolute left-[14px] top-[12px] text-[18px] font-bold max-w-[calc(100vw-40px)] overflow-hidden">
            {c.map((s) =>
                s[0] ? (
                    <span className="text-zinc-500 mx-[4px]">{s[1]}</span>
                ) : (
                    <span
                        className="text-white hover:underline cursor-pointer"
                        id={s[2]}
                        onClick={() => {
                            onClick(s[2]);
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
