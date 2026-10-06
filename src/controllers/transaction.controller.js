const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const emailService = require("../services/email.service")
const accountModel = require("../models/account.model")
const mongoose = require("mongoose")

/**
 * -Create a new transaction
 * The 10-step TRANSFER FLOW:
          * 1. Validate request
          * 2. Validate the idempotency key
          * 3. Check account status
          * 4. Derive sender balance from ledger
          * 5. Create transaction (PENDING)
          * 6. Create DEBIT ledger entry
          * 7. Create CREDIT ledger entry
          * 8. Mark transaction COMPLETED
          * 9. Commit MongoDB session
          * 10. Send email notification
 */


async function createTransaction(req, res) {
  try {
    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({
        message: "fromAccount, toAccount, amount, idempotencyKey are required",
      });
    }

    // Populate user details so you have access to email and name for notifications
    const fromUserAccount = await accountModel.findOne({ _id: fromAccount }).populate("user");
    const toUserAccount = await accountModel.findOne({ _id: toAccount }).populate("user");

    if (!fromUserAccount || !toUserAccount) {
      return res.status(400).json({
        message: "Invalid fromAccount or toAccount",
      });
    }

    /**
     * 2. Validate Idempotency Key
     */
    const existingTransaction = await transactionModel.findOne({ idempotencyKey });

    if (existingTransaction) {
      if (existingTransaction.status === "COMPLETED") {
        return res.status(200).json({
          message: "Transaction already processed",
          transaction: existingTransaction,
        });
      }

      if (existingTransaction.status === "PENDING") {
        return res.status(200).json({
          message: "Transaction is still processing",
        });
      }

      if (["FAILED", "REVERSED"].includes(existingTransaction.status)) {
        return res.status(500).json({
          message: `Transaction ${existingTransaction.status.toLowerCase()}, please retry`,
        });
      }
    }

    /**
     * 3. Check Account Status
     */
    if (fromUserAccount.status !== "Active" || toUserAccount.status !== "Active") {
      return res.status(400).json({
        message: "Both fromAccount and toAccount must be Active to process transaction",
      });
    }

    /**
     * 4. Derive and check the sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance();

    if (balance < amount) {
      return res.status(400).json({
        message: `Insufficient balance. Current balance is ${balance}, requested amount is ${amount}`,
      });
    }

    /**
     * Database Transaction
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    let transaction;

    try {
      // 5. Create transaction (PENDING)
      const [createdTx] = await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING",
          },
        ],
        { session }
      );
      
      transaction = createdTx;

      // 6. Create DEBIT ledger entry
      await ledgerModel.create(
        [
          {
            account: fromAccount,
            amount,
            transaction: transaction._id,
            type: "DEBIT",
          },
        ],
        { session }
      );

        //Just to check what happen if we implement a promise of 100 sec in between the debit and credit ledger entry.

        await (() => {
          return new Promise((resolve) => setTimeout(resolve,40000))
        })()

      // 7. Create CREDIT ledger entry
      await ledgerModel.create(
        [
          {
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "CREDIT",
          },
        ],
        { session }
      );

      // 8. Mark Transaction COMPLETED
      transaction.status = "COMPLETED";
      await transaction.save({ session });

      // 9. Commit MongoDB session
      await session.commitTransaction();
    } catch (dbError) {
      await session.abortTransaction();
      throw dbError;
    } finally {
      session.endSession();
    }

    /**
     * 10. Send Email Notifications (Outside session)
     */
    try {
      // Receiver email
      await emailService.sendCreditTransactionEmail(
        toUserAccount.user.email,
        toUserAccount.user.name,
        amount,
        toAccount
      );

      // Sender email
      await emailService.sendDebitTransactionEmail(
        fromUserAccount.user.email,
        fromUserAccount.user.name,
        amount,
        fromAccount
      );
    } catch (emailErr) {
      // Log email failure without rolling back or failing the completed transaction response
      console.error("Failed to send transaction notification emails:", emailErr);
    }

    return res.status(201).json({
      message: "Transaction completed successfully",
      transaction,
    });
  } catch (err) {
    console.error("Transaction Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function createInitialFundsTransaction(req,res){
  const {toAccount, amount, idempotencyKey} = req.body

  if (!toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({
        message: "toAccount, amount and idempotencyKey are required",
      });
  }

  const toUserAccount = await accountModel.findOne({
    _id:toAccount
  })

  if(!toUserAccount){
    return res.status(400).json({
        message: "Invalid toAccount",
      })
  }

  const fromUserAccount = await accountModel.findOne({
    user: req.user._id
  })

  if(!fromUserAccount){
    return res.status(400).json({
      message:"System user account not found"
    })
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status:"PENDING"
  })

  const debitLedgerEntry = await ledgerModel.create([{
    account: fromUserAccount._id,
    amount:amount,
    transaction:transaction._id,
    type:"DEBIT"
  }],{session})

  const creditLedgerEntry = await ledgerModel.create([{
    account: toUserAccount._id,
    amount:amount,
    transaction:transaction._id,
    type:"CREDIT"
  }],{session})

  transaction.status = "COMPLETED"
  await transaction.save({session})

  await session.commitTransaction()
  session.endSession()

  return res.status(201).json({
    message:"Initial funds transaction completed successfully",
    transaction: transaction
  })

}

module.exports = {
  createTransaction,
  createInitialFundsTransaction
}