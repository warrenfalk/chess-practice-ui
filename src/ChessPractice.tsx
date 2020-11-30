import React, { useEffect, useReducer, useRef, useState } from 'react';
import { parseFem } from './fem';
import { isWhite, PieceCode, PieceCodes, pieceName, pieceType, SquareState } from './GameState';
import { PieceShape, shapeOfPiece } from './PieceShape';

const squareStyle = {
    fillOpacity: 1,
    stroke: "none",
}

const darkSquareStyle = {
    ...squareStyle,
    fill: "#82a464",
}

const lightSquareStyle = {
    ...squareStyle,
    fill: "#f7f4df",
}

const rows = ["1", "2", "3", "4", "5", "6", "7", "8"]
const cols = ["a", "b", "c", "d", "e", "f", "g", "h"]

const PieceDef: React.FC<{piece: PieceCode}> = ({piece}) => {
    return (
        <g id={pieceName(piece)}>
            <PieceShape shape={shapeOfPiece(pieceType(piece))} white={isWhite(piece)} />
        </g>
    )
}


type SquareCoord = {
    // Zero-based index of column (file) 0 -> "a file", 7 -> "h file"
    readonly c: number,
    // Zero-based index of row 0 -> "row 1", 7 -> "row 8"
    readonly r: number,
};
type SquareRef = number | SquareCoord | string;


function toSquareCoord(squareRef: SquareRef): SquareCoord {
    if (typeof squareRef === "number") {
        if (squareRef < 0 || squareRef > 63)
            throw new Error(`Square number ${squareRef} is out of range`);
        return {c: squareRef % 8, r: Math.floor(squareRef / 8)};
    }
    else if (typeof squareRef === "string") {
        if (squareRef.length < 2)
            throw new Error(`Squaqre ref ${squareRef} is too short`);
        const col = squareRef[0].toLowerCase();
        const row = squareRef[1];
        if (col < "a" || col > "h")
            throw new Error(`Square ref ${squareRef} column ${col} is invalid`);
        if (row < "1" || row > "8")
            throw new Error(`Square ref ${squareRef} row ${row} is invalid`);
        return {c: col.charCodeAt(0) - "a".charCodeAt(0), r: 8 - parseInt(row)}
    }
    const {c, r} = squareRef;
    if (c < 0 || c > 7)
        throw new Error(`Column ${c} is out of range`);
    if (r < 0 || r > 7)
        throw new Error(`Row ${r} is out of range`);
    return squareRef;
}

function toSquareNumber(squareCoord: SquareCoord) {
    const {c, r} = squareCoord;
    return c + r * 8;
}

function toSquareName(squareCoord: SquareCoord) {
    return `${cols[squareCoord.c]}${rows[squareCoord.r]}`
}

function isLightSquare(square: SquareRef): boolean {
    const {c, r} = toSquareCoord(square);
    return ((c + r) % 2) === 0;
}

function areSameSquare(sq1: SquareRef, sq2: SquareRef): boolean {
    const sc1 = toSquareCoord(sq1);
    const sc2 = toSquareCoord(sq2);
    return sc1.c == sc2.c && sc1.r == sc2.r;
}

function populated(square: {piece: SquareState, sq: SquareCoord}): square is {piece: PieceCode, sq: SquareCoord} {
    return square.piece !== " ";
}

/* 
Multiple squares can be highlighted (in various ways, last move, valid moves, flagged)
One populated square can be focused
A piece can be grabbed
Grabbed pieces have an "origin square"
The origin square of a piece is focused while the piece is grabbed
If you mousedown on a populated square, the piece on it becomes grabbed
If you mouseup while grabbed, you drop the piece on that square
If a piece is dropped on its origin square it toggles the focus (moves the focus there if it was elsewhere else unfocuses)
If a piece is dropped elsewhere, it is a move event (which can be accepted or rejected)

We could separate the board into a couple of logical layers
One could be very general purpose, providing a way to draw things and giving mouse events in board coordinates, etc.
Then another could be one that is aware of board states like focus and grabbing.
Is that worth it?

*/

function hollowCirclePath(r: number, w: number): string {
    const ir = r - w;
    const c = r * 0.5522847363 // this magic number is the ratio of the length of a bezier curve handle to the radius of a circle you want to create with it
    const ic = ir * 0.5522847363
    return `M 0,-${r} C -${c},-${r} -${r},-${c} -${r},0 -${r},${c} -${c},${r} 0,${r} ${c},${r} ${r},${c} ${r},0 ${r},-${c} ${c},-${r} 0,-${r} Z m 0,${w} C ${ic},-${ir} ${ir},-${ic} ${ir},0 ${ir},${ic} ${ic},${ir} 0,${ir} -${ic},${ir} -${ir},${ic} -${ir},0 -${ir},-${ic} -${ic},-${ir} 0,-${ir} Z`
}

type Point = {x: number, y: number}
type GrabState = undefined | {origin: SquareCoord, piece: PieceCode, hover: Point, hadFocus: boolean}
type FocusState = undefined | SquareCoord

