const express = require('express');
require('./db/mongoose'); // Just ensures that mongoose runs and connects to the database
const userRouter = require('./routers/user');
const taskRouter = require('./routers/task');

const app = express();
const port = process.env.PORT;

// To get the incoming json data, use app.use(express.json) to automatically convert the request body into json
app.use(express.json());

// Use the routers
app.use(userRouter);
app.use(taskRouter);

app.listen(port, () => {
    console.log(`Server Up on Port: ${port}`)
});

const Task = require('./models/task');
const User = require('./models/user');
