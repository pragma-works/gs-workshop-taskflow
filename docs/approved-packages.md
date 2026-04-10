# Approved Packages

| Package | Version range | Purpose | Alternatives rejected | Rationale | Audit status |
|---|---|---|---|---|---|
| @prisma/client | ^5.0.0 | Data access | sequelize, typeorm | Type-safe client and migrations fit the project | Pending repo audit |
| express | ^4.18.2 | HTTP API routing | restify | Stable ecosystem and middleware model | Pending repo audit |
| jsonwebtoken | ^9.0.0 | JWT auth | jwt-simple | Actively maintained and security fixes in current major | Pending repo audit |
| bcryptjs | ^2.4.3 | Password hashing (current baseline) | plain hashing | Keeps compatibility with existing seeded users | Pending repo audit |
