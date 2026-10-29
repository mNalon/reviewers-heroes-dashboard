import express from 'express'

import { DANGER_LIMIT_ASSIGNEES, GROUP_ID } from '../config'

const router = express.Router()

const errorHandler = (req, res) => (err) =>
  res.render('error', { message: 'Error', error: err })

const totalEstimated = (mrs) => mrs.reduce((total, mr) => (
  mr.timeEstimate ? total + (mr.timeEstimate / 60) : total
), 0)

const sortDecreasingReviewers = (a, b) => b.totalReviews - a.totalReviews

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const pad = (value) => String(value).padStart(2, '0')

const formatDate = (date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
const formatShortDate = (date) => `${pad(date.getDate())} ${MONTHS_PT[date.getMonth()]}`

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
      week: `${formatDate(weekStart)} – ${formatDate(weekEnd)}`,
      shortLabel: formatShortDate(weekStart)
    })

    // Go forward one week
    current.setDate(current.getDate() + 7)
  }

  return weeks
}

const getProjectNameFromReference = (reference) => reference.split('#')[0]
const getProjectIssuesUrl = (webUrl) => (webUrl ? webUrl.replace(/\/-\/issues\/\d+.*$/, '/-/issues') : null)

const summarizeIssueForBoard = (issue) => ({
  id: issue.id,
  title: issue.title,
  state: issue.state,
  labels: issue.labels,
  webUrl: issue.webUrl,
  projectName: getProjectNameFromReference(issue.projectReference),
  author: issue.author ? (issue.author.name || issue.author.userName) : null,
  assignees: (issue.assignees || []).map((user) => user.name || user.userName),
  createdAt: issue.createdAt,
  closedAt: issue.closedAt
})

const DAY_IN_MS = 24 * 60 * 60 * 1000
const OLD_ISSUE_DAYS = 120
const STALE_ISSUE_DAYS = 60

const daysBetween = (from, to) => Math.max(0, Math.floor((to - from) / DAY_IN_MS))

function getIssuesAging(issues, now = new Date()) {
  const points = issues
    .filter((issue) => issue.state === 'opened' && issue.createdAt)
    .map((issue) => {
      const ageDays = daysBetween(issue.createdAt, now)
      const inactiveDays = daysBetween(issue.updatedAt || issue.createdAt, now)

      return {
        ...summarizeIssueForBoard(issue),
        ageDays,
        inactiveDays,
        isStale: ageDays >= OLD_ISSUE_DAYS && inactiveDays >= STALE_ISSUE_DAYS
      }
    })

  const inactiveCount = points.filter((point) => point.inactiveDays >= STALE_ISSUE_DAYS).length

  return {
    totalBacklog: points.length,
    inactiveCount,
    inactivePercent: points.length ? Math.round((inactiveCount / points.length) * 100) : 0,
    staleCount: points.filter((point) => point.isStale).length,
    oldDays: OLD_ISSUE_DAYS,
    staleDays: STALE_ISSUE_DAYS,
    points
  }
}

function getNumberOfNotClosedIssuesByWeek(issues, weeksInterval) {
  return weeksInterval.map((week) => {
    const matchingIssues = issues.filter((issue) => {
      const issueWasCreatedBeforeTheWeekFinishes =
        issue.createdAt && (issue.createdAt <= week.endAt)
      const issueIsNotClosedInTheWeek = !issue.closedAt || issue.closedAt > week.endAt

      return issueWasCreatedBeforeTheWeekFinishes && issueIsNotClosedInTheWeek
    })

    return {
      ...week,
      count: matchingIssues.length,
      issues: matchingIssues.map(summarizeIssueForBoard)
    }
  })
}

function getNumberOfOpenedIssuesByWeek(issues, weeksInterval) {
  return weeksInterval.map((week) => {
    const matchingIssues = issues.filter((issue) => (
      issue.createdAt >= week.beginAt && issue.createdAt <= week.endAt
    ))

    return {
      ...week,
      count: matchingIssues.length,
      issues: matchingIssues.map(summarizeIssueForBoard)
    }
  })
}

function getNumberOfClosedIssuesByWeek(issues, weeksInterval) {
  return weeksInterval.map((week) => {
    const matchingIssues = issues.filter((issue) => (
      issue.closedAt >= week.beginAt && issue.closedAt <= week.endAt
    ))

    return {
      ...week,
      count: matchingIssues.length,
      issues: matchingIssues.map(summarizeIssueForBoard)
    }
  })
}

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
        totalIssues: 0,
        issuesUrl: getProjectIssuesUrl(issue.webUrl)
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

const getUsersByGroupId = (req, groupId) => {
  const { getAllUsersByGroupId, getOnlyDirectMemberUsersByGroupId } = req.repositories.user

  return req.query.onlyDirectMembers === 'true'
    ? getOnlyDirectMemberUsersByGroupId(groupId)
    : getAllUsersByGroupId(groupId)
}

/* GET home page. */
router.get('/', (req, res) => {
  getUsersByGroupId(req, GROUP_ID)
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

  getUsersByGroupId(req, groupId)
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

  const { labels: labelsQueryParam = '', since: sinceQueryParam = '' } = req.query

  const labels = labelsQueryParam.split(',')

  const weeksInterval = getLastNthMonthsWeeks(4)

  const since = sinceQueryParam ? new Date(`${sinceQueryParam}T00:00:00`) : null
  const sinceIsValid = since instanceof Date && !Number.isNaN(since.getTime())

  req.repositories.issue.getIssuesByGroupIdAndLabels(groupId, labels).then((issues) => {
    const issuesCountByWeek = {
      notClosedIssuesByWeek: getNumberOfNotClosedIssuesByWeek(issues, weeksInterval),
      openedIssuesByWeek: getNumberOfOpenedIssuesByWeek(issues, weeksInterval),
      closedIssuesByWeek: getNumberOfClosedIssuesByWeek(issues, weeksInterval)
    }

    const issuesSummary = summarizeIssues(issues)

    const sinceLastCheck = sinceIsValid ? {
      date: sinceQueryParam,
      issues: issues
        .filter((issue) => (
          (issue.createdAt && issue.createdAt >= since)
          || (issue.closedAt && issue.closedAt >= since)
        ))
        .map(summarizeIssueForBoard)
        .sort((a, b) => {
          const aDate = a.closedAt && a.closedAt >= since ? a.closedAt : a.createdAt
          const bDate = b.closedAt && b.closedAt >= since ? b.closedAt : b.createdAt
          return bDate - aDate
        })
    } : null

    res.render('issues-board', {
      issuesCountByWeek,
      labels: labelsQueryParam,
      issuesSummary,
      sinceLastCheck,
      agingStats: getIssuesAging(issues)
    })
  }).catch((err) => {
    res.status(500)
    res.json(err)
  })
})

export { router }
