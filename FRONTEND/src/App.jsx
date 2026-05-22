import { Route, Routes } from "react-router-dom";
import Kiosko from "./Kiosko";
import Registro from "./registro";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Kiosko />} />
      <Route path="/kiosko" element={<Kiosko />} />
      <Route path="/registro" element={<Registro />} />
    </Routes>
  );
}

export default App;