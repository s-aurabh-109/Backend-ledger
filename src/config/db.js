const mongoose = require("mongoose")



function connectToDB(){

  mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("server is connected to DB")
  })
  .catch(err=>{
    console.log("Error connecting to DB")
    process.exit(1) //if server doesn't connect with the database , then we simply close our server here
  })
}

module.exports = connectToDB