import { parseISO, isValid } from 'date-fns'

import { parser as parseUser } from './user'

const parseISODate = (dateStr) => {
  const parsedDate = dateStr && parseISO(dateStr)

  return isValid(parsedDate) ? parsedDate : null
}

const parser = ({
  id,
  project_id: projectId,
  title,
  description,
  state, // Ex: "opened", "closed"
  created_at: createdAt, // Ex: "2025-03-31T16:37:31.932-03:00"
  updated_at: updatedAt, // Ex: "2025-03-31T16:37:31.932-03:00", null
  closed_at: closedAt, // Ex: "2025-03-31T16:37:31.932-03:00", null
  closed_by: closedBy, // Ex: "Ayrton Vargas Witcel Fidelis", null
  labels, // Ex: ["Technical Debt"]
  references: { relative } // Ex: namespace/project-name#1
}) => ({
  id,
  projectId,
  title,
  description,
  state,
  createdAt: parseISODate(createdAt),
  updatedAt: parseISODate(updatedAt),
  closedAt: parseISODate(closedAt),
  closedBy: closedBy ? parseUser(closedBy) : null,
  labels,
  projectReference: relative
})

export { parser }
