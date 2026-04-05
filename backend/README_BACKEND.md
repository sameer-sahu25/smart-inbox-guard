# Smart Inbox Guard - Backend

This is the production-grade Node.js/Express backend for the Smart Inbox Guard system. It handles user authentication, orchestrates communication with the ML service, manages the PostgreSQL database, and serves the frontend dashboard.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, express-rate-limit, bcryptjs
- **Validation**: express-validator

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your specific values, especially the `DATABASE_URL` for your Neon PostgreSQL instance.

3. **Start the Server**
   - Development mode (with nodemon):
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

## API Endpoints

### Health
- `GET /api/v1/health` - Check database and ML service connectivity.

### Authentication
- `POST /api/v1/auth/register` - Register a new user.
- `POST /api/v1/auth/login` - Authenticate and receive a JWT.
- `POST /api/v1/auth/logout` - Log out (creates an audit log).
- `GET /api/v1/auth/me` - Get current user profile.

### Analysis (Protected)
- `POST /api/v1/analyze` - Classify a single email.
- `POST /api/v1/analyze/batch` - Classify multiple emails (max 20).

### Dashboard (Protected)
- `GET /api/v1/dashboard/summary` - Get high-level summary stats.
- `GET /api/v1/dashboard/stats` - Get detailed classification counts.
- `GET /api/v1/dashboard/trend` - Get 14-day historical trend data.

### History (Protected)
- `GET /api/v1/history` - Get paginated history of analyzed emails.
- `GET /api/v1/history/:id` - Get details of a specific incident.
- `DELETE /api/v1/history/:id` - Delete a specific incident.

### Feedback (Protected)
- `POST /api/v1/feedback` - Submit a correction for a misclassified email.
- `GET /api/v1/feedback/stats` - Get user feedback statistics.

## Security Features
- Passwords are hashed using `bcryptjs` with a salt factor of 12.
- All protected routes require a valid JWT.
- Rate limiting is applied globally, with stricter limits on authentication and analysis endpoints.
- Input validation and sanitization prevent injection attacks.
- Comprehensive audit logging tracks all sensitive actions.
