"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

/** Render the Navbar on every route except the home page, login, and register. */
export default function NavbarWrapper() {
  const pathname = usePathname();
  const hideNavbarRoutes = ["/", "/login", "/register"];
  if (hideNavbarRoutes.includes(pathname)) return null;
  return <Navbar />;
}
