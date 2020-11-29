import React from 'react';
import { parseFem } from './fem';
import { isWhite, PieceCode, pieceType, SquareState } from './GameState';
import { PieceShape, shapeOfPiece } from './PieceShape';

const squareStyle = {
    "fillOpacity": 1,
    "stroke": "none",
}

const darkSquareStyle = {
    ...squareStyle,
    "fill": "#4c831b",
}

const lightSquareStyle = {
    ...squareStyle,
    "fill": "#fffad3",
}

const rows = ["1", "2", "3", "4", "5", "6", "7", "8"]
const cols = ["a", "b", "c", "d", "e", "f", "g", "h"]

// rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

function isPopulated(square: {piece: SquareState, square: number}): square is {piece: PieceCode, square: number} {
    return square.piece != " ";
}

const PositionedPiece: React.FC<{piece: PieceCode, square: number}> = ({piece, square}) => {
    return (
        <g
            transform={`translate(${square % 8},${Math.floor(square / 8)})`}>
            <PieceShape shape={shapeOfPiece(pieceType(piece))} white={isWhite(piece)} />
        </g>
    )
}

export const Board: React.FC<{state: SquareState[]}> = ({state}) => {
    return (
        <svg
            style={{width: 512, height: 512}}
            viewBox="0 0 8 8">
            <g
                id="squares"
                transform="translate(0,0)">
                {rows
                    .map((row, r) => cols.map((col, c) => ({col, row, c, r})))
                    .flat()
                    .map(({c, r}) => (
                        <rect
                            key={`${c}${r}`}
                            style={(((c + r) % 2) ? darkSquareStyle : lightSquareStyle)}
                            width="1"
                            height="1"
                            x={c}
                            y={r}
                        />
                    ))
                }
                {state
                    .map((piece, square) => ({piece, square}))
                    .filter(isPopulated)
                    .map(({piece, square}) => (
                        <PositionedPiece key={`${square}`} piece={piece} square={square} />
                    ))
                }
            </g>
        </svg>
    )
}

export const ChessPractice: React.FC = ({}) => {
    return (
        <div>
            <Board state={parseFem("rnbqkbnr/pppp1ppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1").squares}/>
        </div>
    )
}