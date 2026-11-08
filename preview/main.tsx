import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Landing from "@/components/Landing";
import AppShell from "@/components/app/AppShell";
import { isView } from "@/components/app/AppContext";

function Root() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    const on = () => { setHash(window.location.hash.slice(1)); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return isView(hash) ? <AppShell /> : <Landing />;
}

createRoot(document.getElementById("root")!).render(<Root />);
