import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./routes/Landing";
import AppPage from "./routes/App";
import SearchPage from "./routes/Search";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </>
  );
}
