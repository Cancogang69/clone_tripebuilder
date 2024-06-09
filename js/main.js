import { Core } from './core.js';

const UIComponents = {
    scoreUI: document.querySelector("#score"),
    highscoreUI: document.querySelector("#high_score"),
    timerUI: document.querySelector("#timer"),
    gameTime: 60         // second
}

window.onload = () =>{
    const app = new Core(function(){
        app.createGame(10, 10);
    }, UIComponents);
};