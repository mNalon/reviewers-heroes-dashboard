import { createUserRepository } from './user'

const createRepositories = ({ clients }) => ({
  user: createUserRepository({ clients })
})

export { createRepositories }
