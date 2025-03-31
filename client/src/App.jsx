import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { lazyLoadComponent } from './utils/lazyLoad';
import Header from "./components/Header";
import PrivateRoute from "./components/PrivateRoute";
import NotificationPopup from './components/NotificationPopup';
import Loader from './components/Loader';
import { NotificationProvider } from './context/NotificationContext';

// Eagerly loaded components (critical for initial render)
import Home from "./pages/Home";
import RegisteredCompanies from "./pages/RegisteredCompanies";
import CompanyDetails from './pages/CompanyDetails';
import Contract from './pages/Contract';
import SentContracts from './pages/SentContracts';

// Lazily loaded components (loaded on demand)
const SignIn = lazyLoadComponent(() => import("./pages/SignIn"), <Loader />);
const SignUp = lazyLoadComponent(() => import("./pages/SignUp"), <Loader />);
const About = lazyLoadComponent(() => import("./pages/About"), <Loader />);
const Profile = lazyLoadComponent(() => import("./pages/Profile"), <Loader />);
const CreateListing = lazyLoadComponent(() => import("./pages/CreateListing"), <Loader />);
const UpdateListing = lazyLoadComponent(() => import("./pages/UpdateListing"), <Loader />);
const Listing = lazyLoadComponent(() => import("./pages/Listing"), <Loader />);
const Search = lazyLoadComponent(() => import("./pages/Search"), <Loader />);
const Landlords = lazyLoadComponent(() => import("./pages/Landlords"), <Loader />);
const Tenants = lazyLoadComponent(() => import("./pages/Tenants"), <Loader />);
const LandlordListings = lazyLoadComponent(() => import("./pages/LandlordListings"), <Loader />);
const TenantProfile = lazyLoadComponent(() => import("./pages/TenantProfile"), <Loader />);
const Analytics = lazyLoadComponent(() => import("./pages/Analytics"), <Loader />);
const ChangePassword = lazyLoadComponent(() => import("./pages/ChangePassword"), <Loader />);
const RealEstateSignUp = lazyLoadComponent(() => import("./pages/RealEstateSignUp"), <Loader />);
const AdminSignIn = lazyLoadComponent(() => import("./pages/AdminSignIn"), <Loader />);
const Admin = lazyLoadComponent(() => import("./pages/Admin"), <Loader />);
const HeroSection = lazyLoadComponent(() => import("./pages/HeroSection"), <Loader />);
const RealEstateLogin = lazyLoadComponent(() => import("./pages/RealEstateLogin"), <Loader />);
const RealEstateDashboard = lazyLoadComponent(() => import("./pages/RealEstateDashboard"), <Loader />);
const UpdateCompany = lazyLoadComponent(() => import('./pages/UpdateCompany'), <Loader />);
const RealEstateAgentLogin = lazyLoadComponent(() => import("./pages/RealEstateAgentLogin"), <Loader />);
const AgentDashboard = lazyLoadComponent(() => import("./pages/AgentDashboard"), <Loader />);
const AgentListings = lazyLoadComponent(() => import('./pages/AgentListings'), <Loader />);
const AddAgent = lazyLoadComponent(() => import('./pages/AddAgent'), <Loader />);
const AgentProfile = lazyLoadComponent(() => import('./pages/AgentProfile'), <Loader />);
const AgentDash = lazyLoadComponent(() => import('./pages/AgentDash'), <Loader />);
const RealEstateCompanies = lazyLoadComponent(() => import('./pages/RealEstateCompanies'), <Loader />);
const AgentCreateListing = lazyLoadComponent(() => import('./pages/AgentCreateListing'), <Loader />);
const AgentListing = lazyLoadComponent(() => import("./pages/AgentListing"), <Loader />);
const Messages = lazyLoadComponent(() => import('./pages/Messages'), <Loader />);
const LandlordProfile = lazyLoadComponent(() => import('./pages/LandlordProfile'), <Loader />);
const GeneratedCode = lazyLoadComponent(() => import('./pages/GeneratedCode'), <Loader />);
const VerifyCode = lazyLoadComponent(() => import('./pages/VerifyCode'), <Loader />);
const ResetPassword = lazyLoadComponent(() => import('./pages/ResetPassword'), <Loader />);
const Landing = lazyLoadComponent(() => import("./pages/Landing"), <Loader />);
const Agents = lazyLoadComponent(() => import('./pages/Agents'), <Loader />);
const SuperUser = lazyLoadComponent(() => import('./pages/SuperUser'), <Loader />);
const Notifications = lazyLoadComponent(() => import('./pages/Notifications'), <Loader />);
const Schedule = lazyLoadComponent(() => import('./pages/Schedule'), <Loader />);
const AgentSchedule = lazyLoadComponent(() => import('./pages/AgentSchedule'), <Loader />);
const Tutorials = lazyLoadComponent(() => import("./pages/Tutorials"), <Loader />);
const NeighborhoodGuides = lazyLoadComponent(() => import("./pages/NeighborhoodGuides"), <Loader />);

function HeaderWrapper() {
  const location = useLocation();
  const hideHeaderPaths = ['/superuser'];
  
  if (hideHeaderPaths.includes(location.pathname)) {
    return null;
  }
  
  return <Header />;
}

