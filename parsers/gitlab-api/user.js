const parser = ({
  id,
  name,
  username: userName,
  avatar_url: avatarUrl
}) => ({
  id,
  name,
  userName,
  avatarUrl
})

export { parser }
