import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/admin/LoginPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import { Dashboard } from "./components/admin/Dashboard";
import { UserManagement } from "./components/admin/UserManagement";
import { CommissionSystem } from "./components/admin/CommissionSystem";
import { KYCVerification } from "./components/admin/KYCVerification";
import { APIManagement } from "./components/admin/APIManagement";
import NotFound from "./pages/NotFound";
import { Security } from "./components/admin/Security";
import { Analytics } from "./components/admin/Analytics";
import { ActivityLogs } from "./components/admin/ActivityLog";
import { SupportQueries } from "./components/admin/Support";
import paybazaarLogo from "./assets/paybazaar-logo.png";
import CreateDistributorPage from "./components/admin/CreateDistributor";
import { FundRequest } from "./components/admin/AdminFundRequest";
import AdminTransactionTable from "./components/admin/transaction";
import WalletTopUp from "./components/admin/WalletTopUp";
import CreateMasterDistributorPage from "./components/admin/CreateMAsterDistributor";
import CreateRetailerPage from "./components/admin/CreateRetailer";
import GetAllMD from "./components/admin/GetAllMD";
import GetAllDistributor from "./components/admin/GetallDistributors";
import GetAllUsers from "./components/admin/GetAllUsers";
import PayoutTransactionPage from "./components/admin/PayoutTransaction";
import RefundRequest from "./components/admin/revertrequest";
import RefundPage from "./components/admin/RefundPage";
import RevertHistoryPage from "./components/admin/RevertHistory";
import AdminBankAccount from "./components/admin/AdminBankAccount";
import CommissionSplit from "./components/admin/CommissonSpilt";
import Tickets from "./components/admin/Tickets";
import { UserHierarchySwap } from "./components/admin/Swap";
import ApiManagement from "./components/admin/ApiDown";
import TDSCommissionPage from "./components/admin/Tds";

const queryClient = new QueryClient();

const App = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // block screens smaller than 768px
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-muted px-6">
        <div className="text-center max-w-md space-y-4">
          {/* Logo */}

          <img
            src={paybazaarLogo}
            alt="Paybazaar Logo"
            className="mx-auto w-32 h-auto"
          />

          {/* Title */}
          <h1 className="text-2xl font-semibold text-foreground">
            Access Restricted
          </h1>
          {/* Message */}
          <p className="mt-2 text-muted-foreground">
            This application is optimized for desktop and laptop devices. Please
            switch to a larger screen to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="logs" element={<AdminTransactionTable />} />
              <Route path="logs/payout" element={<PayoutTransactionPage />} />
              <Route path="logs/tds" element={<TDSCommissionPage />} />
              <Route path="funds/request" element={<FundRequest />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="create/md" element={<CreateMasterDistributorPage />} />
              <Route path="create/distributor" element={<CreateDistributorPage />} />
              <Route path="create/user" element={<CreateRetailerPage/>} />
              <Route path="info/md" element={<GetAllMD />} />
              <Route path="info/distributor" element={<GetAllDistributor />} />
              <Route path="info/user" element={<GetAllUsers />} />
              <Route path="bank/account" element={<AdminBankAccount />} />
              <Route path = "commission/split" element={<CommissionSplit />} />
              {/* <Route path="logs/t" element={<TransactionLogs />} /> */}
              <Route path="commission" element={<CommissionSystem />} />
              <Route path="wallet" element={<WalletTopUp />} />
              <Route path="kyc" element={<KYCVerification />} />
              <Route path="api" element={<APIManagement />} />
              <Route path="support" element={<SupportQueries />} />
              <Route path="activity" element={<ActivityLogs />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="security" element={<Security />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="/admin/funds/revert" element={<RefundRequest />} />
              <Route path="/admin/funds/refund" element={<RefundPage />} />
              <Route path="/admin/funds/revert/history" element={<RevertHistoryPage />} />
              <Route path="/admin/Users/swap" element={<UserHierarchySwap />} />
              <Route path="/admin/api/down" element={<ApiManagement />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
