import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // Импорт вашего компонента App

// Если вы используете Tailwind CSS, вам может понадобиться импортировать файл стилей
import './index.css'; 

const root = ReactDOM.createRoot(
  // Убедитесь, что ID 'root' совпадает с ID в вашем public/index.html
  document.getElementById('root') as HTMLElement 
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);