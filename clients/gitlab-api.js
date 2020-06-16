import fetch from 'node-fetch'

import {
  GITLAB_API_HOST, GITLAB_API_TOKEN
} from '../config'

const gitlabApi = (path, opts = {}) => {
  console.log(`${GITLAB_API_HOST}/api/v4${path}`)
  return fetch(`${GITLAB_API_HOST}/api/v4${path}`, {
    ...opts,
    headers: {
      ...opts.headers,
      'Private-Token': GITLAB_API_TOKEN
    }
  })
}

export { gitlabApi }
