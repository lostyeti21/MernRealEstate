import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import About from "./pages/About";
import Profile from "./pages/Profile";
import Header from "./components/Header";
import PrivateRoute from "./components/PrivateRoute";
import CreateListing from "./pages/CreateListing";
import UpdateListing from "./pages/UpdateListing";
import Listing from "./pages/Listing";
import Search from "./pages/Search";
import Landlords from "./pages/Landlords";
import Tenants from "./pages/Tenants";
import LandlordListings from "./pages/LandlordListings";
import TenantProfile from "./pages/TenantProfile";
import Analytics from "./pages/Analytics";
import ChangePassword from "./pages/ChangePassword";
import RealEstateSignUp from "./pages/RealEstateSignUp";
import AdminSignIn from "./pages/AdminSignIn";
import Admin from "./pages/Admin";
import HeroSection from "./pages/HeroSection";
import RealEstateLogin from "./pages/RealEstateLogin";
import RealEstateDashboard from "./pages/RealEstateDashboard";
import UpdateCompany from './pages/UpdateCompany';
import RealEstateAgentLogin from "./pages/RealEstateAgentLogin";
import AgentDashboard from "./pages/AgentDashboard";
import AgentListings from './pages/AgentListings';
import AddAgent from './pages/AddAgent';
import AgentProfile from './pages/AgentProfile';
import RealEstateCompanies from './pages/RealEstateCompanies';
import AgentCreateListing from './pages/AgentCreateListing';
import AgentListing from "./pages/AgentListing";
import Messages from './pages/Messages';
import LandlordProfile from './pages/LandlordProfile';
import GeneratedCode from './pages/GeneratedCode';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';
import Landing from "./pages/Landing";
import Agents from './pages/Agents';
import SuperUser from './pages/SuperUser';
import Notifications from './pages/Notifications';
import NotificationPopup from './components/NotificationPopup';
import Schedule from './pages/Schedule';

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
        <Route path="/messages" element={<Messages />} />
        <Route path="/generated-code" element={<GeneratedCode />} />
        <Route path="/verify-code/:userId/:code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/superuser" element={<SuperUser />} />
        <Route path="/agent-listings/:agentId" element={<AgentListings />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/landlord-profile" element={<LandlordProfile />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/agent-create-listing" element={<AgentCreateListing />} />
          <Route path="/update-listing/:listingId" element={<UpdateListing />} />
          <Route path="/agent-dashboard" element={<AgentDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/schedule" element={<Schedule />} />
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
    </BrowserRouter>
  );
};

export default App;
