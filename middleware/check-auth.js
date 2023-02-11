const HttpError = require('../models/http-error')
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next()
  }
  try {
    const token = req.headers.authorization.split(' ')[1] // Bearer + token
    if (!token) {
      throw new Error('Authentication failed!', 403)
    }
    const decodedToken = jwt.verify(token, process.env.JWT_KEY)
    next()
    req.userData = { userId: decodedToken.userId }
  } catch (err) {
    const error = new HttpError('Authentication Failed!', 403)
    return next(error)
  }
}
