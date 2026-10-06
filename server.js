require("dotenv").config()
/* it's simply a shorthand of two steps
 1. const dotenv = require("dotenv")
 2. dotenv.config() //function calling to parses the .env file and attaches the key-value paris to process.env
 */

const app = require("./src/app")
const connectToDB = require("./src/config/db")

connectToDB()
app.listen(3000,() => {    //to satart the server
  console.log("Server is running on port 3000")
})