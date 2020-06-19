import express from 'express'

import { DANGER_LIMIT_ASSIGNEES } from '../config'

const router = express.Router()

const errorHandler = (req, res) => (err) =>
  res.render('error', { message: 'Error', error: err })

/* GET home page. */
router.get('/', (req, res) => {
  req.repositories.user.getAllUsersByGroupId(919)
    .then((users) => (
      Promise.all(users.map(async (user) => {
        const { getTotalOpenedAssigneesByUserId } = req.repositories.mergeRequest
        const totalAssignees = await getTotalOpenedAssigneesByUserId(user.id)
        return {
          ...user,
          totalAssignees
        }
      }))
    ))
    .then((users) => res.render('index', {
      users, dangerLimitAssignees: DANGER_LIMIT_ASSIGNEES
    }))
    .catch(errorHandler(req, res))
})

router.get('/details/:id', (req, res) => {
  const userId = req.params.id
  req.repositories.mergeRequest.getAllOpennedAssignedMRByUserId(userId)
    .then((mergeRequests) => res.render('details', { mergeRequests }))
    .catch(errorHandler(req, res))
})

export { router }
