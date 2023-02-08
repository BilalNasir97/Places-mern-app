const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const placesRoutes = require('./routes/places-routes')
const usersRoutes = require('./routes/users-routes')
const HttpError = require('../server/models/http-error')

const app = express()

app.use(bodyParser.json())

app.use('/uploads/images', express.static(path.join('uploads', 'images')))

// app.use(cors())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  )
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  next()
})

app.use('/api/places', placesRoutes)
app.use('/api/users', usersRoutes)

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404)
  throw error
})

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err)
    })
  }

  if (req.headerSent) {
    return next(error)
  }
  res.status(error.code || 500)
  res.json({ message: error.message || 'An unknown error occurred!!' })
})
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.o235awg.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
  )
  .then(() => {
    app.listen(5000, () => {
      console.log('Connected to DB & Server running at port 5000')
    })
  })
  .catch((err) => {
    console.log(err)
  })