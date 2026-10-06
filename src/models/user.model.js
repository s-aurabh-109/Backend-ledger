const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema({
  email :{
    type: String,
    required: [true,"Email is required"],
    unique:[true,"Email already exists"],
    trim:true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  name:{
    type:String,
    required:[true,"Name is required"],
  },
  password:{
    type:String,
    required:[true,"Password is required"],
    minlength:[8,"Password should contain at least 8 characters"],
    select:false //enforces secure by default by excluding it from any database query results by default
  },
  systemUser: { //Can only be modified who have the access of database.
    type:Boolean,
    default:false,
    immutable:true,
    select : false
  }
},{
  timestamps:true
})

userSchema.pre("save",async function(next){

  if(!this.isModified("password")){
    return
  }

  const hash = await bcrypt.hash(this.password,10)
  this.password = hash

  return
})

userSchema.methods.comparePassword = async function(password){
  return await bcrypt.compare(password,this.password)
}

const userModel = mongoose.model("user",userSchema)
module.exports = userModel