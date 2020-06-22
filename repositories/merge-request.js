import moment from 'moment'

import { parser as parseMR } from '../parsers/gitlab-api/merge-request'

const getTotalOpennedAssigneesByUserId = ({ clients }) => (userId) => (
  clients.gitlabApi(`/merge_requests?scope=all&state=opened&assignee_id=${userId}`)
    .then((body) => body.json())
    .then((mrs) => mrs.length)
)

const getAllOpennedAssignedMRByUserId = ({ clients }) => (userId) => (
  clients.gitlabApi(`/merge_requests?scope=all&state=opened&assignee_id=${userId}`)
    .then((body) => body.json())
    .then((mrs) => mrs.map(parseMR))
)

const getMergedAssignedMRsOnTheLastWeekByUserId = ({ clients }) => (userId) => (
  clients.gitlabApi(`/merge_requests?scope=all&state=opened&assignee_id=${userId}`)
    .then((body) => body.json())
    .then((mrs) => mrs.map(parseMR))
    .then((mrs) => {
      const oneWeekAgo = moment().subtract(7, 'd')
      return mrs.filter((mr) => (
        mr.mergedAt ? moment(mr.mergedAt).isAfter(oneWeekAgo) : false
      ))
    })
)

export const createMRRepository = ({ clients }) => ({
  getAllOpennedAssignedMRByUserId: getAllOpennedAssignedMRByUserId({ clients }),
  getTotalOpenedAssigneesByUserId: getTotalOpennedAssigneesByUserId({ clients }),
  getMergedAssignedMRsOnTheLastWeekByUserId: getMergedAssignedMRsOnTheLastWeekByUserId({ clients })
})
