import {
  FileText,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  Truck,
  Wallet,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/bencana", label: "Data Bencana", icon: MapPin },
  { href: "/logistik", label: "Logistik", icon: Package },
  { href: "/anggaran", label: "Anggaran", icon: Wallet },
  { href: "/distribusi", label: "Distribusi", icon: Truck },
  { href: "/laporan", label: "Laporan", icon: FileText },
  { href: "/riwayat-audit", label: "Riwayat Audit", icon: History },
];

export function isNavItemActive(href: string, pathname: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
