import path from 'path'

import createError from 'http-errors'
import express from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'

import { router as indexRouter } from './routes/index'
import { createClients } from './clients'
import { createRepositories } from './repositories'

const clients = createClients()
const repositories = createRepositories({ clients })

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

// injecting repositories
app.use((req, res, next) => {
  req.repositories = repositories
  next()
})

app.use('/', indexRouter)

app.use('/healthcheck', (req, res) => {
  res.send('OK')
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

export { app }
