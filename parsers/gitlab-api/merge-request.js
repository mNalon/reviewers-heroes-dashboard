import { parser as parseUser } from './user'

const parser = ({
  id,
  title,
  created_at: createdAt,
  updated_at: updatedAt,
  author,
  assignee,
  reviewer,
  merged_by: mergedBy,
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
  author: assignee && parseUser(author),
  assignee: assignee && parseUser(assignee),
  reviewer: reviewer && parseUser(reviewer),
  workInProgress,
  webUrl,
  timeEstimate,
  mergedAt,
  mergedBy: mergedBy && parseUser(mergedBy)
})

export { parser }
