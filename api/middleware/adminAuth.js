import jwt from 'jsonwebtoken';

export const adminAuth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified.isAdmin) return res.status(403).json({ error: 'Admin privileges required.' });
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};