type SvgTransformElement = {
    getScreenCTM(): DOMMatrix | null;
}
function toSvgSpace(e: SVGElement, pt: {clientX: number, clientY: number}): Point {
    const matrix = ("getScreenCTM" in e) ? (e as SvgTransformElement).getScreenCTM()?.inverse() : undefined;
    const point = e.ownerSVGElement!.createSVGPoint()!
    point.x = pt.clientX;
    point.y = pt.clientY;
    const {x, y} = point.matrixTransform(matrix);
    return {x, y}
}

function boardPointToSquareCoord(boardPoint: Point): SquareCoord {
    return {c: Math.floor(boardPoint.x), r: Math.floor(boardPoint.y)}
}

function isNotGrabbed(grabState: GrabState, sq: SquareCoord) {
    return !(grabState !== undefined && areSameSquare(sq, grabState.origin));
}

type BoardEvent
    = {event: "movePiece", origin: SquareCoord, destination: SquareCoord, piece: PieceCode}
    | {event: "grabPiece", origin: SquareCoord, piece: PieceCode}
    | {event: "focusSquare", square: SquareCoord}
    | {event: "unfocus"}
    // warning: this event actually happens on mouse down on an empty square or mouse up if dropping on original square
    | {event: "clickSquare", square: SquareCoord}


type BoardProps = {
    readonly population: readonly SquareState[],
    readonly highlighted: readonly SquareRef[],
    readonly valid: readonly SquareRef[],
    readonly onEvent: (e: BoardEvent) => void,
}
export const Board: React.FC<BoardProps> = ({population, highlighted, valid, onEvent: dispatch}) => {
    const [grabState, setGrabState] = useState<GrabState>(undefined);
    const [focusState, setFocusState] = useState<FocusState>(undefined);
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
                    style={lightSquareStyle}
                />
                <use
                    id="darkSquare"
                    href="#square"
                    style={darkSquareStyle}
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
                    const sq = boardPointToSquareCoord(boardPoint);
                    const sqn = toSquareNumber(sq);
                    // get the piece, if any, which is populating that square
                    const piece = population[sqn];
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
                    const hadFocus = focusState && areSameSquare(focusState, sq) || false;
                    setGrabState({piece, origin, hover: boardPoint, hadFocus})
                    if (!focusState || !areSameSquare(sq, focusState)) {
                        dispatch({
                            event: "focusSquare",
                            square: sq,
                        })
                        setFocusState(sq)
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
                        const sq = boardPointToSquareCoord(boardPoint);
                        if (areSameSquare(sq, grabState.origin)) {
                            if (grabState.hadFocus) {
                                dispatch({event: "unfocus"})
                                setFocusState(undefined);
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
                {rows
                    .map((row, r) => cols.map((col, c) => ({col, row, c, r})))
                    .flat()
                    .map((sq) => (
                        <use
                            key={`${sq.c}${sq.r}`}
                            href={(isLightSquare(sq) ? "#lightSquare" : "#darkSquare")}
                            x={sq.c}
                            y={sq.r}
                        />
                    ))
                }
                {/* Highlights */}
                {highlighted
                    .map(toSquareCoord)
                    .map(sq => (
                        <use
                            key={`h${sq.c}${sq.r}`}
                            href="#highlightSquare"
                            x={sq.c}
                            y={sq.r}
                        />
                    ))}
                {/* Focus */}
                {focusState && (
                    <use
                        href="#focusSquare"
                        x={focusState.c}
                        y={focusState.r}
                    />
                )}
                {/* Valid */}
                {valid
                    .map(toSquareCoord)
                    .map(sq => ({sq, piece: population[toSquareNumber(sq)]}))
                    .map(({sq, piece}) => (
                        <use
                            key={`v${sq.c}${sq.r}`}
                            transform={`translate(${sq.c + 0.5},${sq.r + 0.5})`}
                            href={piece === " " ? "#validMove" : "#validCapture"}
                        />
                    ))}
                {/* Pieces */}
                {population
                    .map((piece, square) => ({piece, sq: toSquareCoord(square)}))
                    .filter(populated)
                    .filter(({sq}) => isNotGrabbed(grabState, sq))
                    .map(({piece, sq}) => (
                        <use
                            key={`${toSquareName(sq)}`}
                            pointerEvents="none"
                            href={`#${pieceName(piece)}`}
                            transform={`translate(${sq.c},${sq.r})`}
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

type AppState = {
    readonly population: readonly SquareState[],
    readonly highlighted: readonly SquareRef[],
    readonly valid: readonly SquareRef[],
}

type AppEvent = {from: "board", boardEvent: BoardEvent};

const defaultState: AppState = {
    population: parseFem("rnbqkbnr/pppp1ppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1").squares,
    highlighted: ["e2", "e3"],
    valid: ["e3", "e4", "e5", "e6"],
}

function appReduce(state: AppState, action: AppEvent): AppState {
    switch (action.from) {
        case "board":
            break;
    }
    return state;
}

export const ChessPractice: React.FC = ({}) => {
    const [state, dispatch] = useReducer(appReduce, defaultState);
    const {population, highlighted, valid} = state;
    return (
        <div>
            <Board
                population={population}
                highlighted={highlighted}
                valid={valid}
                onEvent={(e) => {
                    console.log(e);
                    dispatch({from: "board", boardEvent: e})
                }}
            />
        </div>
    )
}