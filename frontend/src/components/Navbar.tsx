import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Logo from "./Logo";

const SECTIONS = [
  { id: "hero", label: "Home" },
  { id: "intro", label: "Intro" },
  { id: "how", label: "Pipeline" },
  { id: "howto", label: "How to use" },
];

export default function Navbar() {
  const location = useLocation();
  const onLanding = location.pathname === "/";
  const onSearch = location.pathname === "/search";

  const [active, setActive] = useState<string>("hero");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!onLanding) return;

    const sections = SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onLanding]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (!onLanding) return;
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  };

  const overVideo = onLanding && !scrolled && active === "hero";

  // The pill class used for whichever link is "active".
  const pillBg = overVideo
    ? "bg-white/15 ring-1 ring-white/25"
    : "bg-black/[0.08] ring-1 ring-black/[0.12]";

  const activeText = overVideo ? "text-white" : "text-sap-50";
  const inactiveText = overVideo
    ? "text-white/60 hover:text-white"
    : "text-sap-300 hover:text-sap-50";

  return (
    <header
      className={`anim-nav-slide-down fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        overVideo
          ? "border-b border-transparent bg-transparent backdrop-blur-0"
          : "border-b border-black/[0.08] bg-ink-950/85 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-10 px-8 py-5">
        <Logo lightOnDark={overVideo} />

        <nav
          className={`hidden md:flex items-center gap-1 rounded-full px-1.5 py-1.5 transition-colors duration-300 ${
            overVideo
              ? "bg-white/10 ring-1 ring-white/15"
              : "bg-black/[0.04] ring-1 ring-black/[0.08]"
          }`}
        >
          {SECTIONS.map((s) => {
            const isActive = onLanding && active === s.id;
            return (
              <a
                key={s.id}
                href={`${onLanding ? "" : "/"}#${s.id}`}
                onClick={(e) => handleAnchor(e, s.id)}
                className="relative px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition-colors"
              >
                {isActive && (
                  <span className={`absolute inset-0 rounded-full ${pillBg}`} />
                )}
                <span className={`relative z-10 transition-colors ${isActive ? activeText : inactiveText}`}>
                  {s.label}
                </span>
              </a>
            );
          })}

          {/* Cross-route link — gets its own active pill when on /search */}
          <Link
            to="/search"
            className="relative px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition-colors"
          >
            {onSearch && (
              <span className={`absolute inset-0 rounded-full ${pillBg}`} />
            )}
            <span className={`relative z-10 transition-colors ${onSearch ? activeText : inactiveText}`}>
              Search
            </span>
          </Link>
        </nav>

        <div className="ml-auto">
          <Link to="/app" className="btn-cta">
            <span>Launch</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}
