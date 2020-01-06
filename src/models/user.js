const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./task');

// Define a schema for the model
const userSchema = new mongoose.Schema({
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) { if (value.toLowerCase().includes('password')) {throw new Error('Password cannot be password')}}
    },
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        default: 0,
        trim: true,
        validate(value) { if (value < 0) {throw new Error('Age must be positive')}}
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {if (!validator.isEmail(value)) { throw new Error('Email is not valid')}}

    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
});
// Define some schema tokens below

// Create a virtual property. A relationship between between our user and our task. Not stored in the database
userSchema.virtual('tasks', {
    // Reference to the task model
    ref: 'Task',
    // localfield is where the local data is stored
    localField: '_id',
    // foreignfield the name of the field on the other thing (task) that's going to create the relationship
    foreignField: 'owner'
    // We created a virtual relationship between the owner of the Task and the userid of the User
});

// Methods methods are accessible by instances of the model
userSchema.methods.generateAuthToken = async function () {
    // This gets called on a user instance so make sure we bind this to that instance
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, 'thisisboss');
    // add the generated token to the database
    user.tokens = user.tokens.concat({ token });
    await user.save();
    return token
};

// toJSON is runs when objects get stringified
userSchema.methods.toJSON = function () {
    const user = this;
    // get just raw profile data
    const userObject = user.toObject();

    // Delete the items you don't want sent back. Private items and large items like images
    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;

    return userObject
};

// Custom user model function to allow users to login
// Statics methods are accessible on the model
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email});

    // throw new error immediately stops execution of code and returns the err
    if (!user) {throw new Error('Unable to login')}

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) { throw new Error('Unable to login')}

    return user
};

// Use method to insert middleware into the schema to handle hashing of passwords pre or post.
// Use standard function because arrow functions don't bind this
userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next();
});

// Delete user tasks when user is removed using the userschema.pre middleware for this model
userSchema.pre('remove', async function (next) {
    const user = this;
    await Task.deleteMany({ owner: user._id});
    // Must call next to move forward
    next();
});

// We will create a basic user and task model. Can set up custom validator
const User = mongoose.model('User', userSchema);

module.exports = User;