const App = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [isChatbotLoaded, setIsChatbotLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let intervalId;

    const checkUnreadNotifications = async () => {
      if (!currentUser) return;

      try {
        const res = await fetch('/api/notifications/unread/count', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch unread notifications');
        }

        const data = await res.json();
        setUnreadCount(data.count);
      } catch (error) {
        console.error('Error checking unread notifications:', error);
      }
    };

    if (currentUser) {
      // Check immediately
      checkUnreadNotifications();
      // Then check every 30 seconds
      intervalId = setInterval(checkUnreadNotifications, 30000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser]);

  const handleNotificationClose = () => {
    setUnreadCount(0);
  };

  useEffect(() => {
    const startSession = async () => {
      try {
        const res = await fetch('/api/session-analytics/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?._id })
        });
        const data = await res.json();
        sessionStorage.setItem('sessionId', data.sessionId);
        
        // Start page view tracking
        let lastPageViewTime = Date.now();
        
        const trackPageView = async () => {
          const sessionId = sessionStorage.getItem('sessionId');
          if (sessionId) {
            const currentTime = Date.now();
            const timeSpent = Math.round((currentTime - lastPageViewTime) / 1000);
            lastPageViewTime = currentTime;
            
            await fetch('/api/session-analytics/page-view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                page: window.location.pathname,
                timeSpent
              })
            });
          }
        };

        // Track page views on route changes
        const observer = new MutationObserver(trackPageView);
        observer.observe(document.body, { childList: true, subtree: true });

        // Cleanup function
        return () => {
          observer.disconnect();
          const sessionId = sessionStorage.getItem('sessionId');
          if (sessionId) {
            fetch('/api/session-analytics/end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });
            sessionStorage.removeItem('sessionId');
          }
        };
      } catch (error) {
        console.error('Error starting session:', error);
      }
    };

    startSession();
  }, [currentUser]);

  useEffect(() => {
    if (!isChatbotLoaded) {
      const script1 = document.createElement("script");
      script1.src = "https://cdn.botpress.cloud/webchat/v2.2/inject.js";
      script1.async = true;
      document.body.appendChild(script1);

      script1.onload = () => {
        const script2 = document.createElement("script");
        script2.src =
          "https://files.bpcontent.cloud/2024/12/11/21/20241211212011-RZ6GS430.js";
        script2.async = true;
        script2.onload = () => {
          if (window.botpressWebChat) {
            window.botpressWebChat.init({
              botId: "your-bot-id-here",
              hostUrl: "https://cdn.botpress.cloud/webchat/v2.2",
              showCloseButton: true,
              enableTranscriptDownload: true,
            });
          } else {
            console.error('Botpress WebChat not loaded properly');
          }
        };
        document.body.appendChild(script2);
      };

      setIsChatbotLoaded(true);
    }
  }, [isChatbotLoaded]);

  return (
    <BrowserRouter>
      <NotificationProvider>
        <HeaderWrapper unreadCount={unreadCount} onNotificationView={handleNotificationClose} />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/hero" element={<HeroSection />} /> {/* Full-fledged Hero Page */}
          <Route path="/landlords" element={<Landlords />} />
          <Route path="/landlord/:userId" element={<LandlordListings />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/tenant/:tenantId" element={<TenantProfile />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/about" element={<About />} />
          <Route path="/listing/:listingId" element={<Listing />} />
          <Route path="/agent-listing/:listingId" element={<AgentListing />} />
          <Route path="/search" element={<Search />} />
          <Route path="/real-estate-signup" element={<RealEstateSignUp />} />
          <Route path="/admin-sign-in" element={<AdminSignIn />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/real-estate-login" element={<RealEstateLogin />} />
          <Route path="/real-estate-dashboard" element={<RealEstateDashboard />} />
          <Route path="/update-company" element={<UpdateCompany />} />
          <Route path="/real-estate-agent-login" element={<RealEstateAgentLogin />} />
          <Route path="/agent/:agentId" element={<AgentProfile />} />
          <Route path="/agent/:agentId/listings" element={<AgentListings />} />
          <Route path="/add-agent" element={<AddAgent />} />
          <Route path="/real-estate-companies" element={<RealEstateCompanies />} />
          <Route path="/agent-create-listing" element={<AgentCreateListing />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/generated-code" element={<GeneratedCode />} />
          <Route path="/verify-code/:userId/:code" element={<VerifyCode />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/superuser" element={<SuperUser />} />
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/agent-listings/:agentId" element={<AgentListings />} />
          <Route path="/NeighborhoodGuides" element={<NeighborhoodGuides />} />
          <Route path="/companies" element={<RegisteredCompanies />} />
          <Route path="/company/:id" element={<CompanyDetails />} />
          <Route path="/contract" element={<Contract />} />
          <Route path="/sentcontracts" element={<SentContracts />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/landlord-profile" element={<LandlordProfile />} />
            <Route path="/create-listing" element={<CreateListing />} />
            <Route path="/update-listing/:listingId" element={<UpdateListing />} />
            <Route path="/agent-dashboard" element={<AgentDashboard />} />
            <Route path="/agent-dash" element={<AgentDash />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/agent-schedule" element={<AgentSchedule />} />
          </Route>
        </Routes>
        <NotificationPopup unreadCount={unreadCount} onClose={handleNotificationClose} />
        <Toaster 
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
