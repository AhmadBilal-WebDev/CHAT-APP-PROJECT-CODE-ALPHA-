import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import SplashScreen from "./Utils/SplashScreen";
import SignUp from "./Components/SignUp";
import LogIn from "./Components/LogIn";
import Chat from "./Components/Chat";
import { Toaster } from "react-hot-toast";
const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </div>
  );
};

export default App;
