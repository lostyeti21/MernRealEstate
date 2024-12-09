import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TenantProfile = () => {
  const { tenantId } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState({
    maintenance: 0,
    behavior: 0,
    payments: 0,
  });
  const [hoveredRating, setHoveredRating] = useState({
    maintenance: 0,
    behavior: 0,
    payments: 0,
  });
  const [rated, setRated] = useState(false);

  useEffect(() => {
    const fetchTenantDetails = async () => {
      try {
        const resTenant = await fetch(`/api/user/${tenantId}`);
        const tenantData = await resTenant.json();
        if (!resTenant.ok) throw new Error("Failed to fetch tenant details");

        setTenant(tenantData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantDetails();
  }, [tenantId]);

  const fetchUpdatedTenant = async () => {
    try {
      const res = await fetch(`/api/user/${tenantId}`);
      const updatedTenant = await res.json();
      if (res.ok) {
        setTenant(updatedTenant);
      } else {
        throw new Error("Failed to fetch updated tenant data");
      }
    } catch (error) {
      console.error("Error fetching updated tenant data:", error);
    }
  };

  const isValidRating = (rating) => rating >= 1 && rating <= 5;

  const handleRating = async () => {
    const { maintenance, behavior, payments } = ratings;

    if (
      !isValidRating(maintenance) ||
      !isValidRating(behavior) ||
      !isValidRating(payments)
    ) {
      alert("Each rating must be a valid number between 1 and 5.");
      return;
    }

    const totalRating = (
      (maintenance + behavior + payments) /
      3
    ).toFixed(1);

    try {
      const res = await fetch("/api/user/rate-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          tenantId,
          maintenance,
          behavior,
          payments,
          averageRating: parseFloat(totalRating),
        }),
      });

      if (res.ok) {
        setRated(true);
        await fetchUpdatedTenant();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit rating");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const renderRatingStars = (category) => {
    const categoryRating = ratings[category] || 0;
    const hoveredCategoryRating = hoveredRating[category] || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i + 1}
        onClick={() => setRatings({ ...ratings, [category]: i + 1 })}
        onMouseEnter={() =>
          setHoveredRating({ ...hoveredRating, [category]: i + 1 })
        }
        onMouseLeave={() =>
          setHoveredRating({ ...hoveredRating, [category]: 0 })
        }
        className={`cursor-pointer ${
          i + 1 <= (hoveredCategoryRating || categoryRating)
            ? "text-yellow-500"
            : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  const renderTenantRating = (avgRating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i + 1}
        className={`text-xl ${i + 1 <= avgRating ? "text-yellow-500" : "text-gray-300"}`}
      >
        ★
      </span>
    ));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img
            src={tenant.avatar || "https://via.placeholder.com/150"}
            alt={tenant.username}
            className="rounded-full w-32 h-32 object-cover"
          />
          <h1 className="text-3xl font-bold">{tenant.username}</h1>
        </div>
        <div>
          <span className="mr-2 text-xl font-semibold">Rating:</span>
          <div className="flex text-xl">
            {tenant.averageRating
              ? renderTenantRating(tenant.averageRating)
              : "No ratings yet"}
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold mb-4">Rate this Tenant</h3>
        <div className="p-6 border-2 border-gray-300 rounded-lg bg-gray-100 inline-block">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <h4>Maintenance</h4>
              <div className="flex">{renderRatingStars("maintenance")}</div>
            </div>
            <div className="text-center">
              <h4>Behavior</h4>
              <div className="flex">{renderRatingStars("behavior")}</div>
            </div>
            <div className="text-center">
              <h4>Payments</h4>
              <div className="flex">{renderRatingStars("payments")}</div>
            </div>
          </div>
          <div className="mt-4">
            <h4>
              Total Rating:{" "}
              {(
                (ratings.maintenance + ratings.behavior + ratings.payments) /
                3
              ).toFixed(1)}{" "}
              / 5.0
            </h4>
          </div>
          <div className="mt-6">
            <button
              onClick={handleRating}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              Submit Rating
            </button>
          </div>
        </div>
        {rated && <p className="text-lg mt-4">Thank you for your rating!</p>}
      </div>
    </div>
  );
};

export default TenantProfile;
