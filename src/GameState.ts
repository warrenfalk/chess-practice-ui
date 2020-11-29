export type EmptySquare = " "
export type PieceTypeCode = "p" | "r" | "n" | "b" | "q" | "k"
export type PieceCode = PieceTypeCode | "P" | "R" | "N" | "B" | "Q" | "K"
export type SquareState = PieceCode | EmptySquare
export const SquareStatePattern = /[prnbqkPRNBQK ]/

export type GameState = {
    squares: SquareState[],
}

export function pieceType(piece: PieceCode) {
    return piece.toLowerCase() as PieceTypeCode
}

export function isWhite(piece: PieceCode) {
    return piece.toLowerCase() !== piece;
}
