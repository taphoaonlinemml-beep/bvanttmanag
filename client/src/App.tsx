import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { AdminOnly } from "./components/AdminOnly";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import DataManagementPage from "./pages/DataManagementPage";
import Dashboard from "./pages/Dashboard";
import PersonnelPage from "./pages/PersonnelPage";
import PolicyPage from "./pages/PolicyPage";
import SettingsPage from "./pages/SettingsPage";
import UnitsPage from "./pages/UnitsPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}><DashboardLayout><Dashboard /></DashboardLayout></Route>
      <Route path={"/nhan-su"}><DashboardLayout><PersonnelPage /></DashboardLayout></Route>
      <Route path={"/don-vi"}><DashboardLayout><UnitsPage /></DashboardLayout></Route>
      <Route path={"/chinh-sach"}><DashboardLayout><PolicyPage /></DashboardLayout></Route>
      <Route path={"/du-lieu"}><DashboardLayout><AdminOnly permissions={["manageBackup"]}><DataManagementPage /></AdminOnly></DashboardLayout></Route>
      <Route path={"/cai-dat"}><DashboardLayout><AdminOnly permissions={["manageAccounts", "manageMobileSync", "transferData"]}><SettingsPage /></AdminOnly></DashboardLayout></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
