import { parseUser } from '../parsers/gitlab-api'
import { GROUP_MEMBERS_TOTAL_LIMIT } from '../config'

const getAllUsersByGroupId = ({ clients }) => (groupId) => (
  clients.gitlabApi(`/groups/${groupId}/members/all?per_page=${GROUP_MEMBERS_TOTAL_LIMIT}`)
    .then((body) => body.json())
    .then((users) => users.map(parseUser))
)

export const createUserRepository = ({ clients }) => ({
  getAllUsersByGroupId: getAllUsersByGroupId({ clients })
})
