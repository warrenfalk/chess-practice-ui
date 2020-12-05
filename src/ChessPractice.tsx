import React, { useReducer} from 'react';
import { Board, BoardEvent, SquareFocus } from './Board';
import { parseFem } from './fem';
import { SquareCoord, SquareRef, SquareState, square, pieceType, isWhite, CastleState, BoardState } from './GameState';
import produce from "immer";

type AppState = {
    board: BoardState,
    focus?: SquareFocus,
    highlighted: SquareRef[],
}

type AppEvent = {from: "board", boardEvent: BoardEvent};

const defaultState: AppState = {
    board: parseFem("rnbqkbnr/pppp1ppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
    highlighted: [],
}

const movePiece = produce((board: BoardState, move: {to: SquareRef, from: SquareRef}) => {
    const {population} = board;
    const from = square(move.from).pos()
    const to = square(move.to).pos()
    const pop = population[from];
    if (pop === " ")
        return;
    const piece = pop;
    // detect castling
    if (piece === "k" && square(move.from).equals(square("e8"))) {
        if (square(move.to).equals(square("c8"))) {
            // black castle long
            population[square("a8").pos()] = " ";
            population[square("d8").pos()] = "r";
        }
        else if (square(move.to).equals(square("g8"))) {
            // black castle short
            population[square("h8").pos()] = " ";
            population[square("f8").pos()] = "r";
        }
    }
    else if (piece === "K" && square(move.from).equals(square("e1"))) {
        if (square(move.to).equals(square("c1"))) {
            // white castle long
            population[square("a1").pos()] = " ";
            population[square("d1").pos()] = "R";
        }
        else if (square(move.to).equals(square("g1"))) {
            // white castle short
            population[square("h1").pos()] = " ";
            population[square("f1").pos()] = "R";
        }
    }
    if (piece === "K")
        board.castle = board.castle.replace(/[KQ]/g, "");
    if (piece === "k")
        board.castle = board.castle.replace(/[kq]/g, "");
    if (piece === "R" && square(move.from).equals("a1"))
        board.castle = board.castle.replace(/Q/g, "");
    if (piece === "R" && square(move.from).equals("h1"))
        board.castle = board.castle.replace(/K/g, "");
    if (piece === "r" && square(move.from).equals("a8"))
        board.castle = board.castle.replace(/q/g, "");
    if (piece === "r" && square(move.from).equals("h8"))
        board.castle = board.castle.replace(/k/g, "");
    throw new Error("Check for enpassant");
    population[to] = piece;
    population[from] = " ";
})

function next(pos: number, h: number, v: number): number | undefined {
    const c = (pos % 8) + h;
    const r = Math.floor(pos / 8) - v;
    return (c < 0 || c > 7 || r < 0 || r > 7) ? undefined : c + r * 8;
}

function* line(pos: number | undefined, h: number, v: number, pop: readonly SquareState[], isEnemy: (p: SquareState) => boolean): Generator<number> {
    for (let x = pos && next(pos, h, v); x; x = next(x, h, v)) {
        const p = pop[x];
        const empty = p === " ";
        if (empty || isEnemy(p))
            yield x;
        if (!empty)
            break;
    }
}

function* lines(pos: number | undefined, pop: readonly SquareState[], isEnemy: (p: SquareState) => boolean, rays: readonly [number, number][]): Generator<number> {
    for (const [h, v] of rays) {
        yield* line(pos, h, v, pop, isEnemy);
    }
}
function color(pop: SquareState) {
    return pop === " " ? 0 : isWhite(pop) ? 1 : -1;
}

const orthogonal: [number, number][] = [[0,1], [0,-1], [1,0], [-1,0]];
const diagonal: [number, number][] = [[1,1], [-1,-1], [-1,1], [1,-1]];
const knight: [number, number][] = [[-2,-1], [-2,1], [-1,2], [1,2], [2,1], [2,-1], [1,-2], [-1,-2]]

function* getValidMoves(pop: readonly SquareState[], castle: CastleState, sqr: SquareRef): Generator<number> {
    const sq = square(sqr).pos();
    const piece = pop[sq];
    if (piece === " ")
        return;
    const pt = pieceType(piece);
    const forward = color(piece);
    const isEnemy = (p: SquareState) => p != " " && color(p) !== forward
    switch (pt) {
        case "p": {
            const f1 = next(sq, 0, forward);
            if (f1 && pop[f1] === " ") {
                yield f1;
                const rank = Math.abs(square(sq).cr.r + ((forward == 1) ? -7 : 0));
                console.log(rank)
                if (rank === 1) {
                    const f2 = next(f1, 0, forward);
                    if (f2 && pop[f2] === " ")
                        yield f2;
                }
            }
            const ul = next(sq, -1, forward);
            if (ul && isEnemy(pop[ul]))
                yield ul;
            const ur = next(sq, 1, forward);
            if (ur && isEnemy(pop[ur]))
                yield ur;
            return;
        }
        case "r": {
            yield* lines(sq, pop, isEnemy, orthogonal);
            return;
        }
        case "b": {
            yield* lines(sq, pop, isEnemy, diagonal);
            return;
        }
        case "q": {
            yield* lines(sq, pop, isEnemy, [...orthogonal, ...diagonal]);
            return;
        }
        case "n": {
            for (const [h, v] of knight) {
                const ksq = next(sq, h, v);
                if (!ksq)
                    continue;
                const p = pop[ksq];
                if (p === " " || isEnemy(p))
                    yield ksq;
            }
            return;
        }
        case "k": {
            for (const [h, v] of [...orthogonal, ...diagonal]) {
                const ksq = next(sq, h, v);
                if (!ksq)
                    continue;
                const p = pop[ksq];
                if (p === " " || isEnemy(p))
                    yield ksq;
            }
            if (piece === "k" && square(sq).equals(square("e8"))) {
                if (/q/.test(castle) && pop[square("d8").pos()] === " " && pop[square("c8").pos()] === " " && pop[square("b8").pos()] === " ") {
                    // black castle long
                    yield square("c8").pos();
                }
                if (/k/.test(castle) && pop[square("f8").pos()] === " " && pop[square("g8").pos()] === " ") {
                    // black castle short
                    yield square("g8").pos();
                }
            }
            else if (piece === "K" && square(sq).equals(square("e1"))) {
                if (/Q/.test(castle) && pop[square("d1").pos()] === " " && pop[square("c1").pos()] === " " && pop[square("b1").pos()] === " ") {
                    // white castle long
                    yield square("c1").pos();
                }
                if (/K/.test(castle) && pop[square("f1").pos()] === " " && pop[square("g1").pos()] === " ") {
                    yield square("g1").pos();
                }
            }
            return;
        }
    }
}

const appReduce = produce((state: AppState, action: AppEvent) => {
    if (action.from === "board") {
        const {boardEvent} = action;
        switch (boardEvent.event) {
            case "movePiece": {
                state.board = movePiece(state.board, {to: boardEvent.destination, from: boardEvent.origin});
                delete state.focus;
                return;
            }
            case "focusSquare": {
                const {board} = state;
                const valid = Array.from(getValidMoves(board.population, board.castle, boardEvent.square));
                state.focus = {origin: boardEvent.square, valid};
                return;
            }
            case "unfocus": {
                delete state.focus;
                return;
            }
            case "clickSquare": {
                const {focus} = state;
                if (focus && !square(focus.origin).equals(boardEvent.square)) {
                    const to = boardEvent.square;
                    state.board = movePiece(state.board, {to, from: focus.origin});
                    delete state.focus;
                }
            }
        }
    }
});

export const ChessPractice: React.FC = ({}) => {
    const [state, dispatch] = useReducer(appReduce, defaultState);
    const {board, focus, highlighted} = state;
    return (
        <div>
            <Board
                population={board.population}
                focus={focus}
                highlighted={highlighted}
                onEvent={(e) => {
                    console.log(e);
                    dispatch({from: "board", boardEvent: e})
                }}
            />
        </div>
    )
}