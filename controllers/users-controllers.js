const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../models/httperror')
const User = require('../models/user')

const getUsers = async (req, res, next) => {
  let users

  try {
    users = await User.find({}, '-password')
  } catch (error) {
    return next(new HttpError('Could not find users, please try again later'))
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) })
}

const signup = async (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    console.log(errors)
    const error = new HttpError(
      'Invalid inputs passed, please check your data.',
      422,
    )
    return next(error)
  }
  const { name, email, password } = req.body

  let existingUser

  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later')
    return next(error)
  }

  if (existingUser) {
    const error = new HttpError('User already exists, please login instead')
    return next(error)
  }

  let hashedPassword
  try {
    hashedPassword = await bcrypt.hash(password, 12)
  } catch (err) {
    const error = new HttpError('Could not create user, please try again.', 500)
    return next(error)
  }

  const createdUser = new User({
    name, //name: name
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  })

  try {
    await createdUser.save()
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later',
      500,
    )
    return next(error)
  }

  let token

  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1hr' },
    )
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later',
      500,
    )
    return next(error)
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token })
}

const login = async (req, res, next) => {
  const { email, password } = req.body

  let existingUser
  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    const error = new HttpError(
      'logging in failed, please try again later',
      500,
    )
    return next(error)
  }

  if (!existingUser) {
    return next(
      new HttpError(
        'Could not identifiy user, credentials seem to be wrong.',
        403,
      ),
    )
  }

  let isValidPassword = false

  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password)
  } catch (err) {
    const error = new HttpError(
      'Could not log you in, please check your credentials and try agian.',
      500,
    )
    return next(error)
  }

  if (!isValidPassword) {
    return next(
      new HttpError(
        'Could not identifiy user, credentials seem to be wrong.',
        403,
      ),
    )
  }

  let token

  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1hr' },
    )
  } catch (err) {
    const error = new HttpError(
      'logging in failed, please try again later',
      500,
    )
    return next(error)
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  })
}

module.exports = {
  getUsers,
  signup,
  login,
}
