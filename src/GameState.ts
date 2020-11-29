import assertNever from "assert-never"

export type NoPiece = " "
export type PieceTypeCode = "p" | "r" | "n" | "b" | "q" | "k"
export type PieceCode = PieceTypeCode | "P" | "R" | "N" | "B" | "Q" | "K"
export type SquareState = PieceCode | NoPiece
export const SquarePiecePattern = /[prnbqkPRNBQK ]/

export const PieceTypeCodes: readonly PieceTypeCode[] = ["p", "r", "n", "b", "q", "k"]
export const PieceCodes: readonly PieceCode[] = [...PieceTypeCodes, ...PieceTypeCodes.map(ptc => ptc.toUpperCase())] as readonly PieceCode[]

export type GameState = {
    squares: SquareState[],
}

export function pieceType(piece: PieceCode) {
    return piece.toLowerCase() as PieceTypeCode
}

export function isWhite(piece: PieceCode) {
    return piece.toLowerCase() !== piece;
}

export function pieceTypeName(pieceType: PieceTypeCode): string {
    switch (pieceType) {
        case "p": return "pawn";
        case "r": return "rook";
        case "n": return "knight";
        case "b": return "bishop";
        case "q": return "queen";
        case "k": return "king";
        default: assertNever(pieceType);
    }
}

export function pieceName(pieceCode: PieceCode): string {
    return `${isWhite(pieceCode) ? "w" : "b"}${pieceTypeName(pieceType(pieceCode))}`;
}

