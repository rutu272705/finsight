import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", toggleVisible, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className="fixed bottom-6 right-6 z-40 grid h-10 w-10 place-items-center rounded-full border border-stone-300 bg-white/95 text-stone-800 shadow-md backdrop-blur transition-all hover:border-black hover:bg-black hover:text-white hover:scale-105 active:scale-95"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
