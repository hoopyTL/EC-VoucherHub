import app from './app'

const PORT = 4000

// Set up Port + start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`)
})

process.on('SIGINT', () => {
  server.close(() => {
    console.log(`\nExit server Express`)
  })
})
