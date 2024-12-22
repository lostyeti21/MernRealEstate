const { getDataConnect, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'MERN-ESTATE',
  location: 'australia-southeast1'
};
exports.connectorConfig = connectorConfig;

