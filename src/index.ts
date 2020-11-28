import { createElement } from 'react';
import { render } from 'react-dom';
import { ChessPractice } from './ChessPractice';

(async function () {
    const app = createElement(ChessPractice);
    render(app, document.getElementById('root'));
})();

