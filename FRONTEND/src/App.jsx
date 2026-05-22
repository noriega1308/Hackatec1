import { Route, Routes } from "react-router-dom";
import Kiosko from "./Kiosko";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Kiosko />} />
      <Route path="/kiosko" element={<Kiosko />} />
    </Routes>
  );
}

export default App;