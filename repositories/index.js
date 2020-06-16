import { createUserRepository } from './user'
import { createMRRepository } from './merge-request'

const createRepositories = ({ clients }) => ({
  user: createUserRepository({ clients }),
  mergeRequest: createMRRepository({ clients })
})

export { createRepositories }
