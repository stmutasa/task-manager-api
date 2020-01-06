const express = require('express');
const Task = require('../models/task');
const auth = require('../middleware/auth');
const router = new express.Router();

// For handling task creation requests
router.post('/tasks', auth, async (req, res) => {
    // copy in the request body then add the currently authenticated owner
    const task = new Task({
        ...req.body,
        owner: req.user._id
    });

    try {
        await task.save();
        res.status(201).send(task)
    } catch (e) {
        res.status(500).send(e)
    }
});

// fetch all tasks for this user. We want to be able to filter data here from the query string
router.get('/tasks', auth, async (req, res) => {
    const match = {};
    const sort = {};

    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split('_');
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        // Two ways to do this
        // const tasks = await Task.find({owner: req.user._id});
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                // parseint allows us to parse a string into an int
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate();
        res.send(req.user.tasks)
    } catch (e) {
        res.status(500).send(e)
    }
});

// fetch tasks by id
router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;

    try {
        const task = await Task.findOne({_id, owner: req.user._id});
        if (!task) { return res.status(404).send() }
        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
});

// Update tasks with patch
router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['completed', 'description'];
    // .every tests whether all elements in array pass the test implemented, returns bool
    const isUpdateValid = updates.every((update) => allowedUpdates.includes(update));
    if (!isUpdateValid) { return res.status(400).send({ error: "Update not allowed!"})}

    try {
        const task = await Task.findOne({_id: req.params.id, owner: req.user._id});
        if (!task) { return res.status(404).send() }
        // For each executes the provided function once for each array element
        updates.forEach((update) => task[update] = req.body[update]);
        await task.save();
        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
});

// Delete tasks
router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({_id: req.params.id, owner: req.user._id});
        if (!task) { return res.status(404).send() }
        res.status(203).send(task)
    } catch (e) {
        res.status(400).send(e)
    }
});

module.exports = router;