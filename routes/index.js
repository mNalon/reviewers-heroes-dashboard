import express from 'express'

import { DANGER_LIMIT_ASSIGNEES, GROUP_ID } from '../config'

const router = express.Router()

const errorHandler = (req, res) => (err) =>
  res.render('error', { message: 'Error', error: err })

const totalEstimated = (mrs) => mrs.reduce((total, mr) => (
  mr.timeEstimate ? total + (mr.timeEstimate / 60) : total
), 0)

const sortDecreasingReviewers = (a, b) => b.totalReviews - a.totalReviews

/* GET home page. */
router.get('/', (req, res) => {
  req.repositories.user.getAllUsersByGroupId(GROUP_ID)
    .then((users) => (
      Promise.all(users.map(async (user) => {
        const {
          getTotalOpenedAssigneesByUserId,
          getTotalOpennedReviewMRByUserId
        } = req.repositories.mergeRequest

        const [totalAssignees, totalReviews] = await Promise.all([
          getTotalOpenedAssigneesByUserId(user.id),
          getTotalOpennedReviewMRByUserId(user.id)
        ])

        return {
          ...user,
          totalAssignees,
          totalReviews
        }
      }))
    ))
    .then((user) => user.sort(sortDecreasingReviewers))
    .then((users) => res.render('index', {
      users, dangerLimitReviews: DANGER_LIMIT_ASSIGNEES
    }))
    .catch(errorHandler(req, res))
})

router.get('/details/:id', (req, res) => {
  const userId = req.params.id

  const mergeRequestsInfo = [
    req.repositories.mergeRequest.getAllOpennedReviewMRByUserId(userId),
    req.repositories.mergeRequest.getAllOpennedAssignedMRByUserId(userId),
    req.repositories.mergeRequest.getMergedReviewMRsOnTheLastWeekByUserId(userId)
  ]

  Promise.all(mergeRequestsInfo)
    .then(
      ([
        openedReviewMRs,
        openedMRs,
        mergedMRs
      ]) =>
        res.render('details', {
          openedReviewMRs,
          openedMRs,
          totalOpenedReviewEstimatedTime: totalEstimated(openedReviewMRs),
          totalOpenedEstimatedTime: totalEstimated(openedMRs),
          totalMergedEstimatedTime: totalEstimated(mergedMRs),
          mergedMRs
        })
    ).catch(errorHandler(req, res))
})

export { router }
