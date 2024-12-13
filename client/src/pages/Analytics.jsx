import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Analytics = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/user/analytics/${currentUser._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch analytics data");
        }

        setAnalyticsData(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentUser._id]);

  if (loading) {
    return <p className="text-center text-lg">Loading analytics...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-5">Your Insights</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Summary Metrics */}
        <div className="p-5 border rounded-lg shadow">
          <h2 className="text-2xl font-semibold text-gray-700">Summary</h2>
          <p className="mt-2 text-lg">Total Listings: {analyticsData.totalListings}</p>
          <p className="mt-2 text-lg">Total Views: {analyticsData.totalViews}</p>
          <p className="mt-2 text-lg">Total Clicks: {analyticsData.totalClicks}</p>
        </div>

        {/* Listing Performance */}
        <div className="p-5 border rounded-lg shadow">
          <h2 className="text-2xl font-semibold text-gray-700">Top Performing Listings</h2>
          {analyticsData.topListings.length > 0 ? (
            <ul className="mt-3">
              {analyticsData.topListings.map((listing) => (
                <li key={listing.id} className="flex justify-between mt-2">
                  <span className="text-gray-800">{listing.name}</span>
                  <span className="text-green-700">{listing.views} Views</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-gray-500">No listings found</p>
          )}
        </div>
      </div>

      {/* Engagement Over Time */}
      <div className="p-5 mt-5 border rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-gray-700">Engagement Over Time</h2>
        <p className="mt-2 text-lg">Coming soon: Analytics graphs showing engagement trends.</p>
      </div>
    </div>
  );
};

export default Analytics;
