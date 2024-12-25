import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Analytics from "./components/Analytics";
import ChangePassword from "./pages/ChangePassword";
import RealEstateSignUp from "./pages/RealEstateSignUp";
import AdminSignIn from "./pages/AdminSignIn";
import Admin from "./pages/Admin";
import HeroSection from "./pages/HeroSection";// Import the HeroSection component
import RealEstateLogin from "./pages/RealEstateLogin";
import RealEstateDashboard from "./pages/RealEstateDashboard";
import UpdateCompany from './pages/UpdateCompany';
import RealEstateAgentLogin from "./pages/RealEstateAgentLogin";
import AgentDashboard from "./pages/AgentDashboard";
import AgentListings from './pages/AgentListings';
import AddAgent from './pages/AddAgent';
import AgentProfile from './pages/AgentProfile';
import RealEstateCompanies from './pages/RealEstateCompanies';

const App = () => {
  return (
    <BrowserRouter>
      <Header />
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
        <Route path="/agent/:agentId/listings" element={<AgentListings />} />
        <Route path="/add-agent" element={<AddAgent />} />
        <Route path="/real-estate-companies" element={<RealEstateCompanies />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/update-listing/:listingId" element={<UpdateListing />} />
          <Route path="/agent-dashboard" element={<AgentDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
