# Shopify Analytics Dashboard

A **multi-tenant Shopify analytics dashboard** built with **Node.js**, **Express**, **Sequelize ORM**, **PostgreSQL**, and **React**.  
Handles Shopify webhooks, real-time updates via Socket.IO, and dynamic revenue reporting.

---

## Features

- **Multi-tenant support**: Each Shopify store isolated by `tenant_id`.  
- **Webhook handling**: Create, update, delete events for orders, customers, products, and checkouts.  
- **Real-time updates**: Push events to frontend via Socket.IO.  
- **Revenue trends**: Interactive charts with selectable date ranges.  
- **Database-safe**: Uses Sequelize ORM with `upsert`/`ON CONFLICT` for safe inserts/updates.  
- **Environment-safe**: `.env` configuration for API secrets, database, and frontend URL.

---

## Tech Stack

- **Backend**: Node.js, Express, Sequelize ORM, PostgreSQL  
- **Frontend**: React, TailwindCSS, Chart.js (LineChart component)  
- **Real-time**: Socket.IO  
- **Deployment-ready**: `.env` configurations, `.gitignore` for sensitive files  

---

## Project Structure

shopify-analytics-dashboard/
├── backend/ # Node.js + Express backend
│ ├── controllers/ # Shopify webhook handlers
│ ├── models/ # Sequelize models
│ ├── config/ # DB and environment configs
│ ├── routes/ # API routes
│ └── server.js # Entry point
├── Frontend/ # React frontend
│ ├── components/ # UI components
│ ├── api/ # API hooks
│ └── pages/ # Page components (RevenueTrendsPage, etc.)
├── .gitignore
├── .gitattributes
└── README.md

yaml
Copy code

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Sheshaadhri14/shopify-analytics-dashboard.git
cd shopify-analytics-dashboard
2. Install dependencies
Backend:

bash
Copy code
cd backend
npm install
Frontend:

bash
Copy code
cd ../Frontend
npm install
3. Configure environment variables
Create a .env file in backend/:

dotenv
Copy code
PORT=5000
DATABASE_URL=postgres://username:password@localhost:5432/db_name
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:5173
4. Run the backend
bash
Copy code
cd backend
npm run dev
5. Run the frontend
bash
Copy code
cd Frontend
npm run dev
6. Access the dashboard
Open your browser at: http://localhost:5173

Database Setup
Ensure PostgreSQL is installed and running.

Create a database:

sql
Copy code
CREATE DATABASE shopify_analytics;
Run migrations (if applicable) or let Sequelize sync models.

Notes
Webhooks require raw body parsing; Shopify app should point to /api/v1/webhooks.

The emitWebhook function pushes updates to connected tenants in real-time.

Use .gitignore to avoid committing sensitive files like .env or node_modules.

License
MIT License © 2025 Sheshaadhri

yaml
Copy code

---

I can also make a **more visually appealing version with badges, screenshots, and command examples** if you want to make it look professional for GitHub.  

Do you want me to do that?







Ask ChatGPT
