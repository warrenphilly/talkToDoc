"use client";

import { useEffect, useState } from "react";
import { SidebarLoading } from "./sidebar-loading";

interface DelayedLoadingProps {
  delay?: number;
}

export function DelayedLoading({ delay = 1500 }: DelayedLoadingProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return <SidebarLoading />;
}
