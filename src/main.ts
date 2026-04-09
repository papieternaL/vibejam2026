import './style.css';
import { GameApp } from './core/GameApp';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Expected #app root element.');
}

const app = new GameApp(root);
app.start();
