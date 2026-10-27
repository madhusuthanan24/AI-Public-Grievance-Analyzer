/**
 * Role-based authorization middleware
 * Accepts an array of allowed roles or multiple string arguments:
 * e.g. roleCheck(['admin', 'officer']) or roleCheck('admin', 'officer')
 */
const roleCheck = (...args) => {
  const allowedRoles = Array.isArray(args[0]) ? args[0] : args;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User authentication required' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = roleCheck;
