import './App.css';
import { useState, useEffect, useRef } from 'react';
import { soundManager } from './SoundManager';

const FIRST_PLAYER = 1;
const SECOND_PLAYER = 2;
const THIRD_PLAYER = 3;
const FOURTH_PLAYER = 4;
const GRID_SIZE = 5;                                          // 5x5 grid allows more space for 4 players to maneuver
const PLAYGROUND_SIZE = GRID_SIZE * GRID_SIZE;                // Using a 1D array is simpler for React state updates than a 2D array
const EMPTY_CELL_VALUE = 9;                                   // Arbitrary value distinct from player IDs (1-4) to represent an empty slot
const DEFAULT_WINNER_TEXT = 'No one has won yet.';

function App() {
  const [turn, setTurn] = useState<number>(FIRST_PLAYER);
  const [winner, setWinner] = useState<string>(DEFAULT_WINNER_TEXT);
  const [allButtons, setAllButtons] = useState<number[]>(Array(PLAYGROUND_SIZE).fill(EMPTY_CELL_VALUE));
  // Direct DOM access is needed for the Canvas API to draw fireworks efficiently
  const fireworksRef = useRef<HTMLCanvasElement>(null);

  const incrementTurn = () => {
    setTurn(prevTurn => {
      // Rigid turn structure ensures players always go in the defined order: 1->2->3->4->1
      if (prevTurn === FIRST_PLAYER) return SECOND_PLAYER;
      if (prevTurn === SECOND_PLAYER) return THIRD_PLAYER;
      if (prevTurn === THIRD_PLAYER) return FOURTH_PLAYER;
      return FIRST_PLAYER;
    });
  };

  const getWinnerString = (player: number) => `Player ${player} wins!`;

  // Math allows us to verify columns dynamically without a 2D array structure
  const scanColumns = (colIndex: number, buttons: number[]) => Array.from({ length: GRID_SIZE }, (_, row) => buttons[row * GRID_SIZE + colIndex]);

  const topLeftToBottomRightScan = (buttons: number[]) => {
    const diagonal = [];
    for (let i = 0; i < buttons.length; i += GRID_SIZE + 1) diagonal.push(buttons[i]);
    return diagonal;
  };

  const topRightToBottomLeftScan = (buttons: number[]) => {
    const diagonal = [];
    for (let i = GRID_SIZE - 1; i < buttons.length - 1; i += GRID_SIZE - 1) diagonal.push(buttons[i]);
    return diagonal;
  };

  const checkWinnerBatch = (batch: number[]) => {
    const first = batch[0];
    // We must check for EMPTY_CELL_VALUE because a row of empty cells (9,9,9...) is NOT a win
    if (first !== EMPTY_CELL_VALUE && batch.every(cell => cell === first)) return first;
    return null;
  };

  const displayWinner = (buttons: number[]) => {
    for (let i = 0; i < buttons.length; i += GRID_SIZE) {
      const winnerPlayer = checkWinnerBatch(buttons.slice(i, i + GRID_SIZE));
      if (winnerPlayer) return winnerPlayer;
    }
    for (let i = 0; i < GRID_SIZE; i++) {
      const winnerPlayer = checkWinnerBatch(scanColumns(i, buttons));
      // Immediate return prevents having multiple winners for a single move
      if (winnerPlayer) return winnerPlayer;
    }
    const winnerDiag1 = checkWinnerBatch(topLeftToBottomRightScan(buttons));
    if (winnerDiag1) return winnerDiag1;
    const winnerDiag2 = checkWinnerBatch(topRightToBottomLeftScan(buttons));
    if (winnerDiag2) return winnerDiag2;
    return null;
  };

  const placeMarker = (id: number) => {
    if (allButtons[id] !== EMPTY_CELL_VALUE || winner !== DEFAULT_WINNER_TEXT) return;
    const newButtons = [...allButtons];
    newButtons[id] = turn;

    const winnerPlayer = displayWinner(newButtons);
    if (winnerPlayer) {
      setWinner(getWinnerString(winnerPlayer));
      launchFireworks();
      soundManager.playWin();
    } else {
      // Feedback for every valid move keeps the game feeling responsive
      soundManager.playClick();
    }

    setAllButtons(newButtons);
    incrementTurn();
  };

  const restartGame = () => {
    setAllButtons(Array(PLAYGROUND_SIZE).fill(EMPTY_CELL_VALUE));
    setWinner(DEFAULT_WINNER_TEXT);
    setTurn(FIRST_PLAYER);
    soundManager.playRestart();
  };

  const getButtonImage = (id: number) => {
    const button = allButtons[id];
    if (button === EMPTY_CELL_VALUE) return null;
    let className = 'marker';
    if (button === FIRST_PLAYER) className += ' circle';
    else if (button === SECOND_PLAYER) className += ' cross';
    else if (button === THIRD_PLAYER) className += ' square';
    else if (button === FOURTH_PLAYER) className += ' triangle';

    return <div className={className}></div>;
  };

  const launchFireworks = () => {
    const canvas = fireworksRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: any[] = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        alpha: 1,
        color: `hsl(${Math.random() * 360}, 100%, 60%)`
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
      if (particles.some(p => p.alpha > 0)) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    animate();
  };

  useEffect(() => {
    const canvas = fireworksRef.current;
    if (!canvas) return;
    // Resize canvas to full viewport so fireworks can explode anywhere on screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  return (
    <div className="container">
      <h1 className="title">{winner}</h1>
      <button className="restart-btn" onClick={restartGame}>Restart Game</button>
      <div className="tictactoe-grid">
        {allButtons.map((_, index) => (
          <button key={index} onClick={() => placeMarker(index)}>
            {/* Visual markers (shapes) are determined solely by the numeric ID in the grid state */}
            {getButtonImage(index)}
          </button>
        ))}
      </div>
      <canvas ref={fireworksRef} className="fireworks-canvas"></canvas>
      <div className="noise-overlay"></div>
    </div>
  );
}

export default App;
