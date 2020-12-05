import { BoardState, SquareState, SquarePiecePattern, CastleState, Color, square, SquareRef } from "./GameState";

function parseRowFen(rowFen: string): SquareState[] {
    const row = rowFen.replace(/[1-8]+/g, n => " ".repeat(parseInt(n))).split("");
    if (row.length !== 8)
        throw new Error(`row "${rowFen}" has ${row.length} squares`);
    const bad = row.find(s => !SquarePiecePattern.test(s));
    if (bad !== undefined)
        throw new Error(`row "${rowFen}" has invalid piece ${bad}`);
    return row as SquareState[];
}

function parseBoardFen(boardFen: string): SquareState[] {
    const rows = boardFen.split(/\//).map(parseRowFen);
    if (rows.length !== 8)
        throw new Error(`board has ${rows.length} rows`);
    return rows.flat();
}

function parseCastleStateFen(castlesFen: string): CastleState {
    return castlesFen;
}

function parseToMoveFen(toMoveFen: string): Color {
    return toMoveFen === "w" ? 1 : toMoveFen === "b" ? -1 : 0;
}

function parseEnPassantFen(enPassantFen: string): SquareRef | undefined {
    if (enPassantFen === "-")
        return undefined;
    return square(enPassantFen);
}

export function parseFen(fen: string): BoardState {
    const [boardFen, toMoveFen, castlesFen, enPassantFen, halfMoveClockFen, fullMoveCountFen] = fen.split(/ +/);
    const population = parseBoardFen(boardFen);
    const castle = parseCastleStateFen(castlesFen);
    const enPassant = parseEnPassantFen(enPassantFen);
    const toMove = parseToMoveFen(toMoveFen);
    return {population, castle, toMove, enPassant}
}

