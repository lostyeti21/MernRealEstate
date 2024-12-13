import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const Analytics = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/user/analytics/${currentUser._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchAnalytics();
  }, [currentUser]);

  if (error) {
    return <div className="text-red-700 text-center">{error}</div>;
  }

  if (!analytics) {
    return <div className="text-center">Loading analytics...</div>;
  }

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">Your Analytics</h1>
      <div className="border rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-3">Key Metrics</h2>
        <p>
          <strong>Clicks:</strong> {analytics.clicks}
        </p>
        <p>
          <strong>Views:</strong> {analytics.views}
        </p>
        <p>
          <strong>Listings:</strong> {analytics.listingsCount}
        </p>
        <p>
          <strong>Average Views per Listing:</strong>{" "}
          {analytics.averageViewsPerListing}
        </p>
        {/* Add more metrics as needed */}
      </div>
    </div>
  );
};

export default Analytics;
