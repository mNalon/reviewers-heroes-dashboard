import { createUserRepository } from './user'
import { createMRRepository } from './merge-request'
import { createIssueRepository } from './issue'

const createRepositories = ({ clients }) => ({
  user: createUserRepository({ clients }),
  mergeRequest: createMRRepository({ clients }),
  issue: createIssueRepository({ clients })
})

export { createRepositories }
