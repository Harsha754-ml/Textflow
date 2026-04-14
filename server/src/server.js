const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`SMS Dashboard server listening on port ${config.port}`);
});
