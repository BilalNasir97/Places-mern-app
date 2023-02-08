const express = require('express')
const { check } = require('express-validator')
const fileUpload = require('../middleware/file-upload')
const checkAuth = require('../middleware/check-auth')

const router = express.Router()

const {
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlaceById,
  deletePlaceById,
} = require('../controllers/places-controllers')

router.get('/:pid', getPlaceById)

router.get('/user/:uid', getPlacesByUserId)

router.use(checkAuth)

router.post(
  '/',
  fileUpload.single('image'),
  [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 5 }),
    check('address').not().isEmpty(),
  ],
  createPlace,
)

router.patch(
  '/:pid',
  [check('title').not().isEmpty(), check('description').isLength({ min: 5 })],
  updatePlaceById,
)

router.delete('/:pid', deletePlaceById)

module.exports = router
