import express from 'express'

const router = express.Router()

/* GET home page. */
router.get('/', (req, res) => {
  req.repositories.user.getAllUsersByGroupId(919)
    .then((users) => res.render('index', { users }))
})

export { router }
