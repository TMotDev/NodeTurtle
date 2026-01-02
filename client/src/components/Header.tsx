import { Link } from "@tanstack/react-router";
import { Turtle } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import UserMenu from "./UserMenu";
import { navigationMenuTriggerStyle } from "./ui/navigation-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import useAuthStore, { Role } from "@/lib/authStore";

export default function Header() {
  const [isLoading, user] = useAuthStore(useShallow((state) => [state.isLoading, state.user]));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <Turtle size={32} className="text-primary" />
            <span className="hidden font-bold sm:inline-block">Turtle Graphics</span>
          </Link>
        </div>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link to="/">Home</Link>
              </NavigationMenuLink>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link to="/projects/explore">Explore</Link>
              </NavigationMenuLink>
                {!isLoading && user && (
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/projects">Projects</Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>

             {!isLoading && !user && (
              <>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link to="/login">Login</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link to="/register">Register</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </>
            )}

            {user?.role === Role.Admin && (
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-10">Admin</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-4">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link to="/admin/users">
                          <div className="font-medium">Users</div>
                          <div className="text-muted-foreground">Manage user accounts</div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link to="/admin/projects">
                          <div className="font-medium">Projects</div>
                          <div className="text-muted-foreground">Manage user projects</div>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
        <UserMenu />
      </div>
    </header>
  );
}
