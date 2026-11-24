import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const stored = localStorage.getItem('warnet-theme');
const dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle('dark', dark);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App initialDark={dark} />
  </React.StrictMode>,
);
