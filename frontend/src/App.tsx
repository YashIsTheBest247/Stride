import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./routes/Landing";
import AppPage from "./routes/App";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppPage />} />
      </Routes>
    </>
  );
}
