import React, { useReducer} from 'react';
import { Board, BoardEvent, SquareRef, toSquareNumber } from './Board';
import { parseFem } from './fem';
import { SquareState } from './GameState';
import produce from "immer";

type AppState = {
    population: SquareState[],
    highlighted: SquareRef[],
    valid: SquareRef[],
}

type AppEvent = {from: "board", boardEvent: BoardEvent};

const defaultState: AppState = {
    population: parseFem("rnbqkbnr/pppp1ppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1").squares,
    highlighted: ["e2", "e3"],
    valid: ["e3", "e4", "e5", "e6"],
}

const appReduce = produce((state: AppState, action: AppEvent) => {
    if (action.from === "board" && action.boardEvent.event === "movePiece") {
        const {boardEvent} = action;
        const from = toSquareNumber(boardEvent.origin)
        const to = toSquareNumber(boardEvent.destination)
        state.population[to] = state.population[from];
        state.population[from] = " ";
    }
});

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