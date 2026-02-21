"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

/** Render the Navbar on every route except the home page (`/`). */
export default function NavbarWrapper() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <Navbar />;
}
