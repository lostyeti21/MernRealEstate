import { useEffect, useState } from "react";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "../firebase.js";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

const UpdateListing = () => {
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    imageUrls: [],
    name: "",
    description: "",
    address: "",
    type: "rent",
    bedrooms: 1,
    bathrooms: 1,
    regularPrice: 50,
    discountPrice: 0,
    m2: 0,
    offer: false,
    parking: false,
    furnished: false,
    backupPower: false, // Existing field
    backupWaterSupply: false, // Existing field
    boreholeWater: false, // Added field
  });

  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const params = useParams();
  const [agentInfo, setAgentInfo] = useState(null);

  useEffect(() => {
    const storedAgentInfo = localStorage.getItem('agentInfo');
    if (storedAgentInfo) {
      setAgentInfo(JSON.parse(storedAgentInfo));
    }
  }, []);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingId = params.listingId;
        console.log('Fetching listing:', listingId);

        const headers = {};
        const agentToken = localStorage.getItem('agentToken');
        if (agentToken) {
          headers['Authorization'] = `Bearer ${agentToken}`;
        }

        const res = await fetch(`/api/listing/get/${listingId}`, { headers });
        const data = await res.json();

        if (!res.ok) {
          console.error('Failed to fetch listing:', data);
          setError(true);
          return;
        }

        console.log('Fetched listing data:', data);
        setFormData({
          ...data,
          imageUrls: data.imageUrls || [],
        });
      } catch (error) {
        console.error('Error fetching listing:', error);
        setError(true);
      }
    };

    fetchListing();
  }, [params.listingId]);

  const handleImageSubmit = () => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = files.map((file) => storeImage(file));

      Promise.all(promises)
        .then((urls) => {
          setFormData({
            ...formData,
            imageUrls: [...formData.imageUrls, ...urls],
          });
          setImageUploadError(false);
          setUploading(false);
        })
        .catch(() => {
          setImageUploadError("Image upload failed. (2 mb max per image)");
          setUploading(false);
        });
    } else {
      setImageUploadError("You can only upload 6 images per listing");
    }
  };

  const storeImage = async (file) => {
    return new Promise((resolve, reject) => {
      const storage = getStorage(app);
      const fileName = new Date().getTime() + file.name;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        null,
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(resolve);
        }
      );
    });
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
    });
  };

  const handleChange = (e) => {
    const { id, type, checked, value } = e.target;
    if (["sale", "rent"].includes(id)) {
      setFormData({ ...formData, type: id });
    } else if (
      ["parking", "furnished", "offer", "backupPower", "backupWaterSupply", "boreholeWater"].includes(
        id
      )
    ) {
      setFormData({ ...formData, [id]: checked });
    } else if (["number", "text", "textarea"].includes(type)) {
      setFormData({ ...formData, [id]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(false);

      const isAgent = Boolean(agentInfo && localStorage.getItem('agentToken'));
      const userRef = isAgent ? agentInfo._id : currentUser?._id;
      const userModel = isAgent ? 'Agent' : 'User';

      if (!userRef) {
        throw new Error('No valid user reference found');
      }

      const headers = {
        'Content-Type': 'application/json'
      };

      if (isAgent) {
        const agentToken = localStorage.getItem('agentToken');
        if (!agentToken) {
          throw new Error('Agent token not found');
        }
        headers['Authorization'] = `Bearer ${agentToken}`;
      }

      const res = await fetch(`/api/listing/update/${params.listingId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          userRef,
          userModel
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      navigate(`/listing/${data._id}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">Update Listing</h1>
      {error && <p className="text-red-700 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col gap-4 flex-1">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            placeholder="Name"
            required
            className="border p-3 rounded-lg"
            onChange={handleChange}
            value={formData.name}
          />

          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            placeholder="Description"
            required
            className="border p-3 rounded-lg"
            onChange={handleChange}
            value={formData.description}
          />

          <label htmlFor="address">Address</label>
          <input
            type="text"
            id="address"
            placeholder="Address"
            required
            className="border p-3 rounded-lg"
            onChange={handleChange}
            value={formData.address}
          />

          <label>Amenities</label>
          <div className="flex flex-wrap gap-4">
            {["parking", "furnished", "offer", "backupPower", "backupWaterSupply", "boreholeWater"].map((amenity) => (
              <div className="flex gap-2" key={amenity}>
                <input
                  type="checkbox"
                  id={amenity}
                  className="w-5"
                  onChange={handleChange}
                  checked={formData[amenity]}
                />
                <span>{amenity.replace(/([A-Z])/g, " $1")}</span>
              </div>
            ))}
          </div>

          <label>Details</label>
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                min="1"
                placeholder="Beds"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.bedrooms}
              />
            </div>
            <div>
              <label htmlFor="bathrooms">Bathrooms</label>
              <input
                type="number"
                id="bathrooms"
                min="1"
                placeholder="Baths"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.bathrooms}
              />
            </div>
            <div>
              <label htmlFor="regularPrice">Regular Price</label>
              <input
                type="number"
                id="regularPrice"
                min="50"
                placeholder="Regular Price"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.regularPrice}
              />
            </div>
            <div>
              <label htmlFor="discountPrice">Discount Price</label>
              <input
                type="number"
                id="discountPrice"
                min="0"
                placeholder="Discount Price"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.discountPrice}
              />
            </div>
            <div>
              <label htmlFor="m2">Area (m²)</label>
              <input
                type="number"
                id="m2"
                min="0"
                placeholder="m²"
                className="p-3 border rounded-lg"
                onChange={handleChange}
                value={formData.m2}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <label>Images</label>
          {formData.imageUrls.map((url, index) => (
            <div
              key={url}
              className="flex justify-between p-3 border items-center"
            >
              <img
                src={url}
                alt="listing"
                className="w-20 h-20 object-contain rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={handleImageSubmit}
            className="p-3 bg-green-500 text-white rounded-lg"
          >
            {uploading ? "Uploading..." : "Upload Images"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="p-3 bg-blue-500 text-white rounded-lg"
          >
            {loading ? "Updating..." : "Update Listing"}
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </form>
    </main>
  );
};

export default UpdateListing;
