import { useEffect, useState } from "react";

const NAVIGATION_EVENT = "nova:navigate";

export function normalizeAppPath(path: string) {
  const value = path.trim() || "/";
  const match = /^([^?#]*)([?#].*)?$/.exec(value);
  const pathname = match?.[1] || "/";
  const suffix = match?.[2] || "";
  const normalizedPathname = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return `${normalizedPathname || "/"}${suffix}`;
}

function readPath() {
  return normalizeAppPath(window.location.pathname || "/");
}

export function navigate(path: string, replace = false) {
  const target = normalizeAppPath(path);
  if (readPath() === target) return;

  if (replace) window.history.replaceState(null, "", target);
  else window.history.pushState(null, "", target);

  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function useAppPath() {
  const [path, setPath] = useState(readPath);

  useEffect(() => {
    const updatePath = () => setPath(readPath());

    window.addEventListener("popstate", updatePath);
    window.addEventListener(NAVIGATION_EVENT, updatePath);

    return () => {
      window.removeEventListener("popstate", updatePath);
      window.removeEventListener(NAVIGATION_EVENT, updatePath);
    };
  }, []);

  return path;
}