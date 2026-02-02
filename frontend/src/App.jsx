import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Upload from './pages/Upload';

const App = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/h" element={<Login />} />
          <Route path="/" element={<Upload />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App