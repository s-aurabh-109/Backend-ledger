# 🏦 Advanced Banking Transaction System

A backend REST API built with **Node.js**, **Express**, and **MongoDB** that simulates a real-world banking transaction system. It supports user authentication, bank account management, and secure money transfers with **ledger-based balance tracking** and **email notifications**.

---

## 🚀 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js + Express | Server & REST API |
| MongoDB + Mongoose | Database & ODM |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Nodemailer (Gmail OAuth2) | Email notifications |
| cookie-parser | Cookie handling |
| dotenv | Environment variables |

---

## 📁 Project Structure

```
07-AdvanceBankingTransaction/
├── server.js               # Entry point — loads env, connects DB, starts server
├── src/
│   ├── app.js              # Express app setup & route mounting
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── models/
│   │   ├── user.model.js       # User schema (name, email, password, systemUser flag)
│   │   ├── account.model.js    # Bank account schema + getBalance() method
│   │   ├── transaction.model.js# Transaction schema (PENDING/COMPLETED/FAILED/REVERSED)
│   │   ├── ledger.model.js     # Immutable ledger entries (DEBIT / CREDIT)
│   │   └── blacklist.model.js  # Blacklisted JWT tokens (for logout)
│   ├── controllers/
│   │   ├── auth.controller.js        # Register, Login, Logout
│   │   ├── account.controller.js     # Create account, list accounts, get balance
│   │   └── transaction.controller.js # Transfer funds, seed initial funds
│   ├── routes/
│   │   ├── auth.routes.js        # /api/auth/*
│   │   ├── account.routes.js     # /api/accounts/*
│   │   └── transaction.routes.js # /api/transactions/*
│   ├── middleware/
│   │   └── auth.middleware.js    # JWT auth guard + system-user guard
│   └── services/
│       └── email.service.js      # Nodemailer email templates
```

---

## ⚙️ Setup & Installation

### 1. Clone the repo & install dependencies

```bash
npm install
```

### 2. Create a `.env` file in the root

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Gmail OAuth2 credentials for Nodemailer
EMAIL_USER=your_gmail@gmail.com
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REFRESH_TOKEN=your_google_refresh_token
```

### 3. Run the server

```bash
# Development (with auto-restart via nodemon)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:3000`

---

## 📡 API Endpoints

### 🔐 Auth — `/api/auth`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| POST | `/register` | Register a new user | No |
| POST | `/login` | Login and receive JWT token | No |
| POST | `/logout` | Logout and blacklist token | Yes |

### 🏦 Accounts — `/api/accounts`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| POST | `/` | Create a new bank account | Yes |
| GET | `/` | Get all accounts of the logged-in user | Yes |
| GET | `/balance/:accountId` | Get balance of a specific account | Yes |

### 💸 Transactions — `/api/transactions`

| Method | Route | Description | Auth Required |
|---|---|---|---|
| POST | `/` | Transfer money between two accounts | Yes (User) |
| POST | `/system/initial-funds` | Seed initial funds into an account | Yes (System User) |

---

## 🔑 Key Concepts

### Ledger-Based Balance
Account balances are **not stored directly** on the account. Instead, every money movement creates an immutable **ledger entry** (DEBIT or CREDIT). The balance is always **calculated on the fly** by summing ledger entries using a MongoDB aggregation pipeline.

### 10-Step Transaction Flow
When a transfer is made, the system follows a strict sequence:

1. Validate request fields
2. Check **idempotency key** (prevents duplicate transactions)
3. Verify both accounts are **Active**
4. Compute sender's balance from the ledger
5. Create transaction record as **PENDING**
6. Write **DEBIT** ledger entry for the sender
7. Write **CREDIT** ledger entry for the receiver
8. Mark transaction as **COMPLETED**
9. **Commit** the MongoDB session (all-or-nothing)
10. Send **email notifications** to both parties

> If any step inside the database session fails, the entire transaction is **rolled back** automatically using MongoDB sessions.

### Idempotency
Each transaction requires a unique `idempotencyKey`. If the same key is sent again, the API returns the existing result instead of creating a duplicate — safe to retry on network failures.

### Immutable Ledger
Ledger entries **cannot be updated or deleted** — Mongoose pre-hooks block all modification operations, ensuring a tamper-proof financial record.

### JWT Blacklisting (Logout)
On logout, the user token is stored in a blacklist collection. Every protected route checks against this blacklist before proceeding.

### System User
A special `systemUser` flag on the User model allows seeding initial funds into accounts. The `authSystemUserMiddleware` gate-keeps this privileged route.

---

## 📧 Email Notifications

Emails are sent via **Gmail OAuth2** using Nodemailer for:

- ✅ Successful registration
- 💸 Amount debited from sender
- 💰 Amount credited to receiver
- ❌ Debit transaction failure

Email failures are logged but **do not roll back** a completed transaction.

---

## 📝 Notes

- All protected routes require a JWT either as a **cookie** (`token`) or in the `Authorization: Bearer <token>` header.
- Account status can be `Active`, `Frozen`, or `Closed` — only `Active` accounts can send/receive money.
- The default currency is **INR**.
