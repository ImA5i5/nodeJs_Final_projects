// app/middleware/apiRole.middleware.js

class ApiRoleMiddleware {
  /**
   * ✅ Allow only specific roles to access API route
   * Example: Role.allow("admin")
   */
  static allow(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: no user context" });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      next();
    };
  }
}

module.exports = ApiRoleMiddleware;
