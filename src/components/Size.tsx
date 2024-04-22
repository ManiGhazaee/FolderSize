import { convertSize } from "../lib";

const Size = ({ size }: { size: number | null }) => {
    if (size === null) {
        return <></>;
    }
    let s = convertSize(size);
    return (
        <>
            <span className="relative mr-[4px]">{s[0]}</span>
            <span className="relative font-bold">{s[1]}</span>
        </>
    );
};

export default Size;
