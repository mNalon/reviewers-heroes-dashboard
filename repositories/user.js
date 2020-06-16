import { parseUser } from '../parsers/gitlab-api'

const getAllUsersByGroupId = ({ clients }) => (groupId) => (
  clients.gitlabApi(`/groups/${groupId}/members`)
    .then((body) => body.json())
    .then((users) => users.map(parseUser))
)

export const createUserRepository = ({ clients }) => ({
  getAllUsersByGroupId: getAllUsersByGroupId({ clients })
})
