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
  });

  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const params = useParams();

  useEffect(() => {
    const fetchListing = async () => {
      const listingId = params.listingId;
      const res = await fetch(`/api/listing/get/${listingId}`);
      const data = await res.json();

      if (data.success === false) {
        console.log(data.message);
        return;
      }
      setFormData(data);
    };

    fetchListing();
  }, [params.listingId]);

  const handleImageSubmit = (e) => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(storeImage(files[i]));
      }
      Promise.all(promises)
        .then((urls) => {
          setFormData({
            ...formData,
            imageUrls: formData.imageUrls.concat(urls),
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
      setUploading(false);
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
    if (e.target.id === "sale" || e.target.id === "rent") {
      setFormData({ ...formData, type: e.target.id });
    } else if (
      e.target.id === "parking" ||
      e.target.id === "furnished" ||
      e.target.id === "offer"
    ) {
      setFormData({ ...formData, [e.target.id]: e.target.checked });
    } else {
      setFormData({ ...formData, [e.target.id]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.imageUrls.length < 1)
        return setError("You must upload at least one image");

      if (+formData.regularPrice < +formData.discountPrice)
        return setError("Discount price cannot be higher than regular price");

      setLoading(true);
      setError(false);

      const res = await fetch(`/api/listing/update/${params.listingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, userRef: currentUser._id }),
      });

      const data = await res.json();
      setLoading(false);
      if (data.success === false) return setError(data.message);

      navigate(`/listing/${data._id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">Update Listing</h1>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col gap-4 flex-1">
          <label>Name</label>
          <input
            type="text"
            placeholder="Name"
            id="name"
            required
            onChange={handleChange}
            value={formData.name}
            className="border p-3 rounded-lg"
          />
          <label>Description</label>
          <textarea
            placeholder="Description"
            id="description"
            required
            onChange={handleChange}
            value={formData.description}
            className="border p-3 rounded-lg"
          />
          <label>Address</label>
          <input
            type="text"
            placeholder="Address"
            id="address"
            required
            onChange={handleChange}
            value={formData.address}
            className="border p-3 rounded-lg"
          />

          {/* Options */}
          <div className="flex gap-6 flex-wrap">
            <div>
              <input
                type="checkbox"
                id="sale"
                onChange={handleChange}
                checked={formData.type === "sale"}
              />
              <span> Sell</span>
            </div>
            <div>
              <input
                type="checkbox"
                id="rent"
                onChange={handleChange}
                checked={formData.type === "rent"}
              />
              <span> Rent</span>
            </div>
            <div>
              <input
                type="checkbox"
                id="parking"
                onChange={handleChange}
                checked={formData.parking}
              />
              <span> Parking Spot</span>
            </div>
            <div>
              <input
                type="checkbox"
                id="furnished"
                onChange={handleChange}
                checked={formData.furnished}
              />
              <span> Furnished</span>
            </div>
            <div>
              <input
                type="checkbox"
                id="offer"
                onChange={handleChange}
                checked={formData.offer}
              />
              <span> Offer</span>
            </div>
          </div>

          {/* Inputs */}
          <div className="flex flex-wrap gap-6">
            <div>
              <label>Beds</label>
              <input
                type="number"
                id="bedrooms"
                min="1"
                required
                onChange={handleChange}
                value={formData.bedrooms}
                className="border p-3 rounded-lg"
              />
            </div>
            <div>
              <label>Baths</label>
              <input
                type="number"
                id="bathrooms"
                min="1"
                required
                onChange={handleChange}
                value={formData.bathrooms}
                className="border p-3 rounded-lg"
              />
            </div>
            <div>
              <label>Regular Price</label>
              <input
                type="number"
                id="regularPrice"
                min="50"
                required
                onChange={handleChange}
                value={formData.regularPrice}
                className="border p-3 rounded-lg"
              />
            </div>
            <div>
              <label>Discount Price</label>
              <input
                type="number"
                id="discountPrice"
                min="0"
                onChange={handleChange}
                value={formData.discountPrice}
                className="border p-3 rounded-lg"
              />
            </div>
            <div>
              <label>Size (m²)</label>
              <input
                type="number"
                id="m2"
                min="0"
                onChange={handleChange}
                value={formData.m2}
                className="border p-3 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <p className="font-semibold">Images:</p>
          {formData.imageUrls.map((url, index) => (
            <div key={url} className="flex justify-between p-3 border items-center">
              <img src={url} alt="listing" className="w-20 h-20 object-contain rounded-lg" />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
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
