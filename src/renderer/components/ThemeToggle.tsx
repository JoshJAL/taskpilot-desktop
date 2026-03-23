import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "auto";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    window.taskpilot.getSettings().then((s: { theme?: Theme }) => {
      if (s.theme) setTheme(s.theme);
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }

    window.taskpilot.updateSettings({ theme });
  }, [theme]);

  function cycle() {
    setTheme((prev) => {
      if (prev === "auto") return "light";
      if (prev === "light") return "dark";
      return "auto";
    });
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <button
      onClick={cycle}
      className="sidebar-link"
      title={`Theme: ${theme}`}
    >
      <Icon size={18} className="shrink-0" />
    </button>
  );
}
