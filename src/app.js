const express = require('express')
const cookieParser = require("cookie-parser")

const app = express(); //Server instance is being stored in app

app.use(express.json())
app.use(cookieParser())

/**
 * Routes requires
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRouter = require("./routes/transaction.routes")

app.get("/",(req,res) => {
  res.send("Ledger Services is up and running")
})

/**
 * Use Routes
 */
app.use("/api/auth",authRouter)
app.use("/api/accounts",accountRouter)
app.use("/api/transactions",transactionRouter)

module.exports = app