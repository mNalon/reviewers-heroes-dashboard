import { parser as parseUser } from './user'

const parser = ({
  id,
  title,
  created_at: createdAt,
  updated_at: updatedAt,
  author,
  assignee,
  work_in_progress: workInProgress,
  web_url: webUrl,
  time_stats: {
    time_estimate: timeEstimate
  },
  merged_at: mergedAt
}) => ({
  id,
  title,
  createdAt,
  updatedAt,
  author: parseUser(author),
  assignee: parseUser(assignee),
  workInProgress,
  webUrl,
  timeEstimate,
  mergedAt
})

export { parser }
