
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Home, Wallet, BarChart2, Settings, PieChart, Target, DollarSign } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
}

function NavItem({ icon: Icon, label, to }: NavItemProps) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2 rounded-md transition-colors
        ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}
      `}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside className={`bg-sidebar fixed left-0 top-16 h-[calc(100vh-64px)] w-64 z-10 transition-transform duration-200 shadow-lg
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      <div className="p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Navigation</h2>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-200px)] px-3">
        <div className="flex flex-col gap-1">
          <NavItem icon={Home} label="Dashboard" to="/dashboard" />
          <NavItem icon={Wallet} label="Expenses" to="/expenses" />
          <NavItem icon={BarChart2} label="Analytics" to="/analytics" />
          <NavItem icon={Target} label="Goals" to="/goals" />
          <NavItem icon={DollarSign} label="Income" to="/income" />
          <NavItem icon={Settings} label="Settings" to="/settings" />
        </div>
        <Separator className="my-4 bg-sidebar-accent" />
        <div className="py-2">
          <h3 className="mb-2 text-xs font-medium text-sidebar-foreground/60">
            Spending Categories
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="justify-start text-sidebar-foreground border-sidebar-border">
              <PieChart size={14} className="mr-2" />
              Food
            </Button>
            <Button size="sm" variant="outline" className="justify-start text-sidebar-foreground border-sidebar-border">
              <PieChart size={14} className="mr-2" />
              Transport
            </Button>
            <Button size="sm" variant="outline" className="justify-start text-sidebar-foreground border-sidebar-border">
              <PieChart size={14} className="mr-2" />
              Housing
            </Button>
            <Button size="sm" variant="outline" className="justify-start text-sidebar-foreground border-sidebar-border">
              <PieChart size={14} className="mr-2" />
              Utilities
            </Button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
