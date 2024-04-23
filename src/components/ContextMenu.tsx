import React, { CSSProperties, useState } from "react";
import { createPortal } from "react-dom";

export type ContextMenuItems = {
    text: string;
    onClick: (...args: any[]) => void;
    params?: any[];
    style?: CSSProperties;
    icon?: JSX.Element;
}[];

const ContextMenu = ({ children, items }: { children: JSX.Element | JSX.Element[]; items: ContextMenuItems }) => {
    const [contextShow, setContextShow] = useState<boolean>(false);
    const [clickPoint, setClickPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const contextOnClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    };

    return (
        <>
            {contextShow && (
                <>
                    {createPortal(
                        <>
                            <div
                                onClick={() => setContextShow(false)}
                                className="absolute top-0 left-0 z-[130] w-screen h-screen"
                            ></div>
                            <div
                                style={{
                                    top: clickPoint.y,
                                    left: clickPoint.x,
                                }}
                                className="scale_opacity_anim_300 absolute z-[180] w-[180px] bg-black rounded-xl"
                            >
                                {items &&
                                    items.length !== 0 &&
                                    items.map((elem) => (
                                        <div
                                            style={elem.style}
                                            className="text-[14px] w-[calc(100%-8px)] my-[4px] active:bg-zinc-400 active:text-black mx-auto px-2 py-1 text-text_2 cursor-pointer bg-black hover:bg-zinc-800 rounded-lg"
                                            onClick={() => {
                                                if (elem.params) {
                                                    elem.onClick(...elem.params);
                                                } else {
                                                    elem.onClick();
                                                }
                                                setContextShow(false);
                                            }}
                                        >
                                            {elem.text}
                                        </div>
                                    ))}
                            </div>
                        </>,
                        document.body
                    )}
                </>
            )}
            <div onClick={(e) => contextOnClick(e)}>{children}</div>
        </>
    );
};

export default ContextMenu;
