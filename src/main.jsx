import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { applySiteFavicon } from './lib/siteFavicon.js';
import './index.css';

applySiteFavicon();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
