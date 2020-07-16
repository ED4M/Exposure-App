const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  name: {
    first: String,
    last: String,
    middle: String
  },
  email: String,
  role: String,
});

userSchema.set('toJSON', {
  transform: (doc, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('User', userSchema);