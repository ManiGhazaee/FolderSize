import { convertPath } from "../lib";

const Path = ({ path }: { path: string | null }) => {
    let c = convertPath(path);
    return (
        <div className="absolute left-[14px] top-[20px] text-[22px] font-bold max-w-[calc(100vw-40px)] overflow-hidden">
            {c.map((s) => (s[0] ? <span className="text-red-500 mx-[4px]">{s[1]}</span> : <span className="text-white">{s[1]}</span>))}
        </div>
    );
};

export default Path;
