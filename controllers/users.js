const usersRouter = require('express').Router();
const bcrypt = require('bcrypt');
const User = require('../models/user.js');

usersRouter.get('/', async (req, res) => {
  const { role, attached } = req.query;
  const filter = (role || attached)
    ? { role, attachedToPlan: attached } : null;

  const users = await User.find(filter);
  res.json(users);
});

usersRouter.get('/:id', async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (user) {
    res.json(user);
  } else {
    res.status(404).end();
  }
});

usersRouter.post('/', async (req, res) => {
  const body = req.body;

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(body.password, saltRounds);

  const user = new User({
    username: body.username,
    name: body.name,
    email: body.email,
    role: body.role || 'employee',
    attachedToPlan: body.attachedToPlan || false,
    passwordHash
  });

  const savedUser = await user.save();
  res.json(savedUser);
});

usersRouter.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

usersRouter.put('/:id', async (req, res) => {
  const body = req.body;

  const user = {
    username: body.username,
    name: body.name,
    email: body.email,
    role: body.role,
    attachedToPlan: body.attachedToPlan
  };

  const updatedUser = await User.findByIdAndUpdate(req.params.id, user, { new: true });
  res.json(updatedUser);
});

module.exports = usersRouter;