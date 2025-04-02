import { parseIssue } from '../parsers/gitlab-api'

const getIssuesByGroupIdAndLabels = ({ clients }) => async (groupId, labels = []) => {
  let issues = []
  let page = 1
  const perPage = 100
  const labelsParam = labels.length ? `labels=${labels.join(',')}` : ''

  while (true) {
    const response =
      // eslint-disable-next-line no-await-in-loop
      await clients.gitlabApi(`/groups/${groupId}/issues?scope=all&page=${page}&per_page=${perPage}&${labelsParam}`)
        .then((body) => body.json())
        .then((issues) => issues.map(parseIssue))

    issues = issues.concat(response)
    if (response.length < perPage) break
    page += page
  }

  return issues
}

export const createIssueRepository = ({ clients }) => ({
  getIssuesByGroupIdAndLabels: getIssuesByGroupIdAndLabels({ clients })
})
