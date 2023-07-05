import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const elmt = document.getElementById('app');
const root = createRoot(elmt);
root.render(<App />);