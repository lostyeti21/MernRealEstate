const formatAddress = (address) => {
  if (!address) return '';
  
  // Preserve commas for address components and remove other special characters
  let formatted = address
    .replace(/[^\w\s,.-]/g, ' ')
    .replace(/\s*,\s*/g, ',') // Normalize spaces around commas
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Ensure components are properly separated
  formatted = formatted.split(',')
    .map(component => component.trim())
    .filter(component => component);

  // Known Harare suburbs for better geocoding
  const harareSuburbs = /(borrowdale|highlands|avondale|glen lorne|chisipite|mount pleasant|greendale|marlborough|gunhill|eastlea|westgate|belgravia|milton park|hatfield|mabelreign)/i;

  // Add country if not present
  if (!formatted.some(component => /zimbabwe/i.test(component))) {
    formatted.push('Zimbabwe');
  }

  // Add city for known Harare suburbs
  if (!formatted.some(component => /harare/i.test(component)) && 
      formatted.some(component => harareSuburbs.test(component))) {
    formatted.push('Harare');
  }

  // Ensure proper address structure for better geocoding
  const structuredAddress = formatted
    .filter((component, index, array) => {
      // Remove duplicate components
      return array.indexOf(component) === index;
    })
    .sort((a, b) => {
      // Sort components to follow standard address format
      if (/(zimbabwe)/i.test(a)) return 1;
      if (/(zimbabwe)/i.test(b)) return -1;
      if (/(harare)/i.test(a)) return 1;
      if (/(harare)/i.test(b)) return -1;
      return 0;
    });

  return structuredAddress.join(', ');
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const geocodeAddress = async (address) => {
  if (!address) {
    console.error("No address provided for geocoding");
    return null;
  }

  const formattedAddress = formatAddress(address);
  console.log("Formatted address for geocoding:", formattedAddress);

  const API_KEY = '154ef7c2ae4e45ed8ebf773edf692f88';
  if (!API_KEY) {
    console.error("Geoapify API key not found in environment variables");
    return null;
  }

  // Try with different address formats
  const addressVariations = [
    formattedAddress,
    `${formattedAddress}, Zimbabwe`,
    address.includes('Borrowdale') ? 'Borrowdale, Harare, Zimbabwe' : null
  ].filter(Boolean);

  for (const addressVariant of addressVariations) {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressVariant)}&format=json&apiKey=${API_KEY}`;
    
    const maxRetries = 2;
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(url);

        if (response.status === 429) {
          console.log("Rate limit reached, waiting before retry...");
          await delay(2000); // Wait longer for rate limit
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.results && data.results.length > 0) {
          const result = data.results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          console.log("Geocoded Coordinates:", { lat, lng, formatted: formattedAddress });
          return { lat, lng };
        }

        if (retries < maxRetries) {
          console.log(`Retry ${retries + 1} for address: ${formattedAddress}`);
          await delay(1000);
          retries++;
        } else {
          console.error("Geocoding failed: No results found for address:", formattedAddress);
          return null;
        }
      } catch (error) {
        if (retries < maxRetries) {
          console.log(`Error on attempt ${retries + 1}, retrying...`, error.message);
          await delay(1000);
          retries++;
        } else {
          console.error("Error during geocoding:", error);
          return null;
        }
      }
    }
  }

  return null;
};
  