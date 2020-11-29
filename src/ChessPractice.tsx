import React, { useReducer, useState } from 'react';
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

// rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

const PositionedPiece: React.FC<{piece: PieceCode, square: SquareRef}> = ({piece, square}) => {
    const {c, r} = toSquareCoord(square);
    return (
        <g
            pointerEvents="none" // we don't process pointer events on the piece shapes, only the squares they are on
            transform={`translate(${c},${r})`}>
            <PieceShape shape={shapeOfPiece(pieceType(piece))} white={isWhite(piece)} />
        </g>
    )
}

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

function isHighlighted(sq: SquareRef, highlighted: readonly SquareRef[]): boolean {
    return highlighted.some(h => areSameSquare(h, sq))
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
    const c = r * 0.5522847363
    const ic = ir * 0.5522847363
    return `M 0,-${r} C -${c},-${r} -${r},-${c} -${r},0 -${r},${c} -${c},${r} 0,${r} ${c},${r} ${r},${c} ${r},0 ${r},-${c} ${c},-${r} 0,-${r} Z m 0,${w} C ${ic},-${ir} ${ir},-${ic} ${ir},0 ${ir},${ic} ${ic},${ir} 0,${ir} -${ic},${ir} -${ir},${ic} -${ir},0 -${ir},-${ic} -${ic},-${ir} 0,-${ir} Z`
}

type BoardEvent
    = {square: SquareCoord, event: "click"}
    | {square: SquareCoord, event: "leave"}

type BoardProps = {
    readonly population: readonly SquareState[],
    readonly highlighted: readonly SquareRef[],
    readonly valid: readonly SquareRef[],
    readonly onEvent: (e: BoardEvent) => void,
}
export const Board: React.FC<BoardProps> = ({population, highlighted, valid, onEvent}) => {
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
                <circle
                    id="validMove"
                    style={{stroke: "none", fill: "#000000", fillOpacity: 0.15}}
                    r={0.17}
                />
                <path
                    id="validCapture"
                    style={{stroke: "none", fill: "#000000", fillOpacity: 0.15}}
                    d={hollowCirclePath(0.5, 0.12)}
                />
                {PieceCodes.map(pc => <PieceDef key={pc} piece={pc} />)}
            </defs>
            <g
                id="squares"
                transform="translate(0.2,0)">
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
                    .map(({piece, sq}) => (
                        <use
                            key={`${toSquareName(sq)}`}
                            pointerEvents="none"
                            href={`#${pieceName(piece)}`}
                            transform={`translate(${sq.c},${sq.r})`}
                        />
                    ))
                }
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
                onEvent={(e) => dispatch({from: "board", boardEvent: e})}
            />
        </div>
    )
}