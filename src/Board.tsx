import React from "react";
import { useState } from "react";
import { isWhite, PieceCode, PieceCodes, pieceName, pieceType, square, SquareCoord, SquareInfo, SquareRef, SquareState } from "./GameState";
import { PieceShape, shapeOfPiece } from "./PieceShape";

const PieceDef: React.FC<{piece: PieceCode}> = ({piece}) => {
    return (
        <g id={pieceName(piece)}>
            <PieceShape shape={shapeOfPiece(pieceType(piece))} white={isWhite(piece)} />
        </g>
    )
}

export type SquareFocus = {
    readonly origin: SquareRef,
    readonly valid: readonly SquareRef[],
}



function populated(square: {piece: SquareState, sq: SquareInfo}): square is {piece: PieceCode, sq: SquareInfo} {
    return square.piece !== " ";
}

function pointToSquare(boardPoint: Point): SquareInfo {
    return square({c: Math.floor(boardPoint.x), r: Math.floor(boardPoint.y)})
}

function isNotGrabbed(grabState: GrabState, sqref: SquareRef) {
    const sq = square(sqref);
    return !(grabState !== undefined && sq.equals(grabState.origin));
}

function hollowCirclePath(r: number, w: number): string {
    const ir = r - w;
    const c = r * 0.5522847363 // this magic number is the ratio of the length of a bezier curve handle to the radius of a circle you want to create with it
    const ic = ir * 0.5522847363
    return `M 0,-${r} C -${c},-${r} -${r},-${c} -${r},0 -${r},${c} -${c},${r} 0,${r} ${c},${r} ${r},${c} ${r},0 ${r},-${c} ${c},-${r} 0,-${r} Z m 0,${w} C ${ic},-${ir} ${ir},-${ic} ${ir},0 ${ir},${ic} ${ic},${ir} 0,${ir} -${ic},${ir} -${ir},${ic} -${ir},0 -${ir},-${ic} -${ic},-${ir} 0,-${ir} Z`
}

type SvgTransformElement = {
    getScreenCTM(): DOMMatrix | null;
}
function toSvgSpace(e: SVGElement | (SVGElement & SvgTransformElement), pt: {clientX: number, clientY: number}): Point {
    const matrix = ("getScreenCTM" in e) ? (e as SvgTransformElement).getScreenCTM()?.inverse() : undefined;
    const point = e.ownerSVGElement!.createSVGPoint()!
    point.x = pt.clientX;
    point.y = pt.clientY;
    const {x, y} = point.matrixTransform(matrix);
    return {x, y}
}

type Point = {x: number, y: number}
type GrabState = undefined | {origin: SquareInfo, piece: PieceCode, hover: Point, hadFocus: boolean}
type FocusState = undefined | SquareInfo

export type BoardEvent
    = {event: "movePiece", origin: SquareInfo, destination: SquareInfo, piece: PieceCode}
    | {event: "grabPiece", origin: SquareInfo, piece: PieceCode}
    | {event: "focusSquare", square: SquareInfo}
    | {event: "unfocus"}
    // warning: this event actually happens on mouse down on an empty square or mouse up if dropping on original square
    | {event: "clickSquare", square: SquareInfo}

