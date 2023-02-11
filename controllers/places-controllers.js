const { validationResult } = require('express-validator')
const mongoose = require('mongoose')
const fs = require('fs')

const HttpError = require('../models/httperror')
const getCoordsForAddress = require('../utils/location')
const Place = require('../models/place')
const User = require('../models/user')

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid

  let place

  try {
    place = await Place.findById(placeId)
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, Could not find a place. ',
      500,
    )
    return next(error)
  }

  if (!place) {
    const error = new HttpError('Could not find a place for the provided id.')
    return next(error)
  }

  res.json({ place: place.toObject({ getters: true }) })
}

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid

  // let places
  let userWithPlaces

  try {
    userWithPlaces = await User.findById(userId).populate('places')
  } catch (err) {
    const error = new HttpError(
      'Fetching places failed, please try again later',
      500,
    )
    return next(error)
  }

  if (!userWithPlaces || userWithPlaces.length === 0) {
    const error = new Error('Could not find places for the provided user id.')
    return next(error)
  }

  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true }),
    ),
  })
}

const createPlace = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.log(errors)
    const error = new HttpError(
      'Invalid inputs passed, please check your data.',
      422,
    )
    return next(error)
  }

  const { title, description, address } = req.body

  const coordinates = getCoordsForAddress(address)
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  })

  let user
  try {
    user = await User.findById(req.userData.userId)

    if (!user) {
      const error = new HttpError('Could not find user for provided id', 404)
      return next(error)
    }
  } catch (err) {
    return next(new HttpError('Creating place failed, please try again', 500))
  }

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await createdPlace.save({ session: sess })
    user.places.push(createdPlace)
    await user.save({ session: sess })
    await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError('Creating place failed, please try again', 500)
    return next(error)
  }
  res.status(201).json({ place: createdPlace })
}

const updatePlaceById = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.log(errors)
    const error = new HttpError(
      'Invalid inputs passed, please check your data.',
      422,
    )
    return next(error)
  }
  const { title, description } = req.body
  const placeId = req.params.pid

  let place
  try {
    place = await Place.findById(placeId)
  } catch (err) {
    const error = new HttpError(
      'Something went wrong!, could not update place.',
      500,
    )
    return next(error)
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this place!!', 401)
    return next(error)
  }

  place.title = title
  place.description = description

  try {
    await place.save()
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place.',
      500,
    )
    return next(error)
  }

  res.status(200).json({ place: place.toObject({ getters: true }) })
}

const deletePlaceById = async (req, res, next) => {
  const placeId = req.params.pid
  if (!Place.find(placeId)) {
    const error = new HttpError('Could not find a place for that id', 404)
    return next(error)
  }

  let place

  try {
    place = await Place.findById(placeId).populate('creator')
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete the place',
      500,
    )
    return next(error)
  }

  if (!place) {
    return next(new HttpError('Could not find place for this id.', 404))
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this place!!',
      401,
    )
    return next(error)
  }

  const imagePath = place.image

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await place.remove({ session: sess })
    place.creator.places.pull(place)
    await place.creator.save({ session: sess })
    await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete the place',
      500,
    )
    return next(error)
  }

  fs.unlink(imagePath, (err) => {
    console.log(err)
  })
  res.status(200).json({ message: 'Place Deleted.' })
}

module.exports = {
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlaceById,
  deletePlaceById,
}
