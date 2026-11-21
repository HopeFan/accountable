import {
  Building2,
  Columns3,
  Handshake,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { cx } from "./ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/deals", label: "Deals", icon: Handshake },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
];

export function Shell() {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col gap-7 bg-sidebar px-4 py-6 text-on-sidebar">
        <div className="flex items-center gap-2.5 px-2 text-[19px] font-bold tracking-tight text-white">
          <span className="grid size-[30px] place-items-center rounded-[9px] bg-primary text-[17px] text-on-accent">
            A
          </span>
          Accountable
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 rounded-[10px] px-3 py-2.5 font-medium transition-colors",
                  isActive
                    ? "bg-primary font-semibold text-on-accent"
                    : "hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-[1440px]">
          <TopBar />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
