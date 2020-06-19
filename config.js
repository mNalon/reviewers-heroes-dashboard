const {
  GITLAB_API_HOST,
  GITLAB_API_TOKEN,
  GROUP_ID,
  GROUP_MEMBERS_TOTAL_LIMIT = 100,
  DANGER_LIMIT_ASSIGNEES = 4
} = process.env

export {
  GITLAB_API_HOST,
  GITLAB_API_TOKEN,
  GROUP_ID,
  GROUP_MEMBERS_TOTAL_LIMIT,
  DANGER_LIMIT_ASSIGNEES
}