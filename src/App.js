import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lobby from './js/lobby';
import Room from './js/room'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/lobby" element={<Lobby />} />
        {/* Add Room route once it's ready */}
        <Route path="/room" element={<Room />} /> 
      </Routes>
    </Router>
  );
}

export default App;
