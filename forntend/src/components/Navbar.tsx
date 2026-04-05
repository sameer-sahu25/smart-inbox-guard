import { useState } from "react";
import { Menu, X, Shield, ChevronDown, LogOut, User as UserIcon, Settings, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Desktop Navigation Left */}
          <div className="hidden md:flex items-center gap-10">
            <Link to="/" className="text-[13px] font-medium text-white/70 hover:text-primary transition-colors tracking-wide uppercase">
              Home
            </Link>
            
            <a href="#features" className="text-[13px] font-medium text-white/70 hover:text-primary transition-colors tracking-wide uppercase">
              Features
            </a>
            {isAuthenticated && (
              <>
                <a href="#api" className="text-[13px] font-medium text-white/70 hover:text-primary transition-colors tracking-wide uppercase">
                  API Key
                </a>
                <a href="#analytics" className="text-[13px] font-medium text-white/70 hover:text-primary transition-colors tracking-wide uppercase">
                  Analytics
                </a>
              </>
            )}
          </div>

          {/* Centered Logo - Spam AI Style */}
          <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
            <BrandLogo size={48} className="secondary-glow" />
            <span className="text-3xl font-display font-bold text-white tracking-tighter dual-text-glow">
              Spam <span className="text-primary italic">AI</span>
            </span>
          </Link>

          {/* Desktop Right - Account/Social */}
          <div className="hidden md:flex items-center gap-6">
            <div className={`flex items-center gap-6 transition-all duration-500 ${isAuthenticated ? 'opacity-0 scale-95 pointer-events-none w-0 overflow-hidden' : 'opacity-100 scale-100'}`}>
              {!isAuthenticated && (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/login")}
                    className="text-[13px] text-white/70 hover:text-primary hover:bg-transparent uppercase tracking-wider"
                  >
                    Login
                  </Button>
                  <div className="h-4 w-[1px] bg-white/10" />
                  <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-none px-8 uppercase text-xs tracking-widest magenta-glow">
                    Try Demo
                  </Button>
                </>
              )}
            </div>
            
            {isAuthenticated && (
              <div className="animate-fade-in">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0 hover:bg-white/5 transition-all">
                      <Avatar className="h-10 w-10 border border-white/10 ring-2 ring-primary/20">
                        <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                        <AvatarFallback className="bg-navy text-primary font-bold">
                          {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 bg-navy/95 backdrop-blur-xl border-white/10 text-white p-2 mt-2" align="end">
                    <DropdownMenuLabel className="font-normal p-4">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-bold leading-none text-white tracking-tight">{user?.name || 'Authorized User'}</p>
                        <p className="text-xs leading-none text-white/40 font-medium">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem className="focus:bg-primary/20 focus:text-white cursor-pointer py-3 px-4 rounded-lg transition-all group">
                      <LayoutDashboard className="mr-3 h-4 w-4 text-white/40 group-hover:text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="focus:bg-primary/20 focus:text-white cursor-pointer py-3 px-4 rounded-lg transition-all group">
                      <UserIcon className="mr-3 h-4 w-4 text-white/40 group-hover:text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest">Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="focus:bg-primary/20 focus:text-white cursor-pointer py-3 px-4 rounded-lg transition-all group">
                      <Settings className="mr-3 h-4 w-4 text-white/40 group-hover:text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest">Security Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem 
                      onClick={logout}
                      className="focus:bg-destructive/20 focus:text-destructive cursor-pointer py-3 px-4 rounded-lg transition-all group"
                    >
                      <LogOut className="mr-3 h-4 w-4 text-white/40 group-hover:text-destructive" />
                      <span className="text-xs font-bold uppercase tracking-widest">Secure Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden ml-auto p-2 text-white/70"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-6 bg-background/95 backdrop-blur-xl border-t border-white/5 animate-fade-in">
            <div className="flex flex-col gap-6 items-center text-center px-4">
              <Link to="/" className="text-sm font-bold text-white uppercase tracking-widest" onClick={() => setIsOpen(false)}>
                Home
              </Link>
              <a href="#features" className="text-sm font-bold text-white uppercase tracking-widest" onClick={() => setIsOpen(false)}>
                Features
              </a>
              {isAuthenticated && (
                <>
                  <a href="#api" className="text-sm font-bold text-white uppercase tracking-widest" onClick={() => setIsOpen(false)}>
                    API Key
                  </a>
                  <a href="#analytics" className="text-sm font-bold text-white uppercase tracking-widest" onClick={() => setIsOpen(false)}>
                    Analytics
                  </a>
                </>
              )}
              <div className="flex flex-col gap-4 w-full pt-6 border-t border-white/5">
                <div className={`flex flex-col gap-4 transition-all duration-500 ${isAuthenticated ? 'opacity-0 scale-95 h-0 overflow-hidden' : 'opacity-100 scale-100'}`}>
                  {!isAuthenticated && (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => { navigate("/login"); setIsOpen(false); }}
                        className="w-full text-white/70 hover:text-primary uppercase tracking-widest text-xs font-bold"
                      >
                        Login
                      </Button>
                      <Button 
                        onClick={() => setIsOpen(false)}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-none uppercase text-xs tracking-widest"
                      >
                        Try Demo
                      </Button>
                    </>
                  )}
                </div>
                {isAuthenticated && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl w-full">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-white/40">{user?.email}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => { logout(); setIsOpen(false); }}
                      className="w-full text-destructive hover:bg-destructive/10 uppercase tracking-widest text-xs font-bold"
                    >
                      Sign Out
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;