"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { ThemeMode } from "@/lib/defaults";

type ThemeSwitcherProps = {
  initialThemeMode: ThemeMode;
};

const themeIcons = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
} satisfies Record<ThemeMode, typeof Monitor>;

const popupThemeOptions: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: "light", label: "浅色模式", description: "始终使用浅色主题" },
  { value: "dark", label: "深色模式", description: "始终使用深色主题" },
  { value: "auto", label: "自动模式", description: "跟随系统主题设置" },
];

function applyThemeMode(themeMode: ThemeMode) {
  document.documentElement.dataset.theme = themeMode;
}

function getSystemThemeMode(): Exclude<ThemeMode, "auto"> {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeSwitcher({ initialThemeMode }: ThemeSwitcherProps) {
  const [themeMode, setThemeMode] = useState(initialThemeMode);
  const [systemThemeMode, setSystemThemeMode] = useState<Exclude<ThemeMode, "auto">>("light");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemThemeMode = () => setSystemThemeMode(getSystemThemeMode());

    updateSystemThemeMode();
    mediaQuery.addEventListener("change", updateSystemThemeMode);
    return () => mediaQuery.removeEventListener("change", updateSystemThemeMode);
  }, []);

  const selectThemeMode = (nextThemeMode: ThemeMode) => {
    const previousThemeMode = themeMode;
    setMessage("");
    setThemeMode(nextThemeMode);
    applyThemeMode(nextThemeMode);

    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { themeMode: nextThemeMode } }),
      });

      if (!response.ok) {
        setThemeMode(previousThemeMode);
        applyThemeMode(previousThemeMode);
        setMessage("主题保存失败");
      }
    });
  };

  const TriggerIcon = themeIcons[themeMode];
  const systemThemeLabel = systemThemeMode === "dark" ? "深色" : "浅色";

  return (
    <div className="theme-switcher" aria-label="主题切换">
      <button type="button" className="theme-trigger" title="切换主题" aria-label="切换主题" aria-haspopup="menu">
        <TriggerIcon size={17} aria-hidden="true" />
      </button>
      <div className="theme-menu" role="menu">
        {popupThemeOptions.map((option) => {
          const Icon = themeIcons[option.value];
          const isActive = option.value === themeMode;
          return (
            <button
              type="button"
              className={`theme-menu-item${isActive ? " active" : ""}`}
              key={option.value}
              onClick={() => selectThemeMode(option.value)}
              disabled={isPending && !isActive}
              role="menuitemradio"
              aria-pressed={isActive}
              aria-checked={isActive}
            >
              <Icon size={18} aria-hidden="true" />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          );
        })}
        <div className="theme-menu-footer">当前跟随系统：{systemThemeLabel}</div>
        {message ? <div className="theme-switcher-message">{message}</div> : null}
      </div>
    </div>
  );
}
