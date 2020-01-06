const express = require('express');
const User = require('../models/user');
const auth = require('../middleware/auth');
const router = new express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { sendWelcomeEmail, sendCancelEmail } = require('../emails/account');

// For handling user creation requests
router.post('/users', async (req, res) => {
    const user = new User(req.body);
    const token = await user.generateAuthToken();

    try {
        await user.save();
        sendWelcomeEmail(user.email, user.name);
        res.status(201).send({ user, token})
    } catch (e) {
        res.status(400).send(e)
    }
});

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        // Don't want
        res.send( {user, token })
    } catch (e) {
        res.status(400).send()
    }
});

// Logout of all tokens
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        // Wipe tokens array
        req.user.tokens = [];
        await req.user.save();
        res.send()
    } catch (e) {
        res.status(500).send()
    }
});

// Logout of this specific session
router.post('/users/logout', auth, async  (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        });
        await req.user.save();

        res.send()
    } catch (e) {
        res.status(500).send()
    }
});

// Find a specific user
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
});

// Updating resources is done with patch
router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) { return res.status(400).send({ error: 'Invalid update!' })}

    try {
        updates.forEach((update) => req.user[update] = req.body[update]);
        await req.user.save();
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
});

// Delete users
router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove();
        sendCancelEmail(user.email, user.name);
        res.status(203).send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
});

const upload = multer({
    limits: {
        fileSize: 1e6
    },
    // Set up a file filter
    fileFilter(req, file, cb) {
        // string.match allows you to do a regex search of a string
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb('Please upload a J-peg or PNG image')
        }
        cb(undefined, true)
    }
});

// Make sure we set up the route handle to handle errors by including the error function at the end of the route handler call
router.post('/users/me/avatar', auth, upload.single('upload'), async (req, res) => {
    // Sharp will edit the image and save it in a buffer
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
    // Save the file binary into the user
    req.user.avatar = buffer;
    await req.user.save();

    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message})
});

// Delete the avatar route
router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.send()
});

// To serve up an image
router.get('/users/:id/avatar', async (req, res) => {
    // Might not find the image
    try {
        const user = await User.findById(req.params.id);

        if (!user || !user.avatar) {
            // Stop execution here and run catch block
            throw new Error()
        }
        // Setup a response header. Usually express makes it a json
        res.set('Content-Type', 'image/png');
        res.send(user.avatar)

    } catch (e) {
        res.status(404).send()
    }
});

module.exports = router;