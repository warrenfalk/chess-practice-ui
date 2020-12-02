import React, { useReducer} from 'react';
import { Board, BoardEvent, SquareRef } from './Board';
import { parseFem } from './fem';
import { SquareState } from './GameState';


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