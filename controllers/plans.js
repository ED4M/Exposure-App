const plansRouter = require('express').Router();
const Plan = require('../models/plan.js');
const User = require('../models/user.js');
const role = require('../utils/role.js');
const mongoose = require('mongoose');

const permissionError = {
  error: 'you do not have permission to perform this request'
};

plansRouter.get('/', async (req, res) => {
  const { user } = req;
  const page = +req.query.page;
  const limit = +req.query.limit;
  const search = new RegExp(req.query.search)
  let filter = {};

  if (user.role === role.employee || user.role === role.supervisor) {
    const field = `${user.role}.id`;
    filter = {
      [field]: mongoose.Types.ObjectId(user.id)
    };
  };

  const startIndex = (page - 1) * limit;

  const results = {};

  results.plans = await Plan.aggregate([
    { $lookup:
      {
        from: "users",
        localField: "employee",
        foreignField: "_id",
        as: "employee"
      }
    },
    { $lookup:
      {
        from: "users",
        localField: "supervisor",
        foreignField: "_id",
        as: "supervisor"
      }
    },
    { $lookup:
      {
        from: "positions",
        localField: "employeePosition",
        foreignField: "_id",
        as: "employeePosition"
      }
    },
    {"$unwind": {path: "$employeePosition"}},
    {"$unwind": {path: "$employee"}},
    {"$unwind": {path: "$supervisor"}},
    { 
      $addFields: { 
        id: "$_id", 
        "employee.id": "$employee._id",
        "supervisor.id": "$supervisor._id",
        "employeePosition.id": "$employeePosition._id"
      }
    },
    { 
      $project: { 
        "employee": {
          "_id": 0, 
          "role": 0,
          "username": 0,
          "email": 0,
          "passwordHash": 0,
          "__v": 0,
        },
        "supervisor": {
          "_id": 0, 
          "role": 0,
          "username": 0,
          "email": 0,
          "passwordHash": 0,
          "__v": 0,
        },
        "employeePosition": {
          "_id": 0, 
          "description": 0,
          "__v": 0
        },  
        _id: 0,
        __v: 0 
      }
    },
    { 
      $match: filter 
    },
    { $match: { 
      $or: [
      {'employee.name': {$regex: search, $options : 'i'}}, 
      {'supervisor.name': {$regex: search, $options : 'i'}}, 
      {'employeePosition.name': {$regex: search, $options : 'i'}}
    ]},
    },
 ])

  const pageCount = results.plans.length/limit;
  if (pageCount)
    results.pageCount = Math.ceil(pageCount)
  else results.pageCount = 1;
  
  if (page && limit)
    results.plans = results.plans.slice(startIndex, startIndex + limit);
  res.json(results);
});

plansRouter.get('/:id', async (req, res, next) => {
  const plan = await Plan
    .findById(req.params.id)
    .populate({
      path: 'employee',
      select: '-email -username -role'
    })
    .populate({
      path: 'supervisor',
      select: '-email -username -role'
    })
    .populate({
      path: 'hr',
      select: '-email -username -role'
    })
    .populate({
      path: 'employeePosition',
      select: '-description'
    })
    .exec();

  if (plan) {
    res.json(plan);
  } else {
    res.status(404).end();
  }
});

plansRouter.get('/:id/tasks', async (req, res) => {
  const plan = await Plan
    .findById(req.params.id)
    .populate('tasks');

  const tasks = plan.tasks;

  if (tasks) {
    res.json(tasks);
  } else {
    res.status(404).end();
  }
});

plansRouter.get('/:id/comments', async (req, res) => {
  const plan = await Plan
    .findById(req.params.id)
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
        select: '-email -username'
    }});

  const comments = plan.comments;

  if (comments) {
    res.json(comments);
  } else {
    res.status(404).end();
  }
});

plansRouter.post('/', async (req, res) => {
  const { body, user } = req;

  if (user.role !== role.hr) {
    return res.status(401).json(permissionError);
  }

  const plan = new Plan({
    employeePosition: body.employeePosition,
    employee: body.employee,
    supervisor: body.supervisor,
    hr: user.id,
    stage: body.stage || 0,
    adaptationStart: new Date(body.adaptationStart),
    adaptationEnd: new Date(body.adaptationEnd),
    completed: body.completed || false,
    rate: body.rate || 'отсутствует',
    tasks: body.tasks,
    date: new Date(),
  });

  const savedPlan = await plan.save();

  await User
    .findByIdAndUpdate(body.employee, { attachedToPlan: true });
  
  const newPlan = await Plan
    .find(savedPlan)
    .populate('employeePosition')
    .populate('employee')
    .populate('supervisor')
    .populate('hr'); 

  res.json(newPlan);
});

plansRouter.delete('/:id', async (req, res) => {
  const { user } = req;
  if (user.role === role.employee) {
    return res.status(401).json(permissionError);
  }
  const plan = await Plan.findById(req.params.id);
  await User.findByIdAndUpdate(plan.employee, { attachedToPlan: false });
  await Plan.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

plansRouter.put('/:id', async (req, res) => {
  const { body, user } = req;

  // if (user.role === role.employee) {
  //   return res.status(401).json(permissionError);
  // }

  const oldPlan = await Plan.findById(req.params.id);

  const plan = {
    employeePosition: body.employeePosition,
    employee: body.employee,
    supervisor: body.supervisor,
    hr: body.hr,
    stage: body.stage,
    adaptationStart: new Date(body.adaptationStart),
    adaptationEnd: new Date(body.adaptationEnd),
    completed: body.completed,
    rate: body.rate,
  };

  const updatedPlan = await Plan.findByIdAndUpdate(req.params.id, plan, { new: true });

  if (oldPlan.employee !== updatedPlan.employee) {
    await User
    .findByIdAndUpdate(oldPlan.employee, { attachedToPlan: false });

    await User
    .findByIdAndUpdate(body.employee, { attachedToPlan: true });
  }

  const newPlan = await Plan
    .findById(updatedPlan.id)
    .populate('employeePosition')
    .populate('employee')
    .populate('supervisor')
    .populate('hr');
 
  res.json(newPlan);
});

module.exports = plansRouter;