import express from 'express'

import { DANGER_LIMIT_ASSIGNEES, GROUP_ID } from '../config'

const router = express.Router()

const errorHandler = (req, res) => (err) =>
  res.render('error', { message: 'Error', error: err })

const totalEstimated = (mrs) => mrs.reduce((total, mr) => (
  mr.timeEstimate ? total + (mr.timeEstimate / 60) : total
), 0)

const sortDecreasingReviewers = (a, b) => b.totalReviews - a.totalReviews

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function getLastNthMonthsWeeks(numberOfMonths = 1) {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Set hours to 0 to avoid discrepancy

  // Go back N months
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - numberOfMonths)
  startDate.setDate(1) // Ensures start from the beginning of the month

  const weeks = []
  const current = new Date(startDate)

  while (current <= now) {
    const weekStart = new Date(current)
    weekStart.setDate(current.getDate() - current.getDay()) // Adjust for the sunday of the week
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // Add 6 days to get on saturday
    weekEnd.setHours(23, 59, 59, 999)

    weeks.push({
      beginAt: weekStart,
      endAt: weekEnd,
      week: `${formatDate(weekStart)} to ${formatDate(weekEnd)}`
    })

    // Go forward one week
    current.setDate(current.getDate() + 7)
  }

  return weeks
}

function getNumberOfNotClosedIssuesByWeek(issues, weeksInterval) {
  return weeksInterval.map((week) => {
    let count = 0

    issues.forEach((issue) => {
      const issueWasCreatedBeforeTheWeekFinishes =
        issue.createdAt && (issue.createdAt <= week.endAt)
      const issueIsNotClosedInTheWeek = !issue.closedAt || issue.closedAt > week.endAt

      if (issueWasCreatedBeforeTheWeekFinishes && issueIsNotClosedInTheWeek) count += 1
    })

    return {
      ...week,
      count
    }
  })
}

function getNumberOfOpenedIssuesByWeek(issues, weeksInterval) {
  return weeksInterval.map((week) => {
    let count = 0

    issues.forEach((issue) => {
      const issueWasCreatedDuringTheWeek =
        issue.createdAt >= week.beginAt && issue.createdAt <= week.endAt

      if (issueWasCreatedDuringTheWeek) count += 1
    })

    return {
      ...week,
      count
    }
  })
}

function getNumberOfClosedIssuesByWeek(issues, weeksInterval) {
  return weeksInterval.map((week) => {
    let count = 0

    issues.forEach((issue) => {
      const issueWasClosedDuringTheWeek =
        issue.closedAt >= week.beginAt && issue.closedAt <= week.endAt

      if (issueWasClosedDuringTheWeek) count += 1
    })

    return {
      ...week,
      count
    }
  })
}

const getProjectNameFromReference = (reference) => reference.split('#')[0]

function summarizeIssues(issues) {
  const projectStats = new Map()
  const labelStats = new Map()

  for (const issue of issues) {
    const issueIsOpened = issue.state === 'opened'

    if (!issueIsOpened) {
      continue
    }

    if (!projectStats.has(issue.projectId)) {
      projectStats.set(issue.projectId, {
        projectId: issue.projectId,
        name: getProjectNameFromReference(issue.projectReference),
        totalIssues: 0
      })
    }
    projectStats.get(issue.projectId).totalIssues += 1

    for (const label of issue.labels) {
      if (!labelStats.has(label)) {
        labelStats.set(label, {
          name: label,
          total: 0
        })
      }
      labelStats.get(label).total += 1
    }
  }

  const totalIssuesByProject = Array.from(projectStats.values())
    .sort((a, b) => b.totalIssues - a.totalIssues)

  return {
    totalIssuesByProject,
    labels: labelStats
  }
}

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

router.get('/reviewers/:groupId', (req, res) => {
  const { groupId } = req.params

  req.repositories.user.getAllUsersByGroupId(groupId)
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

router.get('/issues/:groupId', async (req, res) => {
  const { groupId } = req.params

  const { labels: labelsQueryParam = '' } = req.query

  const labels = labelsQueryParam.split(',')

  const weeksInterval = getLastNthMonthsWeeks(4)

  req.repositories.issue.getIssuesByGroupIdAndLabels(groupId, labels).then((issues) => {
    const issuesCountByWeek = {
      notClosedIssuesByWeek: getNumberOfNotClosedIssuesByWeek(issues, weeksInterval),
      openedIssuesByWeek: getNumberOfOpenedIssuesByWeek(issues, weeksInterval),
      closedIssuesByWeek: getNumberOfClosedIssuesByWeek(issues, weeksInterval)
    }

    const issuesSummary = summarizeIssues(issues)

    res.render('issues-board', { issuesCountByWeek, labels: labelsQueryParam, issuesSummary })
  }).catch((err) => {
    res.status(500)
    res.json(err)
  })
})

export { router }
