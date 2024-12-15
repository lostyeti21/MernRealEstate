export const validateAddLinkedAccounts = (req, res, next) => {
    const { companyName, email, password, agents } = req.body;
  
    // Check for missing fields
    if (!companyName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "companyName, email, and password are required fields.",
      });
    }
  
    // Validate data types
    if (typeof companyName !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid data type. companyName, email, and password must be strings.",
      });
    }
  
    // Validate agents array (if present)
    if (agents && !Array.isArray(agents)) {
      return res.status(400).json({
        success: false,
        message: "Agents must be an array of objects.",
      });
    }
  
    // If validation passes, move to the next middleware/controller
    next();
  };
  