type BoardProps = {
    readonly population: readonly SquareState[],
    readonly focus?: SquareFocus,
    readonly highlighted: readonly SquareRef[],
    readonly onEvent: (e: BoardEvent) => void,
}
export const Board: React.FC<BoardProps> = ({population, focus, highlighted, onEvent: dispatch}) => {
    const [grabState, setGrabState] = useState<GrabState>(undefined);
    return (
        <svg
            style={{width: 512, height: 512}}
            viewBox="0 0 8.2 8.2">
            <defs>
                <rect
                    id="square"
                    width="1"
                    height="1"
                />
                <use
                    id="lightSquare"
                    href="#square"
                    style={{fill: "#f7f4df"}}
                />
                <use
                    id="darkSquare"
                    href="#square"
                    style={{fill: "#82a464"}}
                />
                <use
                    id="highlightSquare"
                    href="#square"
                    style={{stroke: "none", fill: "#ffff00", fillOpacity: 0.5}}
                />
                <use
                    id="focusSquare"
                    href="#square"
                    style={{stroke: "none", fill: "#0078ff", fillOpacity: 0.5}}
                />
                <circle
                    id="validMove"
                    style={{stroke: "none", fill: "#0078ff", fillOpacity: 0.15}}
                    r={0.17}
                />
                <path
                    id="validCapture"
                    style={{stroke: "none", fill: "#0078ff", fillOpacity: 0.15}}
                    d={hollowCirclePath(0.5, 0.12)}
                />
                {PieceCodes.map(pc => <PieceDef key={pc} piece={pc} />)}
            </defs>
            {/* This <g> is the board space */}
            <g
                id="squares"
                transform="translate(0.2,0)"
                onMouseDown={(e) => {
                    // mouse down in board space
                    // get event coordinates in board space (floating point, unit = square)
                    const boardPoint = toSvgSpace(e.currentTarget, e);
                    const sq = pointToSquare(boardPoint);
                    // get the piece, if any, which is populating that square
                    const piece = population[sq.pos()];
                    if (piece === " ") {
                        // no piece is there, so register as a click
                        dispatch({
                            event: "clickSquare",
                            square: sq,
                        })
                        return;
                    }
                    // if there is a piece there, grab it
                    const origin = sq;
                    dispatch({
                        event: "grabPiece",
                        origin,
                        piece
                    })
                    const hadFocus = focus && sq.equals(focus.origin) || false;
                    setGrabState({piece, origin, hover: boardPoint, hadFocus})
                    if (!focus || !sq.equals(focus.origin)) {
                        dispatch({
                            event: "focusSquare",
                            square: sq,
                        })
                    }
                }}
                onMouseMove={(e) => {
                    // get event coordinates in board space (floating point, unit = square)
                    const boardPoint = toSvgSpace(e.currentTarget, e);
                    if (grabState) {
                        setGrabState({...grabState, hover: boardPoint});
                    }
                }}
                onMouseUp={(e) => {
                    if (grabState) {
                        // get event coordinates in board space (floating point, unit = square)
                        const boardPoint = toSvgSpace(e.currentTarget, e);
                        const sq = pointToSquare(boardPoint);
                        if (sq.equals(grabState.origin)) {
                            if (grabState.hadFocus) {
                                dispatch({event: "unfocus"})
                            }
                            dispatch({
                                event: "clickSquare",
                                square: sq,
                            })
                        }
                        else {
                            dispatch({
                                event: "movePiece",
                                piece: grabState.piece,
                                origin: grabState.origin,
                                destination: sq,
                            });
                        }
                        // ungrab
                        setGrabState(undefined);
                    }
                }}>
                {/* Squares */}
                {SquareInfo.rows
                    .map((row, r) => SquareInfo.cols.map((col, c) => square({c, r})))
                    .flat()
                    .map((sq) => (
                        <use
                            key={`${sq}`}
                            href={(sq.light() ? "#lightSquare" : "#darkSquare")}
                            {...sq.xy()}
                        />
                    ))
                }
                {/* Highlights */}
                {highlighted
                    .map(square)
                    .map(sq => (
                        <use
                            key={`h${sq}`}
                            href="#highlightSquare"
                            {...sq.xy()}
                        />
                    ))}
                {/* Focus */}
                {focus && (
                    <use
                        href="#focusSquare"
                        {...square(focus.origin).xy()}
                    />
                )}
                {/* Valid */}
                {focus?.valid
                    .map(square)
                    .map(sq => ({sq, piece: population[sq.pos()]}))
                    .map(({sq, piece}) => (
                        <use
                            key={`v${sq}`}
                            transform={`translate(${sq.cr.c + 0.5},${sq.cr.r + 0.5})`}
                            href={piece === " " ? "#validMove" : "#validCapture"}
                        />
                    ))}
                {/* Pieces */}
                {population
                    .map((piece, sq) => ({piece, sq: square(sq)}))
                    .filter(populated)
                    .filter(({sq}) => isNotGrabbed(grabState, sq))
                    .map(({piece, sq}) => (
                        <use
                            key={`${sq}`}
                            pointerEvents="none"
                            href={`#${pieceName(piece)}`}
                            transform={`translate(${sq.cr.c},${sq.cr.r})`}
                        />
                    ))
                }
                {/* Grabbed (floating) piece */}
                {grabState && (
                    <use
                        pointerEvents="none"
                        href={`#${pieceName(grabState.piece)}`}
                        transform={`translate(${grabState.hover.x - 0.5},${grabState.hover.y - 0.5})`}
                    />
                )}
            </g>
        </svg>
    )
}
