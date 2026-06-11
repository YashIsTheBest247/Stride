import { useEffect, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { useAccess } from "./components/AccessProvider";
import Navbar from "./components/Navbar";
import Landing from "./routes/Landing";
import AppPage from "./routes/App";
import SearchPage from "./routes/Search";

/**
 * Guards a protected route reached by DIRECT URL while locked: bounce to the
 * landing (so the video plays) and open the access modal pointing back here.
 * Normal in-app navigation goes through GatedLink, which never lands here
 * locked.
 */
function Protected({ to, children }: { to: string; children: ReactNode }) {
  const { unlocked, requestAccess } = useAccess();
  const navigate = useNavigate();
  useEffect(() => {
    if (!unlocked) {
      navigate("/", { replace: true });
      requestAccess(to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);
  return unlocked ? <>{children}</> : null;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Landing (with the video) is open; the app pages are gated behind a
            one-time access code. */}
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Protected to="/app"><AppPage /></Protected>} />
        <Route path="/search" element={<Protected to="/search"><SearchPage /></Protected>} />
      </Routes>
    </>
  );
}
