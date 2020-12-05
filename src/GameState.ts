import assertNever from "assert-never"

export type NoPiece = " "
export type PieceTypeCode = "p" | "r" | "n" | "b" | "q" | "k"
export type PieceCode = PieceTypeCode | "P" | "R" | "N" | "B" | "Q" | "K"
export type SquareState = PieceCode | NoPiece
export const SquarePiecePattern = /[prnbqkPRNBQK ]/

export const PieceTypeCodes: readonly PieceTypeCode[] = ["p", "r", "n", "b", "q", "k"]
export const PieceCodes: readonly PieceCode[] = [...PieceTypeCodes, ...PieceTypeCodes.map(ptc => ptc.toUpperCase())] as readonly PieceCode[]

export type Direction = -1 | 1;
export type Color = Direction | 0;

export function directionOf(piece: PieceCode): Direction {
    return isWhite(piece) ? 1 : -1;
}

export function colorOf(pop: SquareState): Color {
    return pop === " " ? 0 : directionOf(pop);
}

export function rankOf(sq: SquareRef, direction: Direction) {
    return Math.abs(square(sq).cr.r + ((direction == 1) ? -7 : 0))
}

export type SquareCoord = {
    // Zero-based index of column (file) 0 -> "a file", 7 -> "h file"
    readonly c: number,
    // Zero-based index of row 0 -> "row 1", 7 -> "row 8"
    readonly r: number,
};
export type SquareRef = number | string | SquareCoord | SquareInfo;

export class SquareInfo {
    readonly cr: SquareCoord;
    static readonly rows: readonly string[] = ["8", "7", "6", "5", "4", "3", "2", "1"]
    static readonly cols: readonly string[] = ["a", "b", "c", "d", "e", "f", "g", "h"]
    constructor(sq: SquareCoord) {
        this.cr = sq;
    }
    toString() {
        const {c, r} = this.cr;
        if (c < 0 || c > 7)
            throw new Error(`Column ${c} is out of range`);
        if (r < 0 || r > 7)
            throw new Error(`Row ${r} is out of range`);
        return `${SquareInfo.cols[c]}${SquareInfo.rows[r]}` as string
    }
    pos() {
        const {c, r} = this.cr;
        return c + r * 8;
    }
    xy() {
        const {c: x, r: y} = this.cr;
        return {x, y}
    }
    light(): boolean {
        const {c, r} = this.cr;
        return ((c + r) % 2) === 0;
    }
    dark(): boolean {
        return !this.light;
    }
    equals(other: SquareRef): boolean {
        const sq2 = square(other);
        return this.pos() === sq2.pos();
    }
}

export function square(sq: SquareRef): SquareInfo {
    if (typeof sq === "number") {
        if (sq < 0 || sq > 63)
            throw new Error(`Square position ${sq} is out of range`);
        return square({c: sq % 8, r: Math.floor(sq / 8)});
    }
    else if (typeof sq === "string") {
        if (sq.length < 2)
            throw new Error(`Square ref ${sq} is too short`);
        const col = sq[0].toLowerCase();
        const row = sq[1];
        if (col < "a" || col > "h")
            throw new Error(`Square ref ${sq} column ${col} is invalid`);
        if (row < "1" || row > "8")
            throw new Error(`Square ref ${sq} row ${row} is invalid`);
        return square({c: col.charCodeAt(0) - "a".charCodeAt(0), r: 8 - parseInt(row)})
    }
    else if ("cr" in sq) {
        return sq;
    }
    return new SquareInfo(sq);
}

export type CastleState = string;

export type BoardState = {
    population: SquareState[],
    castle: CastleState,
    enPassant: SquareRef | undefined,
    toMove: Color,
    // number of half moves with respect to the 50 move draw rule
    // resets to zero after a capture or a pawn move
    halfMoveClock: number,
    // number of the full moves in a game
    // increments after black moves
    fullMoveCount: number,
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

