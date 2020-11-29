import { GameState, SquareState, SquareStatePattern } from "./GameState";

function parseRowFem(rowFem: string): SquareState[] {
    const row = rowFem.replace(/[1-8]+/g, n => " ".repeat(parseInt(n))).split("");
    if (row.length !== 8)
        throw new Error(`row "${rowFem}" has ${row.length} squares`);
    const bad = row.find(s => !SquareStatePattern.test(s));
    if (bad !== undefined)
        throw new Error(`row "${rowFem}" has invalid piece ${bad}`);
    return row as SquareState[];
}

function parseBoardFem(boardFem: string): SquareState[] {
    const rows = boardFem.split(/\//).map(parseRowFem);
    if (rows.length !== 8)
        throw new Error(`board has ${rows.length} rows`);
    return rows.flat();
}

export function parseFem(fem: string): GameState {
    const [boardFem, toMoveFem, castlesFem, enPassantFem, halfMoveClockFem, fullMoveCountFem] = fem.split(/ +/);
    const squares = parseBoardFem(boardFem);
    return {squares}
}

