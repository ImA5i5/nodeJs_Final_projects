// app/middleware/role.middleware.js
class RoleMiddleware {
  static authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).render("pages/auth/login", {
          message: "Please log in to continue.",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).render("pages/error/403", {
          message: "Access denied. Insufficient permissions.",
        });
      }

      next();
    };
  }
}

module.exports = RoleMiddleware;
